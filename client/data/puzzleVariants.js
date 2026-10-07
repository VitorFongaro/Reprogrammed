// VARIAÇÕES DE PUZZLE — cada abertura sorteia números, temas e iscas novos.
//
// Antes todo puzzle era uma constante: a bateria enchia sempre com 100, o
// termostato era sempre 21.5 e o faxineiro sempre desligava com 20. Quem
// rejogava (ou olhava o colega jogando) decorava a resposta em vez de ler o
// problema. Aqui cada puzzle é uma FUNÇÃO que devolve um objeto novo no mesmo
// formato de antes, então os consoles não mudaram nada.
//
// Onde entra o sorteio:
//   - sala (medidores do cap. 1): no `onRoomCreate`, uma vez por entrada na sala;
//   - desligar inimigo e defesa na batalha: a cada abertura do console.
//
// O slug do puzzle (`id` do PuzzleDevice) NÃO muda com a variação: a telemetria
// e o save continuam falando do mesmo desafio.
//
// Sem Phaser de propósito: dá para gerar milhares de variações no Node e rodar
// a solução de cada condicional no interpretador (utils/condicional.js), que é
// como estas tabelas foram conferidas.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function shuffle(list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// n itens distintos da lista.
const sample = (list, n) => shuffle(list).slice(0, n);

const lit = (value) => (typeof value === "string" ? `"${value}"` : String(value));

// Resolve uma entrada de puzzle: função = gera agora, lista = sorteia uma
// (e resolve de novo, se ela também for função), objeto = usa como está.
export function resolvePuzzle(entry) {
    if (typeof entry === "function") return entry();
    if (Array.isArray(entry)) return resolvePuzzle(pick(entry));
    return entry;
}

// =============================================================================
// CAP. 1 — puzzles de sala com medidor
// =============================================================================

// GERADOR (porão): a capacidade da bateria muda. A resposta não aparece no
// texto: o jogador testa valores e olha a bateria encher; passou do limite,
// ela acusa SOBRECARGA.
export function generatorPuzzle() {
    const max = pick([60, 80, 100, 120, 150]);
    const below = Math.round((max * pick([0.4, 0.5, 0.6])) / 10) * 10;
    const above = max + pick([20, 30, 50]);
    return {
        title: "GERADOR // NÚCLEO",
        briefing: [
            "O gerador está sem carga.",
            "Guarde na variável energia a carga certa",
            "para deixar a bateria cheia, sem sobrecarregar."
        ],
        hint: "a estrutura é  energia = valor  — teste os valores e olhe a bateria.",
        variable: "energia",
        expected: max,
        gauge: { kind: "battery", label: "BATERIA", max },
        successMessage: "GERADOR ATIVADO",
        wrongValueMessage: "a bateria ainda não está cheia",
        blockDistractors: {
            nome: ["voltagem", "sensor"],
            op: ["=="],
            valor: shuffle([String(below), String(above), `"${max}"`])
        }
    };
}

// TERMOSTATO (controle): o marcador seguro anda. Sempre com meio grau, porque
// o puzzle é sobre o número DECIMAL — o inteiro vizinho é a isca principal.
export function thermostatPuzzle() {
    const target = pick([19.5, 20.5, 21.5, 22.5, 23.5]);
    const neighbour = target + pick([-1, 1]);
    return {
        title: "TERMOSTATO // NÚCLEO",
        briefing: [
            "O núcleo está superaquecendo.",
            "Ajuste a variável temperatura até o",
            "termômetro bater no marcador seguro."
        ],
        hint: "temperatura = número decimal (com ponto) — qual bate no marcador?",
        variable: "temperatura",
        expected: target,
        gauge: { kind: "thermometer", label: "TERMOSTATO", min: 18, max: 25, target },
        successMessage: "TEMPERATURA AJUSTADA",
        wrongValueMessage: "fora da faixa segura",
        blockDistractors: {
            nome: ["nucleo", "calor"],
            op: ["=="],
            valor: [String(Math.floor(target)), String(neighbour), `"${target}"`]
        }
    };
}

const SECTOR_ROWS = ["A", "B", "C"];
const SECTOR_COLS = ["1", "2", "3"];

