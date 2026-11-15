// Testes das ROTINAS do Cache (client/utils/rotinas.js), sem Phaser nem banco:
//     node tools/rotinas_teste.mjs
// Usa uma batalha falsa com as mesmas regras do anfitrião da BattleScene
// (routineHost). O que depende da tela (custo de turno, menu, HUD) fica para o
// teste manual.
const M = await import(new URL("../client/utils/rotinas.js", import.meta.url));
const { runTests } = await import(new URL("../client/utils/condicional.js", import.meta.url));

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.log("FALHOU:", name); } };

// Linhas como o console entrega (peça com espaço vira vários tokens).
const L = (cond, action) => [
    { indent: 0, tokens: ["se", ...cond.split(" "), ":"] },
    { indent: 1, tokens: action.split(" ") }
];

// Batalha falsa com as mesmas regras do anfitrião da BattleScene.
function battle({ hp = 20, forca = null, reprogramCount = 0, maxReprograms = 2, repairLeft = 10, inv = {} } = {}) {
    const b = {
        hp, maxHp: 20, forca, baseForca: 5, reprogramCount, maxReprograms, repairLeft, repairMax: 5, inv,
        heal(n) { b.repairLeft -= n; b.hp = Math.min(20, b.hp + n); },
        raiseForca(v) { b.reprogramCount += 1; b.forca = v; },
        useItem(id) {
            const heals = { "pente-ram": 6 };
            if (!(b.inv[id] > 0)) return { ok: false, message: `acabou ${id}` };
            if (heals[id]) {
                if (b.hp >= 20) return { ok: false, message: "HP já está cheio" };
                b.hp = Math.min(20, b.hp + heals[id]);
            }
            b.inv[id] -= 1;
            return { ok: true, message: `${id} usado` };
        }
    };
    return b;
}
const state = (b, dano = 0, integridade = 100) => ({ hp: b.hp, integridade, dano, forca: b.forca ?? b.baseForca });

// Simula a conferência do começo do turno (a mesma ordem da BattleScene.runRoutine).
function conferir(routine, b, dano = 0, integridade = 100) {
    const { requests, error } = M.evaluateRoutine(routine.lines, state(b, dano, integridade));
    if (error) return { outcome: "blocked", msgs: [error] };
    if (!requests.length) return { outcome: "waiting", msgs: [] };
    const res = requests.map((r) => M.applyRoutineRequest(r, b));
    return { outcome: res.some((r) => r.ok) ? "fired" : "blocked", msgs: res.map((r) => r.message) };
}

// 1-4: persistência, condição falsa repetida, verdadeira de novo.
{
    const routine = M.makeRoutine(L("hp < 5", "reparo = 5"));
    const b = battle({ hp: 20 });
    ok(conferir(routine, b).outcome === "waiting", "1/2 hp 20: espera");
    b.hp = 18; ok(conferir(routine, b).outcome === "waiting", "2 hp 18: espera de novo");
    b.hp = 4; const r1 = conferir(routine, b);
    ok(r1.outcome === "fired" && b.hp === 9, "3 hp 4: dispara e cura 5");
    ok(conferir(routine, b).outcome === "waiting", "hp 9: espera, a rotina continua");
    b.hp = 3; const r2 = conferir(routine, b);
    ok(r2.outcome === "fired" && b.hp === 8 && b.repairLeft === 0, "4 hp 3: dispara de novo (reserva acabou em 0)");
    b.hp = 2; const r3 = conferir(routine, b);
    ok(r3.outcome === "blocked" && /reserva/.test(r3.msgs[0]) && b.hp === 2, "reserva vazia: bloqueada, sem curar");
    ok(routine.text === "se hp < 5 :  reparo = 5" || routine.text.includes("reparo = 5"), "rotina intacta depois de disparar");
}

// 8: combinações inválidas recusadas antes de instalar.
{
    const env = { items: ["pente-ram"], baseForca: 5 };
    const bad = [
        [L("hp < 5", 'forca = "pente-ram"'), "forca com item"],
        [L("hp < 5", 'reparo = "overclock"'), "reparo com item"],
        [L("hp < 5", "usar = 40"), "usar com número"],
        [L("hp < 5", "hp = 5"), "atribuir a sensor"],
        [L("reparo > 0", "reparo = 5"), "ação lida na condição"],
        [L('hp < "pente-ram"', "reparo = 5"), "item na condição"],
        [L("hp < 5", "forca = 5"), "forca que não aumenta"],
        [L("hp < 5", "reparo = 0"), "reparo zero"],
        [L("hp < 5", 'usar = "overclock"'), "item que não tem"],
        [L("hp < 5", "reparo = forca * 2"), "reparo com forca * 2"]
    ];
    bad.forEach(([lines, name]) => ok(M.validateRoutine(lines, env) !== null, `8 recusa: ${name}`));
    const good = [
        L("hp < 5", "reparo = 5"),
        L("dano == 0", "forca = forca * 2"),
        L("integridade < 50", 'usar = "pente-ram"'),
        L("forca <= 50", "forca = 50")
    ];
    good.forEach((lines) => ok(M.validateRoutine(lines, env) === null, `8 aceita: ${lines[1].tokens.join(" ")}`));

    // Regras de encaixe (o console recusa antes mesmo de completar).
    const rules = M.routineSlotRules(env);
    const ctx = (labels) => ({ labelAt: (i) => labels[i] ?? null });
    ok(rules[0]("reparo", ctx([])) !== null, "encaixe: ação na condição recusada");
    ok(rules[0]("hp", ctx([])) === null, "encaixe: sensor na condição aceito");
    ok(rules[2]('"pente-ram"', ctx([])) !== null, "encaixe: item no valor da condição recusado");
    ok(rules[3]("hp", ctx([])) !== null, "encaixe: sensor como ação recusado");
    ok(rules[4]("40", ctx({ 3: "usar" })) !== null, "encaixe: usar = 40 recusado");
    ok(rules[4]('"pente-ram"', ctx({ 3: "usar" })) === null, "encaixe: usar = item aceito");
    ok(rules[3]("forca", ctx({ 4: '"pente-ram"' })) !== null, "encaixe: forca com item já no valor recusado");
}

