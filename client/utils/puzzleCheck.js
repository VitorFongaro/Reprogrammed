// Conferência de um puzzle de CONDICIONAL antes de ele chegar ao jogador.
//
// Existe por causa da IA: o servidor pede o puzzle ao Gemini e só repassa o que
// passar daqui. Um modelo de linguagem escreve um JSON bonito com a mesma
// facilidade com que escreve um puzzle impossível, então nada do que ele manda
// é aceito por parecer certo — o puzzle é EXECUTADO no mesmo interpretador do
// jogo (utils/condicional.js), com todas as montagens possíveis das peças:
//
//   - pelo menos uma montagem tem de passar em todos os casos (tem solução);
//   - nem todas podem passar (senão não há o que pensar);
//   - nenhuma solução pode continuar passando com `>` no lugar de `>=` (ou `<`
//     no lugar de `<=`): se passa, o LIMITE não está em nenhum caso de teste e o
//     jogador acerta sem entender a borda.
//
// Também confere a FORMA contra a ficha da sala (`spec`): só as variáveis que a
// sala sabe mostrar, valores dentro da faixa, o conceito pedido presente e o
// tamanho que cabe no console. Sem Phaser: roda no Node (servidor) e no
// navegador. Devolve a lista de problemas; vazia = aprovado.

import { parseTemplateLine, run, runTests } from "./condicional.js";

export const LIMITS = {
    maxLines: 6,
    maxSlotsPerLine: 4,
    maxPieces: 14,          // a prateleira tem 2 fileiras de 8
    maxBriefingLines: 4,
    maxFillings: 200000,
    // Largura da área de código do ConditionalConsole (do número da linha até a
    // coluna dos casos): 122 px por encaixe, 10 px entre peças, 44 px por nível
    // de recuo e 13 px por caractere de texto fixo. O console mede o texto de
    // verdade, mas aqui (Node, sem Phaser) os 13 px são um TETO: ficam acima da
    // letra mais larga da fonte do jogo (m6x11plus, proporcional: 11 px), então
    // uma linha aprovada aqui sempre cabe lá.
    maxLineWidth: 720
};

const lineWidth = (line) => line.indent * 44 + line.tokens.reduce(
    (w, t) => w + (typeof t === "string" ? t.length * 13 : 122) + 10, 0);

const COMPARISONS = ["==", "!=", ">", "<", ">=", "<="];
const CONNECTIVES = ["e", "ou", "não"];
// `repita`/`vezes`/`enquanto` e a aritmética do corpo (placas = placas + 1) são do cap. 3.
const FIXED_WORDS = ["se", "senão", ":", "=", "repita", "vezes", "enquanto", "para", "cada", "em", "+", "-", "*", "/", ...CONNECTIVES];
const LITERAL_RE = /^(-?\d+(\.\d+)?|"[^"]*"|true|false)$/;
const NAME_RE = /^[a-z_][a-z0-9_]*$/;
const BOUNDARY_PAIRS = { ">": ">=", ">=": ">", "<": "<=", "<=": "<" };

const usesWord = (text, word) => new RegExp(`(^|\\s)${word}(\\s|$)`, "m").test(text);

const literalOf = (value) => (typeof value === "string" ? `"${value}"` : Array.isArray(value) ? `[${value.join(", ")}]` : String(value));

// Nomes que o programa declara como item de um "para cada <nome> em ..." (a
// variável que recebe cada item): valem como palavra conhecida no molde.
const loopItems = (lines) => lines
    .map((l) => String(l).trim().split(/\s+/))
    .filter((t) => t[0] === "para" && t[1] === "cada" && t[2])
    .map((t) => t[2]);

// Saída da ficha: lista de valores ("rampa": ["carga", ...]) ou faixa numérica
// ({ type: "int", min, max }, como as placas da linha de montagem).
const fitsOutput = (value, def) => (Array.isArray(def) ? def.includes(value) : Boolean(def) && fitsInput(value, def));

