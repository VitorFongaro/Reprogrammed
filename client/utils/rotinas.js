// ROTINAS DO CACHE — a lógica, sem Phaser (dá para testar no Node).
//
// Uma rotina é um programinha que a Artemis segue sozinha durante o combate:
//     se <sensor> <op> <valor> :
//         <ação> = <valor>
// Fica INSTALADA o combate inteiro: é conferida no começo de cada turno do
// jogador (logo depois do turno do inimigo) e, se a condição der verdadeira,
// a ação acontece. Disparando ou não, ela continua lá até o jogador trocar ou
// apagar. Quem decide QUANDO conferir é a BattleScene; aqui moram:
//   - o que a rotina enxerga (SENSORS) e o que ela pode fazer (ACTION_VALUES);
//   - a validação (validateRoutine) e as regras de encaixe do console
//     (routineSlotRules): combinação que não faz nada não chega a ser instalada;
//   - a execução (evaluateRoutine), que roda as linhas no MESMO interpretador
//     dos puzzles (utils/condicional.js) e devolve os PEDIDOS de ação;
//   - o efeito de cada pedido (applyRoutineRequest), sobre um "anfitrião" que a
//     batalha fornece (ver BattleScene.routineHost).
//
// A rotina é guardada como LINHAS DE TOKENS (o mesmo formato que o interpretador
// executa) mais um resumo estruturado (parseRoutine). Como o interpretador já
// entende se/senão, repita, enquanto e para cada (com teto de voltas), os laços
// no futuro são questão de liberar o molde e a validação, não de reescrever a
// execução. Ver "Evolução" no fim do arquivo.

import { run, CondError } from "./condicional.js";

// O que a condição pode ler. `integridade` é PERCENTUAL (0 a 100): assim
// "integridade < 50" quer dizer "o inimigo está na metade" em qualquer luta,
// do ENIAC (80 de HP) à WITCH.
export const SENSORS = {
    hp: "a sua vida (0 a 20)",
    integridade: "a vida do inimigo, em %",
    dano: "o que você levou no último turno do inimigo",
    forca: "a sua força agora"
};

// O que cada ação aceita (a matriz de compatibilidade).
export const ACTION_VALUES = {
    forca: { kinds: ["dobro", "numero"], why: "forca recebe forca * 2 ou um número" },
    reparo: { kinds: ["numero"], why: "reparo recebe um número: quanto curar" },
    usar: { kinds: ["item"], why: "usar recebe um item do inventário, entre aspas" }
};
export const ACTIONS = Object.keys(ACTION_VALUES);
const CONDITION_KINDS = ["numero", "dobro"];

// Teto de ações por conferência: com laços (futuro), uma rotina não pode
// despejar o inventário inteiro num turno.
export const MAX_ACTIONS_PER_TURN = 3;

const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const ITEM_RE = /^"([^"]*)"$/;
const LOOP_WORDS = ["repita", "enquanto", "para"];

// Tipo de uma peça de valor, pelo rótulo.
export function valueKind(label) {
    if (NUMBER_RE.test(label)) return "numero";
    if (label === "forca * 2") return "dobro";
    if (ITEM_RE.test(label)) return "item";
    return "outro";
}

const itemIdOf = (label) => label.match(ITEM_RE)?.[1] ?? null;

// Problema de um par ação = valor, ou null. Usado no encaixe (antes de soltar a
// peça) e na validação (antes de instalar).
export function actionValueProblem(target, label, { items = [], baseForca = 5 } = {}) {
    const spec = ACTION_VALUES[target];
    if (!spec) return null;
    const kind = valueKind(label);
    if (!spec.kinds.includes(kind)) {
        return `${target} = ${label} não faz nada: ${spec.why}`;
    }
    if (target === "forca" && kind === "numero" && Number(label) <= baseForca) {
        return `forca = ${label} não aumenta a força (ela já começa em ${baseForca})`;
    }
    if (target === "reparo" && Number(label) <= 0) {
        return `reparo = ${label} não cura nada`;
    }
    if (target === "usar" && !items.includes(itemIdOf(label))) {
        return `não tem ${label} no inventário`;
    }
    return null;
}