// VENTILAÇÃO (controle): o ponto "você está aqui" cai numa célula qualquer.
export function ventilationPuzzle() {
    const cells = SECTOR_ROWS.flatMap((r) => SECTOR_COLS.map((c) => r + c));
    const [answer, ...others] = sample(cells, 3);
    return {
        title: "VENTILAÇÃO // SETOR",
        briefing: [
            "A ventilação precisa do setor onde você",
            "está agora. Leia o mapa (o ponto azul) e",
            "informe o código — é um texto (string)."
        ],
        hint: 'setor = "código do mapa" (a linha e a coluna, entre aspas)',
        variable: "setor",
        expected: answer,
        gauge: { kind: "sector", label: "SETOR", rows: SECTOR_ROWS, cols: SECTOR_COLS },
        successMessage: "VENTILAÇÃO ATIVA",
        wrongValueMessage: "setor não reconhecido",
        blockDistractors: {
            nome: ["duto", "ar"],
            op: ["=="],
            valor: others.map((cell) => `"${cell}"`)
        }
    };
}

// BARREIRA (treinamento): o tema troca a POLARIDADE. Em `lasers`, false apaga;
// em `manutencao`, é o true que apaga. Assim não dá para decorar "barreira =
// false": é preciso ler o que a variável significa. O medidor sabe qual valor
// desliga os feixes pelo `offValue`.
const BARRIER_THEMES = [
    {
        variable: "lasers",
        off: false,
        briefing: [
            "A barreira de lasers corta a sala.",
            "O emissor obedece à variável lasers:",
            "ache o valor que desliga os feixes."
        ],
        hint: "lasers = <ligados ou não?>  (booleano true/false)"
    },
    {
        variable: "manutencao",
        off: true,
        briefing: [
            "A barreira de lasers corta a sala.",
            "Em modo de manutenção, os emissores",
            "se desligam. O modo é a variável manutencao."
        ],
        hint: "manutencao = <em manutenção ou não?>  (booleano true/false)"
    },
    {
        variable: "alarme",
        off: false,
        briefing: [
            "A barreira de lasers corta a sala.",
            "Ela só fica de pé enquanto o alarme",
            "toca. Silencie a variável alarme."
        ],
        hint: "alarme = <tocando ou não?>  (booleano true/false)"
    }
];

export function barrierPuzzle() {
    const theme = pick(BARRIER_THEMES);
    return {
        title: "BARREIRA // LASERS",
        briefing: theme.briefing,
        hint: theme.hint,
        variable: theme.variable,
        expected: theme.off,
        gauge: { kind: "toggle", label: "BARREIRA", offValue: theme.off },
        successMessage: "BARREIRA DESATIVADA",
        wrongValueMessage: "a barreira continua ligada",
        blockDistractors: {
            nome: BARRIER_THEMES.filter((t) => t !== theme).map((t) => t.variable),
            op: ["=="],
            valor: [String(!theme.off), `"${theme.off}"`]
        }
    };
}

// =============================================================================
// CAP. 1 — desligar inimigo ([R]) e defesa na batalha do ENIAC
// =============================================================================
// Estes são rápidos e com tempo: o texto entrega a estrutura e o valor, e a
// variação é de VOCABULÁRIO e de TIPO. Cada inimigo tem alguns jeitos de ser
// desligado, e a isca de valor é sempre o mesmo valor com o tipo errado.

// { variable, expected, wrong (mensagem), decoys (nomes-isca) }
function assignPuzzle({ variable, expected, wrong, decoys, otherValue }) {
    return {
        variable,
        expected,
        hint: `monte:  ${variable} = ${lit(expected)}`,
        wrongValueMessage: wrong,
        blockDistractors: {
            nome: decoys,
            op: ["=="],
            valor: [lit(otherValue), `"${expected}"`]
        }
    };
}

// Desligar por inteiro que ZERA (carga, munição...) ou por booleano que
// DESLIGA. A isca numérica varia a cada abertura.
const zeroed = (variable, wrong, decoys) => () => assignPuzzle({
    variable, expected: 0, wrong, decoys, otherValue: pick([10, 50, 100])
});
const switchedOff = (variable, wrong, decoys) => () => assignPuzzle({
    variable, expected: false, wrong, decoys, otherValue: true
});

