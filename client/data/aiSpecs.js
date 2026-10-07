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
    }
};