// Regras dos 5 encaixes do molde, na ordem em que o console os cria:
// [sensor] [op] [valor] na condição, [ação] [valor] na ação. Cada regra recebe
// o rótulo da peça e `ctx.labelAt(i)` (o que está nos outros encaixes) e
// devolve o motivo da recusa, ou null.
export function routineSlotRules(env) {
    const notSensor = (label) => (ACTIONS.includes(label)
        ? `${label} é uma ação: vai na segunda linha`
        : `${label} não é algo que a rotina consiga ler`);
    return [
        (label) => (SENSORS[label] ? null : notSensor(label)),
        () => null,
        (label) => (CONDITION_KINDS.includes(valueKind(label)) ? null : "a condição compara com um número"),
        (label, ctx) => {
            if (!ACTIONS.includes(label)) {
                return SENSORS[label]
                    ? `${label} é só leitura: a rotina age com forca, reparo ou usar`
                    : `${label} não é uma ação`;
            }
            const value = ctx.labelAt(4);
            return value ? actionValueProblem(label, value, env) : null;
        },
        (label, ctx) => {
            const target = ctx.labelAt(3);
            if (target) return actionValueProblem(target, label, env);
            return valueKind(label) === "outro" ? `${label} não é um valor` : null;
        }
    ];
}

// Confere o programa montado antes de instalar. Percorre linha a linha (não só
// o molde de hoje), para continuar valendo quando houver mais estruturas.
export function validateRoutine(lines, env = {}) {
    for (const line of lines) {
        const t = line.tokens;
        if (LOOP_WORDS.includes(t[0])) {
            return "as rotinas ainda não aceitam laços";
        }
        if (t[0] === "se" || (t[0] === "senão" && t[1] === "se")) {
            const cond = t.slice(t[0] === "se" ? 1 : 2, t[t.length - 1] === ":" ? -1 : undefined);
            for (const tok of cond) {
                if (ITEM_RE.test(tok)) return "a condição compara números, não itens";
                if (/^[a-z_][a-z0-9_]*$/.test(tok) && !["e", "ou", "não"].includes(tok) && !SENSORS[tok]) {
                    return ACTIONS.includes(tok)
                        ? `${tok} é uma ação, não dá para ler na condição`
                        : `${tok} não é algo que a rotina consiga ler`;
                }
            }
            continue;
        }
        if (t[0] === "senão") continue;
        const [target, eq, ...rest] = t;
        if (eq !== "=") return "a ação tem a forma  ação = valor";
        if (!ACTIONS.includes(target)) {
            return SENSORS[target]
                ? `${target} é só leitura: a rotina age com forca, reparo ou usar`
                : `${target} não é uma ação`;
        }
        const problem = actionValueProblem(target, rest.join(" "), env);
        if (problem) return problem;
    }
    return null;
}

// Resumo estruturado (para o HUD, o ANALISAR e o que vier depois).
export function parseRoutine(lines) {
    const [head, body] = lines;
    const cond = head?.tokens.slice(1, -1) ?? [];
    return {
        kind: "if",
        cond: { sensor: cond[0], op: cond[1], value: cond.slice(2).join(" ") },
        action: { target: body?.tokens[0], value: body?.tokens.slice(2).join(" ") },
        text: lines.map((l) => l.tokens.join(" ")).join("  ")
    };
}

export function makeRoutine(lines) {
    return { lines, ...parseRoutine(lines) };
}

// Roda a rotina no estado da batalha e devolve os PEDIDOS de ação, na ordem
// (vazio = condição falsa). Atribuição a sensor nunca chega aqui (validação).
export function evaluateRoutine(lines, state) {
    const requests = [];
    try {
        run(lines, { ...state, reparo: 0, usar: "" }, {
            onAssign: (name, value) => {
                if (ACTIONS.includes(name) && requests.length < MAX_ACTIONS_PER_TURN) {
                    requests.push({ target: name, value });
                }
            }
        });
    } catch (error) {
        if (error instanceof CondError) return { requests: [], error: error.message };
        throw error;
    }
    return { requests, error: null };
}