export const ENEMY_DISABLE = {
    exploding: [
        zeroed("carga", "ainda vai explodir", ["fusivel"]),
        switchedOff("detonador", "o detonador segue armado", ["pavio"]),
        zeroed("pressao", "a pressão ainda sobe", ["valvula"])
    ],
    pistol: [
        switchedOff("mira", "ainda está mirando", ["gatilho"]),
        zeroed("municao", "ainda tem munição", ["pente"]),
        switchedOff("gatilho", "o gatilho ainda responde", ["mira"])
    ],
    shotgun: [
        zeroed("cartucho", "ainda tem cartucho", ["cano"]),
        switchedOff("engatilhada", "a escopeta segue engatilhada", ["cano"]),
        zeroed("disparos", "ainda consegue disparar", ["chumbo"])
    ],
    biped: [
        switchedOff("sistema", "sistema ainda ativo", ["motor", "servo"]),
        zeroed("energia", "ainda tem energia", ["motor", "servo"]),
        switchedOff("pernas", "as pernas ainda respondem", ["motor", "servo"])
    ],
    car: [
        switchedOff("arma", "a arma ainda dispara", ["torreta", "canhao"]),
        zeroed("combustivel", "o tanque ainda tem combustível", ["torreta", "motor"]),
        switchedOff("torreta", "a torreta ainda gira", ["arma", "canhao"])
    ]
};

// Defesas do ENIAC: turno do boss, tentativa única com tempo. Uma de cada
// tipo (booleano, inteiro, decimal e texto), com o valor sorteado.
export const ENIAC_DEFENSES = [
    () => {
        const [variable, other] = sample(["escudo", "campo", "blindagem"], 2);
        return {
            title: "DEFESA // ESCUDO",
            briefing: [
                "Rotina hostil a caminho!",
                "Levante a proteção antes do impacto:",
                `${variable} recebe true (booleano).`
            ],
            hint: `monte:  ${variable} = true`,
            variable,
            expected: true,
            successMessage: "IMPACTO BLOQUEADO",
            blockDistractors: { nome: [other], op: ["=="], valor: ["false", '"true"'] }
        };
    },
    () => {
        const power = pick([60, 75, 80, 90, 100, 120]);
        return {
            title: "DEFESA // FIREWALL",
            briefing: [
                "Pacote corrompido a caminho!",
                "Suba o firewall na potência pedida:",
                `firewall recebe ${power} (inteiro).`
            ],
            hint: `monte:  firewall = ${power}`,
            variable: "firewall",
            expected: power,
            successMessage: "PACOTE FILTRADO",
            blockDistractors: {
                nome: ["parede"],
                op: ["=="],
                valor: [`"${power}"`, String(Math.round(power / 2))]
            }
        };
    },
    () => {
        const freq = pick([2.5, 3.5, 4.5, 7.5, 9.5]);
        return {
            title: "DEFESA // INTERFERÊNCIA",
            briefing: [
                "Sinal de invasão na frequência dele!",
                "Sintonize o bloqueador na mesma:",
                `frequencia recebe ${freq} (decimal).`
            ],
            hint: `monte:  frequencia = ${freq}`,
            variable: "frequencia",
            expected: freq,
            successMessage: "SINAL BLOQUEADO",
            blockDistractors: {
                nome: ["antena"],
                op: ["=="],
                valor: [String(Math.floor(freq)), `"${freq}"`]
            }
        };
    },
    () => {
        const mode = pick(["refletir", "absorver", "desviar"]);
        const other = pick(["atacar", "fugir", "esperar"]);
        return {
            title: "DEFESA // CONTRAMEDIDA",
            briefing: [
                "Descarga de energia a caminho!",
                "Escolha a contramedida certa:",
                `contramedida recebe "${mode}" (texto).`
            ],
            hint: `monte:  contramedida = "${mode}"`,
            variable: "contramedida",
            expected: mode,
            successMessage: "DESCARGA CONTIDA",
            blockDistractors: {
                nome: ["protocolo"],
                op: ["=="],
                valor: [`"${other}"`, mode]
            }
        };
    }
];

// =============================================================================
// CAP. 2 — condicionais (desligar inimigo e defesas da LEO / WITCH)
// =============================================================================
// Aqui o console EXECUTA o programa contra os `tests`, então a variação tem que
// manter os testes coerentes com o texto. Regra seguida em todos: o LIMITE
// sorteado sempre aparece num teste (caso de borda), senão `>` e `>=` passariam
// os dois e o puzzle deixaria de ensinar a diferença.

