// FICHAS DOS PUZZLES GERADOS POR IA (capítulo 2 em diante).
//
// A IA não inventa o puzzle do nada: a sala diz o que sabe MOSTRAR. Cada ficha
// lista as variáveis de entrada que aparecem no mapa (com o tipo e a faixa), as
// saídas que a sala sabe animar e o conceito que o puzzle tem de exercitar. O
// Gemini escolhe o resto — a regra, os limites, os casos de teste, as iscas e o
// texto — e o servidor confere tudo contra esta ficha (utils/puzzleCheck.js)
// antes de devolver. O que sair daqui vira OBJETO NO MAPA, então uma saída fora
// da ficha seria um canteiro que a sala não tem como desenhar.
//
// Mora no cliente porque os dois lados precisam dela: o servidor monta o pedido
// e confere a resposta; o cliente usa o mesmo formato no gerador local que entra
// quando a IA não responde (data/puzzleVariants.js). O servidor importa este
// arquivo direto (o Render clona o repositório inteiro).
//
// Campos:
//   topic      tópico do perfil de aprendizado (enum programming_topic)
//   concept    o que o programa tem de ensinar, em palavras (vai para o prompt)
//   setting    a sala e a máquina, para o texto sair diegético
//   inputs     { nome: { type: int|float|bool|text, min?, max?, values?, unit?, required? } }
//   outputs    { nome: [valores possíveis] }
//   requires   palavras que o programa TEM de usar; forbids: que não pode
//   tests      [mínimo, máximo] de casos (cada caso é um objeto no mapa)
//   defaults   false = o puzzle não pode ter `defaults` (força o `senão`)
//   rules      o que precisa fazer SENTIDO no mundo (a IA erra isso fácil:
//              "regar a terra encharcada" passa no interpretador e é absurdo)
//   sanity     (tests) => problema | null: a mesma regra de "sentido" em código,
//              para o conferidor recusar o que o prompt não segurou
//   variety    sugestões de variação; o servidor sorteia UMA por pedido, senão
//              o modelo devolve quase sempre o mesmo puzzle