// Efeito de UM pedido sobre o anfitrião (a batalha). Devolve { ok, message }:
// ok=false é EXECUÇÃO BLOQUEADA (a condição deu certo, o efeito não pôde) — a
// rotina continua instalada. O anfitrião expõe: hp, maxHp, forca (null antes
// de criada), baseForca, reprogramCount, maxReprograms, repairLeft, repairMax,
// heal(n), raiseForca(v) e useItem(id) -> { ok, message }.
export function applyRoutineRequest({ target, value }, host) {
    if (target === "forca") {
        if (typeof value !== "number") return { ok: false, message: "forca precisa de um número" };
        if (host.reprogramCount >= host.maxReprograms) return { ok: false, message: "força em sobrecarga" };
        const atual = host.forca ?? host.baseForca;
        // No máximo DOBRA, como o REPROGRAMAR: `forca = 50` não pula etapas.
        const nova = Math.min(Math.round(value), atual * 2);
        if (nova <= atual) return { ok: false, message: `a força já é ${atual}` };
        host.raiseForca(nova);
        return { ok: true, message: `FORÇA = ${nova}` };
    }
    if (target === "reparo") {
        if (typeof value !== "number" || value <= 0) return { ok: false, message: "reparo precisa de um número" };
        if (host.hp >= host.maxHp) return { ok: false, message: "HP já está cheio" };
        if (host.repairLeft <= 0) return { ok: false, message: "reserva de reparo vazia" };
        const amount = Math.min(Math.round(value), host.repairMax, host.repairLeft, host.maxHp - host.hp);
        host.heal(amount);
        return { ok: true, message: `+${amount} HP` };
    }
    if (target === "usar") {
        if (typeof value !== "string" || !value) return { ok: false, message: "usar precisa de um item" };
        return host.useItem(value);
    }
    return { ok: false, message: `${target} não é uma ação` };
}

// Puzzle do console (modo programa) para montar a rotina. `items` = itens do
// inventário usáveis em batalha ({ id, name, count }). Cabem 16 peças na
// prateleira: 6 nomes + 4 operadores + 4 valores + até 2 itens (os de maior
// quantidade; a lista inteira, com quantidades, vai no enunciado).
export function routinePuzzle({ state, items = [], repairLeft, repairMax, baseForca }) {
    const pieceItems = [...items].sort((a, b) => b.count - a.count).slice(0, 2);
    const names = ["hp", "integridade", "dano", "forca", "reparo", ...(pieceItems.length ? ["usar"] : [])];
    const itemLine = items.length
        ? `Itens: ${items.map((it) => `${it.id} x${it.count}`).join(", ")}.`
        : "Sem itens de batalha no inventário.";
    return {
        title: "ROTINA // CACHE",
        briefing: [
            "Uma regra que a Artemis segue sozinha, todo turno, logo",
            "depois do ataque do inimigo. Fica até você trocar.",
            "integridade é a vida do inimigo em %. dano é o que você levou.",
            `reparo cura até ${repairMax} (sobram ${repairLeft} nesta luta). ${itemLine}`
        ],
        hint: "monte, por exemplo:  se hp < 5 :  reparo = 5   ou   se dano == 0 :  forca = forca * 2",
        lines: ["se [nome] [op] [valor] :", "    [nome] = [valor]"],
        blocks: {
            nome: names,
            op: ["<", "<=", ">", "=="],
            valor: ["0", "5", "50", "forca * 2", ...pieceItems.map((it) => `"${it.id}"`)]
        },
        // Só para conferir que o programa RODA: o estado de agora ("AGORA").
        tests: [{ label: ">", given: state, expect: {} }],
        defaults: { reparo: 0, usar: "" },
        slotRules: routineSlotRules({ items: items.map((it) => it.id), baseForca })
    };
}

// O que a rotina faz, em uma frase (prévia antes de instalar).
export function describeRoutine(routine) {
    const { cond, action } = routine;
    const quando = `quando ${cond.sensor} ${cond.op} ${cond.value}`;
    if (action.target === "reparo") return `${quando}, cura até ${action.value} de HP`;
    if (action.target === "usar") return `${quando}, usa ${action.value}`;
    return `${quando}, ${action.value === "forca * 2" ? "dobra a força" : `sobe a força para até ${action.value}`}`;
}

// --- Evolução (laços) ---------------------------------------------------------
// Proposta, ainda NÃO ligada: o molde passa a aceitar um corpo com mais de uma
// linha e `repita N vezes` / `enquanto` / `para cada item em itens`. Semântica:
//   - a rotina inteira roda UMA vez por conferência (começo do turno do
//     jogador), com todas as voltas do laço dentro dela;
//   - o interpretador já corta laço que passa de MAX_REPEAT voltas (erro
//     explicado, a rotina fica BLOQUEADA naquele turno, não trava o combate);
//   - cada atribuição a uma ação vira um PEDIDO; só os MAX_ACTIONS_PER_TURN
//     primeiros valem (ex.: um laço não gasta o inventário inteiro de uma vez);
//   - os sensores são lidos no começo e NÃO mudam no meio da volta (o reparo de
//     uma volta não muda o `hp` da seguinte), para o resultado ser previsível.
// Para ligar: tirar o "as rotinas ainda não aceitam laços" de validateRoutine,
// dar ao console um molde de várias linhas e às regras de encaixe uma por linha.