const between = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// CATRACAS da recepção (cap2-recepcao): o primeiro `se` do capítulo. O nível
// mínimo é sorteado; o crachá que o Cosmo arranja é de nível 4, então todo
// sorteio precisa ficar em 4 ou menos para a história fechar.
export function catracaPuzzle() {
    const level = pick([2, 3, 4]);
    return {
        title: "CATRACAS // ACESSO",
        briefing: [
            "O bloqueio travou as catracas para todo mundo.",
            `Reescreva a regra: só crachá de nível ${level} ou mais passa.`
        ],
        hint: `monte:  se cracha >= ${level} :   catraca = true`,
        lines: [
            "se [nome] [op] [valor] :",
            "    catraca = [valor]"
        ],
        blocks: { nome: ["cracha"], op: [">=", "<", "=="], valor: [String(level), `"${level}"`, "true", "false"] },
        defaults: { catraca: false },
        tests: [
            { given: { cracha: level - 1 }, expect: { catraca: false } },
            { given: { cracha: level }, expect: { catraca: true } },
            { given: { cracha: level + between(1, 3) }, expect: { catraca: true } }
        ],
        successMessage: "ACESSO CONFIGURADO"
    };
}

// FAXINEIRO: recarrega abaixo de um limite sorteado.
function faxineiroPuzzle() {
    const limit = pick([15, 20, 25, 30]);
    const decoy = pick([40, 50, 60].filter((v) => v !== limit));
    return {
        briefing: [
            "Ele está quase sem bateria e não para de limpar.",
            `Mande-o recarregar quando a bateria estiver ABAIXO de ${limit}.`
        ],
        hint: `monte:  se bateria < ${limit} :  modo = "recarga"  /  senão :  modo = "limpeza"`,
        lines: [
            "se [nome] [op] [valor] :",
            "    modo = [valor]",
            "senão :",
            "    modo = [valor]"
        ],
        blocks: {
            nome: ["bateria"],
            op: ["<", ">", "=="],
            valor: [String(limit), String(decoy), '"recarga"', '"limpeza"']
        },
        tests: [
            { given: { bateria: between(2, limit - 3) }, expect: { modo: "recarga" } },
            { given: { bateria: limit }, expect: { modo: "limpeza" } },
            { given: { bateria: between(limit + 20, 95) }, expect: { modo: "limpeza" } }
        ],
        timeLimitMs: 30000
    };
}

// VIGIA: o mesmo comportamento pedido de dois jeitos. No segundo ela começa
// sem atirar e o jogador precisa do `!=` — a mesma regra, lida ao contrário.
function vigiaPuzzle() {
    const intruder = pick(["intruso", "drone", "rato"]);
    const tests = [
        { given: { alvo: "artemis" }, expect: { atirar: false } },
        { given: { alvo: intruder }, expect: { atirar: true } }
    ];
    const lines = ["se [nome] [op] [valor] :", "    atirar = [valor]"];
    const blocks = { nome: ["alvo"], op: ["==", "!="], valor: ['"artemis"', "false", "true"] };
    if (Math.random() < 0.5) {
        return {
            briefing: [
                "A vigia atira em tudo que se mexe.",
                "Faça ela ignorar a Artemis, mas continuar de guarda contra o resto."
            ],
            hint: 'monte:  se alvo == "artemis" :   atirar = false',
            lines, blocks, tests,
            defaults: { atirar: true },
            timeLimitMs: 24000
        };
    }
    return {
        briefing: [
            "A vigia foi desligada e não atira em nada.",
            "Religue a guarda só para quem NÃO for a Artemis."
        ],
        hint: 'monte:  se alvo != "artemis" :   atirar = true',
        lines, blocks, tests,
        defaults: { atirar: false },
        timeLimitMs: 24000
    };
}