// 9: força respeita sobrecarga e o teto de dobrar.
{
    const routine = M.makeRoutine(L("dano == 0", "forca = forca * 2"));
    const b = battle({ forca: null });
    let r = conferir(routine, b, 0);
    ok(r.outcome === "fired" && b.forca === 10 && b.reprogramCount === 1, "9 cria a força (5 -> 10)");
    r = conferir(routine, b, 0);
    ok(r.outcome === "fired" && b.forca === 20 && b.reprogramCount === 2, "9 dobra (10 -> 20)");
    r = conferir(routine, b, 0);
    ok(r.outcome === "blocked" && /sobrecarga/.test(r.msgs[0]) && b.forca === 20, "9 sobrecarga: bloqueada");
    ok(conferir(routine, b, 3).outcome === "waiting", "9 apanhou: espera");
    const b2 = battle({ forca: 10 });
    conferir(M.makeRoutine(L("hp > 0", "forca = 50")), b2);
    ok(b2.forca === 20, "9 forca = 50 só dobra (10 -> 20)");
}

// 10 e 13: reparo com limites e com HP cheio.
{
    const routine = M.makeRoutine(L("hp < 50", "reparo = 50"));
    const b = battle({ hp: 18 });
    let r = conferir(routine, b);
    ok(r.outcome === "fired" && b.hp === 20 && b.repairLeft === 8, "10 cura só o que falta (2), gasta 2 da reserva");
    r = conferir(routine, b);
    ok(r.outcome === "blocked" && /cheio/.test(r.msgs[0]) && b.repairLeft === 8, "13 HP cheio: bloqueada, reserva intacta");
    b.hp = 1; conferir(routine, b);
    ok(b.hp === 6 && b.repairLeft === 3, "10 cura no máximo 5 por vez");
}

// 11-12: itens consumidos e item que acaba.
{
    const routine = M.makeRoutine(L("hp < 10", 'usar = "pente-ram"'));
    const b = battle({ hp: 5, inv: { "pente-ram": 1 } });
    let r = conferir(routine, b);
    ok(r.outcome === "fired" && b.inv["pente-ram"] === 0 && b.hp === 11, "11 usa e consome o item");
    b.hp = 4; r = conferir(routine, b);
    ok(r.outcome === "blocked" && /acabou/.test(r.msgs[0]) && b.hp === 4, "12 item acabou: bloqueada, rotina fica");
}

// O console (modo programa) aceita todas as rotinas válidas: elas RODAM no estado de agora.
{
    const puzzle = M.routinePuzzle({ state: { hp: 20, integridade: 100, dano: 0, forca: 5 }, items: [{ id: "pente-ram", count: 2 }], repairLeft: 10, repairMax: 5, baseForca: 5 });
    ok(puzzle.blocks.nome.length + puzzle.blocks.op.length + puzzle.blocks.valor.length <= 16, "peças cabem na prateleira");
    const r = runTests(L("hp < 5", "reparo = 5"), puzzle.tests, puzzle.defaults);
    ok(!r[0].error, "console: rotina válida roda no estado de agora");
    ok(puzzle.briefing.join(" ").includes("pente-ram x2"), "enunciado lista itens com quantidade");
}

// Teto de ações por conferência (preparo para laços).
{
    const lines = [
        { indent: 0, tokens: ["se", "hp", "<", "50", ":"] },
        { indent: 1, tokens: ["reparo", "=", "1"] },
        { indent: 1, tokens: ["reparo", "=", "1"] },
        { indent: 1, tokens: ["reparo", "=", "1"] },
        { indent: 1, tokens: ["reparo", "=", "1"] }
    ];
    ok(M.evaluateRoutine(lines, { hp: 3, integridade: 100, dano: 0, forca: 5 }).requests.length === M.MAX_ACTIONS_PER_TURN, "teto de ações por turno");
}

console.log(`\n${pass} passaram, ${fail} falharam`);