// Valor de um `given`/`expect` cabe no tipo declarado pela ficha?
function fitsInput(value, def) {
    if (def.type === "int") return Number.isInteger(value) && value >= def.min && value <= def.max;
    if (def.type === "float") return typeof value === "number" && value >= def.min && value <= def.max;
    if (def.type === "bool") return typeof value === "boolean";
    if (def.type === "text") return def.values.includes(value);
    // lista de inteiros (cap. 3, para cada): tamanho e cada item dentro da faixa
    if (def.type === "list") {
        return Array.isArray(value) && value.length >= def.minLen && value.length <= def.maxLen
            && value.every((v) => Number.isInteger(v) && v >= def.min && v <= def.max);
    }
    return false;
}

// Todas as formas de encher os encaixes com as peças, sem usar a mesma peça duas vezes.
function* fillings(slots, pools, used = new Set(), i = 0, acc = []) {
    if (i === slots.length) {
        yield acc;
        return;
    }
    const pool = pools[slots[i]] ?? [];
    for (let k = 0; k < pool.length; k += 1) {
        const key = `${slots[i]}:${k}`;
        if (used.has(key)) continue;
        used.add(key);
        yield* fillings(slots, pools, used, i + 1, [...acc, pool[k]]);
        used.delete(key);
    }
}

function countFillings(slots, pools) {
    const left = Object.fromEntries(Object.entries(pools).map(([c, list]) => [c, list.length]));
    let total = 1;
    for (const cat of slots) {
        total *= Math.max(left[cat] ?? 0, 0);
        left[cat] = (left[cat] ?? 0) - 1;
    }
    return total;
}

function fill(parsed, values) {
    let n = 0;
    return parsed.map((line) => ({
        indent: line.indent,
        tokens: line.tokens.map((t) => (typeof t === "string" ? t : values[n++]))
    }));
}

// Programa que nem estrutura direito (ex.: `senão` solto) também é "não passa".
function passesAll(lines, puzzle) {
    try {
        return runTests(lines, puzzle.tests, puzzle.defaults ?? {}).every((r) => r.pass);
    } catch {
        return false;
    }
}