// MENSAGEIRO: tabela-verdade do `e` ou do `ou`, conforme o tema.
function mensageiroPuzzle() {
    const table = (op) => [[true, true], [true, false], [false, true], [false, false]]
        .map(([x, y]) => ({ x, y, r: op === "e" ? x && y : x || y }));

    if (Math.random() < 0.5) {
        return {
            briefing: [
                "Ele roda por qualquer motivo - e entrega nenhuma tem agora.",
                "Só deixe ele rodar se tiver entrega E rota."
            ],
            hint: "monte:  se entrega e rota :  rodar = true  /  senão :  rodar = false",
            lines: ["se [nome] [op] [nome] :", "    rodar = [valor]", "senão :", "    rodar = [valor]"],
            blocks: { nome: ["entrega", "rota"], op: ["e", "ou"], valor: ["true", "false"] },
            tests: table("e").map(({ x, y, r }) => ({
                given: { entrega: x, rota: y }, expect: { rodar: r }
            })),
            timeLimitMs: 30000
        };
    }
    return {
        briefing: [
            "Ele não para nunca, nem quebrado.",
            "Faça ele parar se tiver pane OU se a rota estiver bloqueada."
        ],
        hint: "monte:  se pane ou bloqueio :  parar = true  /  senão :  parar = false",
        lines: ["se [nome] [op] [nome] :", "    parar = [valor]", "senão :", "    parar = [valor]"],
        blocks: { nome: ["pane", "bloqueio"], op: ["e", "ou"], valor: ["true", "false"] },
        tests: table("ou").map(({ x, y, r }) => ({
            given: { pane: x, bloqueio: y }, expect: { parar: r }
        })),
        timeLimitMs: 30000
    };
}

ENEMY_DISABLE.vigia = vigiaPuzzle;
ENEMY_DISABLE.faxineiro = faxineiroPuzzle;
ENEMY_DISABLE.mensageiro = mensageiroPuzzle;

// --- LEO -----------------------------------------------------------------------

function leoTrayPuzzle() {
    const [blocked, dodged] = sample(["bandeja", "bule", "travessa", "espanador", "vassoura"], 2);
    return {
        title: `DEFESA // ${blocked.toUpperCase()} OU ${dodged.toUpperCase()}`,
        briefing: [
            "Ela vai atacar com o que estiver na mão.",
            `Contra o(a) ${blocked}, escudo. Contra o resto, desvie.`
        ],
        hint: `monte:  se arma == "${blocked}" :  acao = "escudo"  /  senão :  acao = "desviar"`,
        lines: [
            "se [nome] [op] [valor] :",
            "    acao = [valor]",
            "senão :",
            "    acao = [valor]"
        ],
        blocks: { nome: ["arma"], op: ["==", "="], valor: [`"${blocked}"`, '"escudo"', '"desviar"'] },
        tests: [
            { given: { arma: blocked }, expect: { acao: "escudo" } },
            { given: { arma: dodged }, expect: { acao: "desviar" } }
        ],
        successMessage: "GOLPE BLOQUEADO",
        timeLimitMs: 26000
    };
}

function leoTeaPuzzle() {
    const limit = pick([80, 85, 90, 95]);
    return {
        title: "DEFESA // CHÁ FERVENDO",
        briefing: [
            "Ela vai servir chá na sua cabeça.",
            `Se o chá estiver acima de ${limit} graus, resfrie o casco.`
        ],
        hint: `monte:  se cha > ${limit} :   resfriar = true`,
        lines: [
            "se [nome] [op] [valor] :",
            "    resfriar = [valor]"
        ],
        blocks: { nome: ["cha"], op: [">", "<"], valor: [String(limit), "true", "false"] },
        defaults: { resfriar: false },
        tests: [
            { given: { cha: between(limit + 3, 100) }, expect: { resfriar: true } },
            { given: { cha: limit }, expect: { resfriar: false } },
            { given: { cha: between(20, 60) }, expect: { resfriar: false } }
        ],
        successMessage: "CASCO RESFRIADO",
        timeLimitMs: 22000
    };
}

export const LEO_DEFENSES = [leoTrayPuzzle, leoTeaPuzzle];

// --- WITCH ---------------------------------------------------------------------

