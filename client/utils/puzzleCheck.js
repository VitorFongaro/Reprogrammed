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

import { parseTemplateLine, runTests } from "./condicional.js";

export const LIMITS = {
    maxLines: 6,
    maxSlotsPerLine: 4,
    maxPieces: 12,
    maxFillings: 200000
};

const COMPARISONS = ["==", "!=", ">", "<", ">=", "<="];
const CONNECTIVES = ["e", "ou", "não"];
const FIXED_WORDS = ["se", "senão", ":", "=", ...CONNECTIVES];
const LITERAL_RE = /^(-?\d+(\.\d+)?|"[^"]*"|true|false)$/;
const NAME_RE = /^[a-z_][a-z0-9_]*$/;
const BOUNDARY_PAIRS = { ">": ">=", ">=": ">", "<": "<=", "<=": "<" };

const literalOf = (value) => (typeof value === "string" ? `"${value}"` : String(value));

// Valor de um `given`/`expect` cabe no tipo declarado pela ficha?
function fitsInput(value, def) {
    if (def.type === "int") return Number.isInteger(value) && value >= def.min && value <= def.max;
    if (def.type === "float") return typeof value === "number" && value >= def.min && value <= def.max;
    if (def.type === "bool") return typeof value === "boolean";
    if (def.type === "text") return def.values.includes(value);
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
    need(Array.isArray(puzzle?.briefing) && puzzle.briefing.length >= 1 && puzzle.briefing.length <= 3
        && puzzle.briefing.every((l) => typeof l === "string" && l.length <= 64),
        "briefing deve ter de 1 a 3 linhas de até 64 caracteres");
    need(typeof puzzle?.hint === "string" && puzzle.hint.length <= 110, "hint ausente ou longo demais");
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
    const known = new Set([...FIXED_WORDS, ...Object.keys(outputs), ...Object.keys(inputs)]);
    const parsed = puzzle.lines.map((line) => (typeof line === "string" ? parseTemplateLine(line) : null));
    need(parsed.every(Boolean), "cada linha deve ser texto");
    if (problems.length) return problems;
    parsed.forEach((line, i) => {
        const slots = line.tokens.filter((t) => typeof t !== "string");
        need(slots.length <= LIMITS.maxSlotsPerLine, `linha ${i + 1} com ${slots.length} encaixes (máximo ${LIMITS.maxSlotsPerLine}): escreva os nomes das variáveis direto na linha, como texto fixo, em vez de [nome]`);
        slots.forEach((s) => need(["nome", "op", "valor"].includes(s.category), `linha ${i + 1}: encaixe [${s.category}] não existe`));
        line.tokens.filter((t) => typeof t === "string").forEach((t) => {
            need(known.has(t), `linha ${i + 1}: palavra fixa "${t}" não permitida`);
        });
    });
    const text = puzzle.lines.join("\n");
    (spec.requires ?? []).forEach((word) => {
        need(new RegExp(`(^|\\s)${word}(\\s|$)`, "m").test(text), `o programa precisa usar "${word}"`);
    });
    (spec.forbids ?? []).forEach((word) => {
        need(!new RegExp(`(^|\\s)${word}(\\s|$)`, "m").test(text), `o programa não pode usar "${word}"`);
    });

    // Peças.
    const blocks = puzzle.blocks ?? {};
    const pieces = Object.values(blocks).flat();
    need(Object.keys(blocks).every((c) => ["nome", "op", "valor"].includes(c)), "blocks só aceita nome/op/valor");
    need(pieces.length <= LIMITS.maxPieces, `no máximo ${LIMITS.maxPieces} peças`);
    (blocks.nome ?? []).forEach((n) => need(typeof n === "string" && NAME_RE.test(n), `nome inválido: ${n}`));
    (blocks.op ?? []).forEach((o) => need([...COMPARISONS, ...CONNECTIVES].includes(o), `operador inválido: ${o}`));
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
            need(outputs[k] && outputs[k].includes(v), `${tag}: saída ${k} = ${literalOf(v)} fora da ficha`);
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
        need(outputs[k] && outputs[k].includes(v), `defaults: ${k} fora da ficha`);
    });
    return problems;
}

// Executa todas as montagens. Devolve { problems, solutions, total }.
export function checkSolvable(puzzle) {
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
    const ops = new Set(pools.op ?? []);
    for (const values of fillings(slots, pools)) {
        if (!passesAll(fill(parsed, values), puzzle)) continue;
        solutions += 1;
        firstSolution ??= values;
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
    if (solutions === total) problems.push("qualquer montagem passa: não há o que pensar");
    if (boundaryLeak) problems.push(`o limite não está em nenhum caso: ${boundaryLeak} passam os dois`);
    // O número da regra tem de estar no briefing: o jogador não tem de onde
    // adivinhar que o limite é 35.
    const briefing = (puzzle.briefing ?? []).join(" ");
    (firstSolution ?? []).filter((v) => /^-?\d+(\.\d+)?$/.test(v)).forEach((n) => {
        const escaped = n.replace(".", "\\.");
        if (!new RegExp(`(^|[^\\d.])${escaped}([^\\d]|$)`).test(briefing)) {
            problems.push(`o briefing não diz o número ${n}, que a solução usa`);
        }
    });
    return { problems, solutions, total };
}

export function checkPuzzle(puzzle, spec) {
    const shape = checkShape(puzzle, spec);
    if (shape.length) return { ok: false, problems: shape };
    const run = checkSolvable(puzzle);
    return { ok: run.problems.length === 0, problems: run.problems, solutions: run.solutions, total: run.total };
}