// Forma do objeto, contra a ficha da sala.
export function checkShape(puzzle, spec) {
    const problems = [];
    const need = (ok, msg) => { if (!ok) problems.push(msg); };

    need(typeof puzzle?.title === "string" && puzzle.title.length <= 40, "title ausente ou com mais de 40 caracteres");
    need(Array.isArray(puzzle?.briefing) && puzzle.briefing.length >= 1 && puzzle.briefing.length <= LIMITS.maxBriefingLines
        && puzzle.briefing.every((l) => typeof l === "string" && l.length <= 64),
        `briefing longo demais: no máximo ${LIMITS.maxBriefingLines} linhas de 60 caracteres. Corte as palavras que repetem o que o código já mostra`);
    // Ficha que deixa a comparação para o jogador descobrir (`briefingForbids`):
    // o briefing não pode entregá-la. Antes isso só estava nas regras do prompt.
    const briefingText = (puzzle?.briefing ?? []).join(" ").toLowerCase();
    (spec.briefingForbids ?? []).filter((p) => briefingText.includes(p)).forEach((p) => {
        problems.push(`o briefing entrega a comparação ("${p}"): diga só o objetivo, sem dizer qual comparação usar`);
    });
    need(typeof puzzle?.hint === "string" && puzzle.hint.length >= 8 && puzzle.hint.length <= 200,
        "hint ausente ou longo demais: até 200 caracteres, só com a solução em uma linha (sem repetir \"rampa =\" à toa)");
    need(Array.isArray(puzzle?.lines) && puzzle.lines.length >= 2 && puzzle.lines.length <= LIMITS.maxLines,
        `lines deve ter de 2 a ${LIMITS.maxLines} linhas`);
    need(Array.isArray(puzzle?.tests), "tests ausente");
    if (problems.length) return problems;

    const inputs = spec.inputs;
    const outputs = spec.outputs;
    const [minTests, maxTests] = spec.tests;
    need(puzzle.tests.length >= minTests && puzzle.tests.length <= maxTests,
        `tests deve ter de ${minTests} a ${maxTests} casos`);

    // Linhas: só encaixes e palavras conhecidas (nada de literal fixo no texto,
    // senão a resposta vem escrita no programa).
    const known = new Set([...FIXED_WORDS, ...Object.keys(outputs), ...Object.keys(inputs), ...loopItems(puzzle.lines)]);
    const parsed = puzzle.lines.map((line) => (typeof line === "string" ? parseTemplateLine(line) : null));
    need(parsed.every(Boolean), "cada linha deve ser texto");
    if (problems.length) return problems;
    parsed.forEach((line, i) => {
        const slots = line.tokens.filter((t) => typeof t !== "string");
        need(slots.length <= LIMITS.maxSlotsPerLine, `linha ${i + 1} com ${slots.length} encaixes (máximo ${LIMITS.maxSlotsPerLine}): escreva os nomes das variáveis direto na linha, como texto fixo, em vez de [nome]`);
        need(slots.length > LIMITS.maxSlotsPerLine || lineWidth(line) <= LIMITS.maxLineWidth,
            `linha ${i + 1} não cabe na tela do console: use no máximo 3 encaixes quando a linha também tiver nomes de variável escritos`);
        slots.forEach((s) => need(["nome", "op", "valor"].includes(s.category), `linha ${i + 1}: encaixe [${s.category}] não existe`));
        line.tokens.filter((t) => typeof t === "string").forEach((t) => {
            need(known.has(t), `linha ${i + 1}: palavra fixa "${t}" não permitida`);
        });
    });
    const text = puzzle.lines.join("\n");
    // Conectivo obrigatório pode vir como PEÇA em vez de texto fixo (é o que o
    // jogador tem de escolher); aí o checkSolvable confere que toda solução o usa.
    const opPieces = puzzle.blocks?.op ?? [];
    (spec.requires ?? []).forEach((word) => {
        need(usesWord(text, word) || (CONNECTIVES.includes(word) && opPieces.includes(word)),
            `o programa precisa usar "${word}"`);
    });
    (spec.forbids ?? []).forEach((word) => {
        need(!usesWord(text, word), `o programa não pode usar "${word}"`);
    });

    // Peças.
    const blocks = puzzle.blocks ?? {};
    const pieces = Object.values(blocks).flat();
    need(Object.keys(blocks).every((c) => ["nome", "op", "valor"].includes(c)), "blocks só aceita nome/op/valor");
    need(pieces.length <= LIMITS.maxPieces, `no máximo ${LIMITS.maxPieces} peças`);
    (blocks.nome ?? []).forEach((n) => need(typeof n === "string" && NAME_RE.test(n), `nome inválido: ${n}`));
    (blocks.op ?? []).forEach((o) => need([...COMPARISONS, ...CONNECTIVES, "+", "-", "*", "/"].includes(o), `operador inválido: ${o}`));
    (blocks.valor ?? []).forEach((v) => need(typeof v === "string" && LITERAL_RE.test(v), `valor inválido: ${v}`));

    // Casos: só variáveis da ficha, valores dentro da faixa.
    puzzle.tests.forEach((t, i) => {
        const tag = `caso ${i + 1}`;
        need(t && typeof t.given === "object" && typeof t.expect === "object", `${tag} sem given/expect`);
        if (!t?.given || !t?.expect) return;
        Object.entries(t.given).forEach(([k, v]) => {
            need(inputs[k] && fitsInput(v, inputs[k]), `${tag}: entrada ${k} = ${literalOf(v)} fora da ficha`);
        });
        Object.keys(inputs).filter((k) => inputs[k].required).forEach((k) => {
            need(k in t.given, `${tag}: falta a entrada ${k}`);
        });
        Object.entries(t.expect).forEach(([k, v]) => {
            need(fitsOutput(v, outputs[k]), `${tag}: saída ${k} = ${literalOf(v)} fora da ficha`);
        });
        need(Object.keys(t.expect).length >= 1, `${tag} sem saída esperada`);
    });
    if (spec.sanity && !problems.length) {
        const nonsense = spec.sanity(puzzle.tests);
        need(!nonsense, nonsense);
    }
    const outcomes = new Set(puzzle.tests.map((t) => JSON.stringify(t.expect)));
    need(outcomes.size >= 2, "os casos precisam ter resultados diferentes");
    need(spec.defaults !== false || Object.keys(puzzle.defaults ?? {}).length === 0,
        "este puzzle não pode ter defaults: as duas saídas têm de vir do programa");
    Object.entries(puzzle.defaults ?? {}).forEach(([k, v]) => {
        need(fitsOutput(v, outputs[k]), `defaults: ${k} fora da ficha`);
    });
    return problems;
}