function witchClockPuzzle() {
    const high = pick([8, 10, 12]);
    const low = pick([2, 3, 4]);
    return {
        title: "DEFESA // HORA DO GOLPE",
        briefing: [
            "Ela ataca quando o relógio bate.",
            `Mais de ${high} s: espere. Mais de ${low} s: prepare. Senão: desvie.`
        ],
        hint: `comece pelo MAIOR: se tempo > ${high} ... senão se tempo > ${low} ...`,
        lines: [
            "se [nome] [op] [valor] :",
            "    acao = [valor]",
            "senão se [nome] [op] [valor] :",
            "    acao = [valor]",
            "senão :",
            "    acao = [valor]"
        ],
        blocks: {
            nome: ["tempo", "tempo"],
            op: [">", ">", "<"],
            valor: [String(high), String(low), '"esperar"', '"preparar"', '"desviar"']
        },
        // As duas BORDAS estão nos testes: sem o caso de `low`, soluções com
        // `< low` passavam e contrariavam o texto ("mais de 3" exclui o 3).
        tests: [
            { given: { tempo: high + pick([3, 5, 8]) }, expect: { acao: "esperar" } },
            { given: { tempo: high }, expect: { acao: "preparar" } },
            { given: { tempo: between(low + 1, high - 1) }, expect: { acao: "preparar" } },
            { given: { tempo: low }, expect: { acao: "desviar" } }
        ],
        successMessage: "GOLPE ANTECIPADO",
        timeLimitMs: 32000
    };
}

function witchCounterPuzzle() {
    const [a, b] = sample(["foice", "relogio", "sombra"], 2);
    const op = pick(["e", "ou"]);
    const rule = op === "ou"
        ? `Com qualquer um dos dois (${a} ou ${b}), escudo. Sem nenhum, abaixe.`
        : `Só com os dois juntos (${a} e ${b}), escudo. Senão, abaixe.`;
    return {
        title: "DEFESA // CONTRATEMPO",
        briefing: ["A foice erguida, o relógio girando, a sombra que ecoa.", rule],
        hint: `monte:  se ${a} ${op} ${b} :  escudo = true  /  senão :  escudo = false`,
        lines: [
            "se [nome] [op] [nome] :",
            "    escudo = [valor]",
            "senão :",
            "    escudo = [valor]"
        ],
        blocks: { nome: [a, b], op: ["e", "ou"], valor: ["true", "false"] },
        tests: [[true, true], [true, false], [false, true], [false, false]].map(([x, y]) => ({
            given: { [a]: x, [b]: y },
            expect: { escudo: op === "e" ? x && y : x || y }
        })),
        successMessage: "ESCUDO NO TEMPO CERTO",
        timeLimitMs: 26000
    };
}

export const WITCH_DEFENSES = [witchClockPuzzle, witchCounterPuzzle];

// =============================================================================
// CAP. 2 — RESERVA LOCAL dos puzzles gerados por IA
// =============================================================================
// Estes puzzles saem do Gemini (ver data/aiSpecs.js e server/services/aiService.js).
// As funções abaixo seguem a MESMA ficha e só entram quando a IA não responde a
// tempo (sem rede, Render dormindo, cota estourada): o jogo nunca fica sem
// puzzle por causa da IA.

const PLANTS = ["samambaia", "cacto", "orquidea"];
const LETTERS = "ABCDE";

// JARDIM DE INVERNO: regar abaixo de um limite de umidade. O limite sempre está
// num canteiro (o caso de borda) e sai SEM regar, para `<=` não passar.
export function irrigacaoPuzzle() {
    const limit = pick([30, 40, 50]);
    const decoy = pick([60, 70, 80]);
    const values = shuffle([between(5, limit - 10), limit, between(limit + 10, 95), between(5, limit - 5)]);
    return {
        title: "IRRIGAÇÃO // ESTUFA",
        briefing: [
            `Terra com menos de ${limit}% de umidade precisa de água.`,
            "O resto não: planta regada demais encharca."
        ],
        hint: `monte:  se umidade < ${limit} :  regar = true  /  senão :  regar = false`,
        lines: [
            "se [nome] [op] [valor] :",
            "    regar = [valor]",
            "senão :",
            "    regar = [valor]"
        ],
        blocks: { nome: ["umidade", "planta"], op: ["<", "<=", ">"], valor: [String(limit), String(decoy), "true", "false"] },
        tests: values.map((umidade, i) => ({
            label: LETTERS[i],
            given: { umidade, planta: pick(PLANTS) },
            expect: { regar: umidade < limit }
        })),
        successMessage: "IRRIGAÇÃO NO PONTO"
    };
}
