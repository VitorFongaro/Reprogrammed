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
//   outputs    { nome: [valores possíveis] } ou { nome: { type: "int", min, max } }
//   requires   palavras que o programa TEM de usar; forbids: que não pode
//   tests      [mínimo, máximo] de casos (cada caso é um objeto no mapa)
//   defaults   false = o puzzle não pode ter `defaults` (força o `senão`);
//              objeto = estado com que a sala começa (o contador zerado do cap. 3)
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

    "expedicao-triagem": {
        topic: "conditionals",
        concept: "se / senão se / senão: três saídas, e a ORDEM dos testes importa. O primeiro teste verdadeiro ganha; um pacote que cabe em duas regras vai para a que vem primeiro.",
        setting: "Expedição da Elysium, a sala de triagem do correio no térreo. Os pacotes descem por uma esteira e um braço empurra cada um para uma de três rampas: CARGA (caminhão, leva peso), EXPRESSO (moto, rápida mas só leva pacote leve) e NORMAL (o resto). O programa roda uma vez para cada pacote e decide a rampa. A triagem quebrou e manda tudo para o fim da esteira: a pilha entupiu a passarela.",
        inputs: {
            peso: { type: "int", min: 1, max: 60, unit: "kg", required: true },
            urgente: { type: "bool", required: true },
            fragil: { type: "bool", required: true }
        },
        outputs: { rampa: ["carga", "expresso", "normal"] },
        requires: ["se", "senão se", "senão"],
        tests: [4, 5],
        defaults: false,
        rules: [
            "CARGA é para pacote pesado (peso acima de um limite). EXPRESSO é a moto: só pacote leve e urgente. NORMAL é o resto.",
            "Inclua pelo menos um pacote PESADO e URGENTE: ele vai para a CARGA, porque a moto não leva peso. É ele que faz a ordem do senão se importar (testar urgente primeiro manda esse pacote para a moto).",
            "Frágil só entra na regra na dificuldade difícil (por exemplo: frágil nunca vai de moto). Nas outras, varie o frágil nos pacotes sem que ele mude o destino."
        ],
        // A moto só leva urgente e leve; carga é o mais pesado; e tem de haver
        // o pacote pesado+urgente que ensina a ordem.
        sanity: (tests) => {
            const go = (r) => tests.filter((t) => t.expect.rampa === r);
            const moto = go("expresso");
            const truck = go("carga");
            const notUrgent = moto.find((t) => !t.given.urgente);
            if (notUrgent) return `o pacote de ${notUrgent.given.peso} kg vai no expresso sem ser urgente: o expresso é só para urgente`;
            const heavyMoto = moto.find((m) => truck.some((c) => c.given.peso <= m.given.peso));
            if (heavyMoto) return `o expresso (moto) levando ${heavyMoto.given.peso} kg enquanto um pacote mais leve vai de carga não faz sentido`;
            if (!truck.some((t) => t.given.urgente)) return "falta um pacote PESADO e URGENTE indo para a carga: é ele que faz a ordem do senão se importar";
            if (!moto.length || !go("normal").length) return "use as três rampas: carga, expresso e normal";
            return null;
        },
        variety: [
            "limite de peso entre 15 e 25 kg",
            "limite de peso entre 25 e 40 kg",
            "a regra fala em peso A PARTIR do limite (inclusive)",
            "um pacote pesado, urgente e frágil ao mesmo tempo",
            "texto do briefing na voz de um aviso do supervisor da expedição"
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
    },
    // CAPÍTULO 3 :: LINHA DE MONTAGEM (objects/AssemblyLine.js): cada caso é um
    // MOLDE de ponte na esteira, com `vao` colunas e `faixas` fileiras de
    // encaixes. A prensa bate uma vez por coluna e cada batida estampa uma placa
    // por fileira; o programa conta as placas. Molde cheio na medida vira um
    // pedaço da ponte; faltou placa fica buraco, sobrou trava a prensa.
    "montagem-prensa": {
        topic: "loops",
        concept: "repita N vezes: o mesmo passo repetido, e a quantidade de vezes vindo de uma entrada (não de um número fixo).",
        setting: "Linha de montagem no último andar da Elysium. Uma prensa estampa placas de metal em MOLDES que passam pela esteira; os moldes cheios viram os pedaços de uma ponte sobre o fosso. Cada molde tem o número de colunas (vao) e de fileiras (faixas) escrito nele. A prensa bate uma vez em cada coluna, e cada batida estampa uma placa em cada fileira daquela coluna. O programa diz quantas placas vão no molde: placa a menos deixa buraco na ponte, placa a mais trava a prensa.",
        inputs: {
            vao: { type: "int", min: 2, max: 6, unit: "colunas", required: true },
            faixas: { type: "int", min: 1, max: 3, unit: "fileiras", required: true }
        },
        outputs: { placas: { type: "int", min: 0, max: 18 } },
        requires: ["repita"],
        forbids: ["se", "senão"],
        tests: [3, 4],
        defaults: { placas: 0 },
        rules: [
            "Cada molde precisa de exatamente vao x faixas placas: a prensa repete a batida uma vez por coluna, e cada batida põe uma placa por fileira.",
            "Os moldes têm tamanhos diferentes entre si (vao variado), para um número fixo de repetições não servir em todos.",
            "Na dificuldade fácil todos os moldes têm faixas = 1 e o corpo soma 1; nas outras, pelo menos um molde tem mais de uma fileira e o corpo soma as faixas."
        ],
        sanity: (tests) => {
            const wrong = tests.find((t) => t.expect.placas !== t.given.vao * t.given.faixas);
            if (wrong) return `o molde de ${wrong.given.vao} colunas e ${wrong.given.faixas} fileiras precisa de ${wrong.given.vao * wrong.given.faixas} placas, não ${wrong.expect.placas}: repita uma vez por coluna e some as fileiras em cada volta`;
            if (new Set(tests.map((t) => t.given.vao)).size < 2) return "varie o vao entre os moldes: com todos iguais, um número fixo de repetições passaria";
            return null;
        },
        variety: [
            "moldes pequenos e grandes misturados",
            "um molde de uma fileira só no meio de moldes de várias",
            "texto do briefing na voz da ordem de serviço da linha de montagem",
            "texto do briefing na voz da própria ADA, fria e precisa"
        ]
    },

    "refrigeracao-racks": {
        topic: "loops",
        concept: "enquanto: repetir o passo ENQUANTO a condição for verdadeira, sem saber antes quantas voltas vão ser (pode ser nenhuma).",
        setting: "Sala de refrigeração no núcleo da Elysium. Racks de servidores da ADA estão superaquecidos e o calor sai pela grade do piso como vapor, bloqueando a passagem. Cada rack tem a temperatura atual (temp) e a potência do resfriador dele (passo: quantos graus ele tira por ciclo) escritas no painel. O programa liga o resfriador em ciclos: cada ciclo baixa passo graus, e o resfriador tem de DESLIGAR assim que o rack chega no limite seguro (a primeira leitura igual ou abaixo do limite). Ciclo a menos deixa o rack quente; ciclo a mais congela o rack.",
        inputs: {
            temp: { type: "int", min: 20, max: 95, unit: "graus", required: true },
            passo: { type: "int", min: 3, max: 10, unit: "graus por ciclo", required: true }
        },
        outputs: { temp: { type: "int", min: 0, max: 95 } },
        requires: ["enquanto"],
        forbids: ["se", "senão", "repita"],
        tests: [3, 4],
        rules: [
            "O limite seguro é um número só, o mesmo para todos os racks, e aparece escrito no briefing.",
            "O corpo do laço baixa a temperatura pela potência do próprio rack: temp = temp - passo.",
            "Pelo menos um rack já começa no limite ou abaixo dele: o laço não roda nenhuma vez e ele fica como está.",
            "Pelo menos um rack precisa de várias voltas, e pelo menos um cai EXATAMENTE no limite durante o resfriamento (é o que separa > de >=).",
            "Os racks têm temperaturas e potências diferentes entre si, para o número de voltas mudar de um para outro."
        ],
        sanity: (tests) => {
            const off = tests.find((t) => (t.given.temp - t.expect.temp) % t.given.passo !== 0);
            if (off) return `o rack ${off.label ?? ""} terminou em ${off.expect.temp}, que não sai de ${off.given.temp} tirando ${off.given.passo} por volta: o corpo tem de ser temp = temp - passo`;
            if (!tests.some((t) => t.expect.temp === t.given.temp)) return "inclua um rack que já começa no limite ou abaixo: o enquanto não roda nenhuma vez nele";
            if (!tests.some((t) => t.given.temp - t.expect.temp >= 2 * t.given.passo)) return "inclua um rack bem quente, que precise de pelo menos duas voltas do laço";
            if (new Set(tests.map((t) => t.given.passo)).size < 2) return "varie o passo entre os racks";
            return null;
        },
        variety: [
            "um rack quase no limite e outro muito quente",
            "resfriadores fracos (passo pequeno) e fortes misturados",
            "texto do briefing na voz do alarme térmico da sala",
            "texto do briefing na voz da própria ADA, fria e precisa"
        ]
    },

    "datacenter-backup": {
        topic: "loops",
        concept: "contador dentro do laço com um se: repetir para cada arquivo, mas só copiar (e contar) quando ainda cabe no drive.",
        setting: "Data center no núcleo da Elysium. A ADA vai apagar o arquivo de memórias das pessoas ligadas aos chips. Cada estação de backup tem um DRIVE com espaço livre (espaco, em GB) e uma fila de arquivos iguais (arquivos = quantos, tamanho = GB de cada um). O programa passa pelos arquivos um por um: se o arquivo ainda cabe no espaço que sobrou, copia (o espaço diminui) e conta mais um salvo. Copiar sem caber estoura o drive; deixar de copiar um que cabia perde uma memória.",
        inputs: {
            arquivos: { type: "int", min: 1, max: 8, unit: "arquivos", required: true },
            tamanho: { type: "int", min: 1, max: 5, unit: "GB cada", required: true },
            espaco: { type: "int", min: 2, max: 20, unit: "GB livres", required: true }
        },
        outputs: { salvos: { type: "int", min: 0, max: 8 } },
        requires: ["repita", "se"],
        forbids: ["senão", "enquanto"],
        tests: [3, 4],
        defaults: { salvos: 0 },
        rules: [
            "O laço passa uma vez por arquivo (repita arquivos vezes); dentro dele, um se testa se o arquivo cabe no espaço que sobrou (espaco >= tamanho).",
            "Dentro do se: o espaço diminui do tamanho do arquivo e o contador salvos aumenta 1.",
            "Pelo menos uma estação tem espaço de sobra para todos os arquivos, e pelo menos uma fica sem espaço antes do fim da fila (é ela que mostra por que o se precisa estar DENTRO do laço).",
            "Pelo menos uma estação tem o espaço exatamente igual a um múltiplo do tamanho e arquivos suficientes para enchê-lo até o fim (é o que separa >= de >).",
            "O briefing diz o objetivo (salvar o que cabe e contar), mas NÃO diz qual comparação usar (nada de \"maior ou igual\"): descobrir isso é o puzzle."
        ],
        sanity: (tests) => {
            const fits = (t) => Math.min(t.given.arquivos, Math.floor(t.given.espaco / t.given.tamanho));
            const wrong = tests.find((t) => t.expect.salvos !== fits(t));
            if (wrong) return `a estação ${wrong.label ?? ""} salva ${fits(wrong)} arquivos (cabem ${Math.floor(wrong.given.espaco / wrong.given.tamanho)} de ${wrong.given.tamanho} GB em ${wrong.given.espaco} GB), não ${wrong.expect.salvos}: copie só enquanto espaco >= tamanho e some 1 em salvos`;
            if (!tests.some((t) => t.given.arquivos * t.given.tamanho <= t.given.espaco)) return "inclua uma estação em que todos os arquivos cabem";
            if (!tests.some((t) => t.given.arquivos * t.given.tamanho > t.given.espaco)) return "inclua uma estação que fica sem espaço antes do fim da fila";
            if (!tests.some((t) => t.given.espaco % t.given.tamanho === 0 && t.given.arquivos >= t.given.espaco / t.given.tamanho)) return "inclua uma estação em que os arquivos enchem o drive exatamente (espaco múltiplo do tamanho), para >= e > darem resultados diferentes";
            return null;
        },
        variety: [
            "drives grandes e pequenos misturados",
            "uma fila longa de arquivos pequenos e uma curta de arquivos grandes",
            "texto do briefing na voz da Lua, pedindo para salvar as memórias",
            "texto do briefing na voz do sistema de backup, seco e técnico"
        ]
    }
};