// Executa todas as montagens. Devolve { problems, solutions, total }.
// `mustUse`: conectivos que vêm como peça e que toda solução tem de usar.
export function checkSolvable(puzzle, { mustUse = [] } = {}) {
    const parsed = puzzle.lines.map(parseTemplateLine);
    const slots = parsed.flatMap((l) => l.tokens.filter((t) => typeof t !== "string").map((t) => t.category));
    const pools = puzzle.blocks ?? {};
    const total = countFillings(slots, pools);
    if (total === 0) return { problems: ["faltam peças para encher os encaixes"], solutions: 0, total };
    if (total > LIMITS.maxFillings) return { problems: ["combinações demais para conferir"], solutions: 0, total };

    const problems = [];
    let solutions = 0;
    let boundaryLeak = null;
    let firstSolution = null;
    let hintMatches = false;
    let skipped = null;
    const ops = new Set(pools.op ?? []);
    const hintTokens = new Set(String(puzzle.hint ?? "").split(/\s+/));
    for (const values of fillings(slots, pools)) {
        if (!passesAll(fill(parsed, values), puzzle)) continue;
        solutions += 1;
        firstSolution ??= values;
        hintMatches ||= hintShows(values, hintTokens);
        skipped ??= mustUse.find((word) => !values.includes(word)) ?? null;
        if (boundaryLeak) continue;
        // A mesma solução com a comparação "vizinha" também passa? Então o limite
        // não foi testado.
        values.forEach((v, i) => {
            const pair = BOUNDARY_PAIRS[v];
            if (boundaryLeak || slots[i] !== "op" || !pair || !ops.has(pair)) return;
            const swapped = [...values];
            swapped[i] = pair;
            if (passesAll(fill(parsed, swapped), puzzle)) boundaryLeak = `${v} e ${pair}`;
        });
    }
    if (solutions === 0) problems.push("nenhuma montagem das peças passa em todos os casos");
    if (solutions === total) problems.push("qualquer montagem passa: não há o que pensar. Ponha em decoys peças que errem algum caso (outro número, outra entrada)");
    if (boundaryLeak) problems.push(`o limite não está em nenhum caso: ${boundaryLeak} passam os dois`);
    if (skipped) problems.push(`dá para resolver sem usar "${skipped}": inclua um caso em que só uma das condições é verdade`);
    // O número da REGRA tem de estar no briefing: o jogador não tem de onde
    // adivinhar que o limite é 35. Conta só o número que decide alguma coisa,
    // na condição de um se/senão se ou na contagem de um repita. O passo de uma
    // conta ("placas = placas + 1") não: exigir um "1" escrito no briefing fazia
    // a dificuldade fácil do cap. 3 ser recusada quase sempre.
    const briefing = (puzzle.briefing ?? []).join(" ");
    const ruleNumbers = firstSolution
        ? fill(parsed, firstSolution)
            .filter((line) => ["se", "senão", "repita", "enquanto", "para"].includes(line.tokens[0]))
            .flatMap((line) => line.tokens)
        : [];
    [...new Set(ruleNumbers)].filter((v) => /^-?\d+(\.\d+)?$/.test(v)).forEach((n) => {
        const escaped = n.replace(".", "\\.");
        if (!new RegExp(`(^|[^\\d.])${escaped}([^\\d]|$)`).test(briefing)) {
            problems.push(`o briefing não diz o número ${n}, que a solução usa`);
        }
    });
    // A dica também: ela mostra a resposta, e uma dica com outro número ou o
    // operador vizinho ensina errado.
    if (firstSolution && !hintMatches) {
        const shown = firstSolution.filter((v) => COMPARISONS.includes(v) || NUMBER_RE.test(v)).join(" ");
        problems.push(`o hint não mostra uma montagem que funciona: use os mesmos operadores e números de uma solução certa (${shown}), separados por espaço`);
    }
    return { problems, solutions, total };
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

// A dica mostra esta solução? Confere só operadores de comparação e números,
// que é onde uma dica errada engana (`<` no lugar de `<=`, 35 no lugar de 40).
function hintShows(values, hintTokens) {
    return values
        .filter((v) => COMPARISONS.includes(v) || NUMBER_RE.test(v))
        .every((v) => hintTokens.has(v));
}

export function checkPuzzle(puzzle, spec) {
    const shape = checkShape(puzzle, spec);
    if (shape.length) return { ok: false, problems: shape };
    const text = puzzle.lines.join("\n");
    const mustUse = (spec.requires ?? []).filter((w) => CONNECTIVES.includes(w) && !usesWord(text, w));
    const run = checkSolvable(puzzle, { mustUse });
    return { ok: run.problems.length === 0, problems: run.problems, solutions: run.solutions, total: run.total };
}

// A IA escreve a SOLUÇÃO como código ("se peso >= 30 :", "    rampa = \"carga\"")
// e é o jogo que recorta os encaixes dela — em vez de pedir ao modelo o molde
// com encaixes, a lista de valores na ordem e o resultado de cada caso, três
// coisas que ele erra com facilidade e que têm de concordar entre si. Assim:
//   - os encaixes saem da própria solução, então molde e solução não brigam;
//   - no máximo 4 encaixes por linha, por prioridade (valor, comparação,
//     conectivo, nome): o que não cabe fica como texto fixo;
//   - o `expect` de cada caso é a solução EXECUTADA, e a dica é a solução.
// Devolve { problems, lines, blocks, tests, hint }.
const SLOT_PRIORITY = { valor: 0, op: 1, conectivo: 2, nome: 3 };

function slotKind(token, i, tokens, names, arithmetic = false) {
    // o nome DECLARADO no "para cada <nome> em" é fixo; o que vem depois do "em" vira encaixe
    if (tokens[0] === "para" && i <= 3) return null;
    if (LITERAL_RE.test(token)) return "valor";
    // conta do corpo como encaixe (só nas fichas que pedem: "energia = energia [+] placa")
    if (arithmetic && ["+", "-", "*", "/"].includes(token) && tokens[1] === "=") return "op";
    if (COMPARISONS.includes(token)) return "op";
    if (token === "e" || token === "ou") return "conectivo";
    // nome numa condição (não o alvo de uma atribuição, que é fixo)
    if (names.has(token) && tokens[i + 1] !== "=") return "nome";
    return null;
}

// `defaults` da ficha: objeto = estado inicial da sala (placas = 0); false/omitido = nenhum.
export const specDefaults = (spec) => (spec.defaults && typeof spec.defaults === "object" ? spec.defaults : {});

export function buildFromSolution(solution, decoys, tests, spec) {
    if (!Array.isArray(solution) || solution.length < 2) {
        return { problems: ["solution tem de ser o programa certo, uma linha de código por item"] };
    }
    // Entradas e o item do "para cada" (no corpo, "placa" é encaixe: é a peça
    // que o jogador tem de escolher contra a lista inteira, "placas").
    const names = new Set([...Object.keys(spec.inputs), ...loopItems(solution)]);
    const inputNames = new Set(Object.keys(spec.inputs));
    const blocks = { nome: [], op: [], valor: [] };
    const values = [];
    const plain = [];
    const lines = solution.map((raw) => {
        // "vezes:" e "senão:" grudados viram "vezes :", como o template espera.
        const text = String(raw).replace(/\s+$/, "").replace(/	/g, "    ").replace(/([^\s:]):$/, "$1 :");
        // "repita vao :" sem o "vezes" (o modelo esquece): completa, a intenção é clara.
        const fixed = /^\s*repita\s/.test(text) && !/\svezes\s*:$/.test(text) ? text.replace(/\s*:$/, " vezes :") : text;
        const indent = text.length - text.trimStart().length;
        // `cheia == true` vira só `cheia`: é o mesmo teste e economiza dois
        // encaixes, que fazem falta numa linha com duas condições.
        const tokens = fixed.trim().split(/\s+/).reduce((out, t, i, all) => {
            if (t === "==" && all[i + 1] === "true" && names.has(all[i - 1])) return out;
            if (t === "true" && all[i - 1] === "==" && names.has(all[i - 2])) return out;
            return [...out, t];
        }, []);
        plain.push(tokens.join(" "));
        const kinds = tokens.map((t, i) => slotKind(t, i, tokens, names, Boolean(spec.arithmeticSlot)));
        // Até 4 encaixes, pelos mais importantes primeiro.
        const chosen = new Set(kinds.map((k, i) => [k, i]).filter(([k]) => k)
            .sort((a, b) => SLOT_PRIORITY[a[0]] - SLOT_PRIORITY[b[0]] || a[1] - b[1])
            .slice(0, LIMITS.maxSlotsPerLine).map(([, i]) => i));
        // Linha larga demais para o console: os nomes de variável voltam a ser
        // texto fixo (mais estreito que um encaixe), do último para o primeiro.
        const template = () => parseTemplateLine(" ".repeat(indent) + tokens
            .map((t, i) => (chosen.has(i) ? `[${kinds[i] === "conectivo" ? "op" : kinds[i]}]` : t)).join(" "));
        // Depois dos nomes, o conectivo (texto fixo permitido).
        const dropOrder = [...chosen].filter((i) => kinds[i] === "nome" || kinds[i] === "conectivo")
            .sort((x, y) => (kinds[y] === "nome") - (kinds[x] === "nome") || y - x);
        while (dropOrder.length && lineWidth(template()) > LIMITS.maxLineWidth) chosen.delete(dropOrder.shift());
        const out = tokens.map((t, i) => {
            if (!chosen.has(i)) return t;
            const category = kinds[i] === "conectivo" ? "op" : kinds[i];
            blocks[category].push(t);
            values.push(t);
            return `[${category}]`;
        });
        return " ".repeat(Math.round(indent / 4) * 4) + out.join(" ");
    });

    // Iscas do modelo, com as aspas consertadas e sem repetir peça certa à toa.
    const fixQuotes = (v) => (/^-?\d|^"|^(true|false)$/.test(v) ? v : `"${v}"`);
    ["nome", "op", "valor"].forEach((c) => {
        (decoys?.[c] ?? []).map((v) => String(v).trim()).filter(Boolean).forEach((v) => {
            const piece = c === "valor" ? fixQuotes(v) : v;
            if (!blocks[c].includes(piece)) blocks[c].push(piece);
        });
    });
    // Encaixe de nome com uma peça só não tem o que escolher: as outras entradas
    // da sala entram de isca (é o "repita vao" contra o "repita faixas").
    if (blocks.nome.length === 1) {
        inputNames.forEach((n) => { if (!blocks.nome.includes(n)) blocks.nome.push(n); });
    }
    // Nos laços, as peças são usadas uma vez cada e "vao x faixas" dá o mesmo
    // trocando a ordem: com só as duas, toda montagem passaria. O contador
    // (placas) entra de isca: repetir "placas" vezes, com ele em zero, não enche.
    if ((spec.requires?.includes("repita") || spec.requires?.includes("para")) && blocks.nome.length && blocks.nome.length < 3) {
        Object.keys(spec.outputs).forEach((n) => { if (!blocks.nome.includes(n)) blocks.nome.push(n); });
    }

    // Conta como encaixe sem isca de operador: o "-" entra, senão a peça não tem o que escolher.
    if (spec.arithmeticSlot && blocks.op.length === 1 && blocks.op[0] === "+") blocks.op.push("-");

    // Isca de uma categoria sem encaixe nenhum (um "5" num programa só de nomes)
    // ficaria parada na prateleira sem ter onde entrar: sai.
    ["nome", "op", "valor"].forEach((c) => {
        if (!lines.some((l) => l.includes(`[${c}]`))) blocks[c] = [];
    });

    const parsed = lines.map(parseTemplateLine);
    const program = fill(parsed, values);
    const outputs = Object.keys(spec.outputs);
    const derived = [];
    for (const test of tests ?? []) {
        let scope;
        try {
            // Ficha com `defaults` (o contador que começa em zero) entra antes do caso.
            scope = run(program, { ...specDefaults(spec), ...test.given });
        } catch (error) {
            return { problems: [`a solução dá erro no caso ${test.label}: ${error.message}`] };
        }
        const expect = {};
        for (const out of outputs) {
            if (scope[out] === undefined) {
                return { problems: [`a solução não define ${out} no caso ${test.label}: escreva a saída em todos os caminhos`] };
            }
            expect[out] = scope[out];
        }
        derived.push({ ...test, expect });
    }
    const hint = `monte:  ${plain.join("  /  ")}`;
    return { problems: [], lines, blocks, tests: derived, hint };
}