export const AI_SPECS = {
    "jardim-irrigacao": {
        topic: "conditionals",
        concept: "se / senão: as duas saídas do programa precisam ser escritas. Sem o senão, o canteiro fica sem ordem nenhuma.",
        setting: "Jardim de inverno da Elysium, uma estufa de vidro no térreo. Cada canteiro tem um sensor de umidade da terra e um bico de irrigação. O jogador reprograma a regra da irrigação: o programa roda uma vez para cada canteiro e decide se ele é regado. Planta regada demais encharca; planta sem água seca.",
        inputs: {
            umidade: { type: "int", min: 0, max: 100, unit: "%", required: true },
            planta: { type: "text", values: ["samambaia", "cacto", "orquidea"], required: true }
        },
        outputs: { regar: [true, false] },
        requires: ["se", "senão"],
        forbids: ["senão se"],
        tests: [3, 5],
        defaults: false,
        rules: [
            "Regar faz sentido com a terra SECA (umidade baixa). Nunca regue terra mais úmida e deixe a mais seca sem água.",
            "Cacto precisa de bem menos água que samambaia e orquídea: se a regra diferenciar plantas, o limite do cacto é mais baixo.",
            "Use plantas variadas nos canteiros, mesmo quando a planta não entra na regra."
        ],
        // Dentro da mesma planta, todo canteiro regado é mais seco que todo
        // canteiro não regado. E cacto é o que MENOS precisa de água: regar um
        // cacto e deixar outra planta mais seca sem água é o mundo ao contrário.
        sanity: (tests) => {
            const dry = tests.find((a) => a.expect.regar && tests.some((b) => !b.expect.regar
                && b.given.planta === a.given.planta && b.given.umidade <= a.given.umidade));
            if (dry) return `regar ${dry.given.planta} com ${dry.given.umidade}% e não regar outra mais seca não faz sentido`;
            const cactus = tests.find((a) => a.expect.regar && a.given.planta === "cacto" && tests.some((b) => !b.expect.regar
                && b.given.planta !== "cacto" && b.given.umidade <= a.given.umidade));
            if (cactus) return `regar o cacto com ${cactus.given.umidade}% e deixar outra planta mais seca sem água: o cacto é o que menos precisa de água`;
            return null;
        },
        variety: [
            "limite de umidade entre 25 e 40",
            "limite de umidade entre 40 e 60",
            "limite de umidade que não seja múltiplo de 10",
            "a regra fala em regar com umidade ATÉ o limite (inclusive)",
            "um canteiro de cacto bem seco, que mesmo assim não deve ser regado (só na dificuldade difícil)",
            "texto do briefing na voz de um aviso de manutenção da estufa"
        ]
    },

    // DEPÓSITO, corredor de caixas (objects/CrateCorridor.js): cada caso é uma
    // caixa no corredor e `lado` é o nicho da estante para onde ela vai.
    "deposito-corredor": {
        topic: "conditionals",
        concept: "se / senão com um LIMITE numérico: a caixa que pesa exatamente o limite decide entre < e <= (ou > e >=).",
        setting: "Depósito da Elysium, no térreo. Um corredor entre as estantes está travado por caixas, uma atrás da outra. Cada caixa tem o peso escrito nela e, encostado nela, um vão vazio na estante: em cima ou embaixo. O programa roda uma vez para cada caixa e decide para que lado o pistão a empurra. A prateleira de cima só aguenta caixa leve; as pesadas vão para a de baixo. Caixa empurrada para o lado errado bate na estante e continua travando o corredor.",
        inputs: {
            peso: { type: "int", min: 1, max: 200, unit: "kg", required: true }
        },
        outputs: { lado: ["cima", "baixo"] },
        requires: ["se", "senão"],
        forbids: ["senão se"],
        tests: [3, 5],
        defaults: false,
        rules: [
            "Caixa LEVE vai para cima e PESADA para baixo: nenhuma caixa que vai para cima pode pesar o mesmo ou mais que uma que vai para baixo.",
            "Pelo menos uma caixa de cada lado, com pesos variados."
        ],
        sanity: (tests) => {
            const wrong = tests.find((a) => a.expect.lado === "cima" && tests.some((b) => b.expect.lado === "baixo"
                && b.given.peso <= a.given.peso));
            if (wrong) return `a caixa de ${wrong.given.peso} kg vai para cima, mas uma mais leve vai para baixo: leve em cima, pesada embaixo`;
            return null;
        },
        variety: [
            "limite entre 20 e 60 kg",
            "limite entre 60 e 150 kg",
            "limite que não seja múltiplo de 10",
            "a regra fala das PESADAS primeiro (acima do limite vai para baixo)",
            "a regra fala das LEVES primeiro (até o limite, inclusive, vai para cima)",
            "texto do briefing na voz de uma etiqueta de segurança da estante"
        ]
    },

    // DEPÓSITO, ponte de caixas (objects/CrateBridge.js): cada caso é uma caixa
    // da esteira; o guindaste leva para a ponte (vira chão no fosso) ou para o
    // descarte. Os vãos da ponte são as caixas que DEVEM ir para ela.
    "deposito-ponte": {
        topic: "conditionals",
        concept: "o conectivo ou: basta UMA das duas condições ser verdade (e, de isca, o e, que exige as duas).",
        setting: "Doca do depósito da Elysium. Um fosso corta a sala ao meio. Um guindaste pega as caixas da esteira, uma por vez, e o programa decide se cada uma vai para a PONTE (encaixa no fosso e vira chão) ou para o DESCARTE (o compactador). Caixa fraca na ponte racha e afunda, deixando um buraco; caixa forte no descarte faz falta. Cada caixa mostra o material (aço, madeira ou papelão) e se está cheia ou vazia: caixa cheia é mais firme que vazia.",
        inputs: {
            material: { type: "text", values: ["aco", "madeira", "papelao"], required: true },
            cheia: { type: "bool", required: true }
        },
        outputs: { destino: ["ponte", "descarte"] },
        requires: ["se", "senão", "ou"],
        forbids: ["senão se"],
        tests: [4, 5],
        defaults: false,
        rules: [
            "Caixa de aço cheia é a mais forte de todas: sempre vai para a ponte.",
            "Caixa de papelão vazia é a mais fraca: sempre vai para o descarte.",
            "De 2 a 3 caixas vão para a ponte (é o tamanho do fosso) e pelo menos uma vai para o descarte.",
            "Inclua um caso em que só UMA das duas condições é verdade, para o e e o ou darem resultados diferentes."
        ],
        sanity: (tests) => {
            const strong = tests.filter((t) => t.expect.destino === "ponte").length;
            if (strong < 2 || strong > 3) return `${strong} caixas vão para a ponte: o fosso tem lugar para 2 ou 3`;
            if (strong === tests.length) return "pelo menos uma caixa tem de ir para o descarte";
            if (tests.some((t) => t.given.material === "aco" && t.given.cheia && t.expect.destino !== "ponte")) {
                return "caixa de aço cheia é a mais forte: tem de ir para a ponte";
            }
            if (tests.some((t) => t.given.material === "papelao" && !t.given.cheia && t.expect.destino !== "descarte")) {
                return "caixa de papelão vazia é a mais fraca: tem de ir para o descarte";
            }
            return null;
        },
        variety: [
            "aço aguenta, e qualquer caixa cheia também",
            "só papelão precisa estar cheio: aço e madeira aguentam até vazios (use !=)",
            "uma esteira com os três materiais",
            "texto do briefing na voz do manual de operação do guindaste"
        ]
    }
};
