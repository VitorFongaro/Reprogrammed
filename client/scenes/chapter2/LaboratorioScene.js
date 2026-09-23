import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import Enemy from "../../characters/Enemy";
import { addServicePanel } from "../../objects/ServicePanel";

// Capítulo 2 (CONDICIONAIS), SALA DE TESTE PROVISÓRIA. O mapa do capítulo
// ainda não existe; aqui ficam lado a lado as peças novas para os devs jogarem:
//   - 3 puzzles de condicional em ordem de dificuldade (se / se-senão /
//     se-senão se-senão), no ConditionalConsole: o jogo EXECUTA o programa
//     montado contra casos de teste, então qualquer resposta que funcione vale;
//   - os 3 inimigos novos (VIGIA, FAXINEIRO e MENSAGEIRO, ver Enemy.js), cada um
//     com uma condicional como puzzle de desligar.
// A boss do capítulo (LEO) tem sala própria: `cap2-sala-leo` (painel [E] aqui),
// e os PUZZLES DE MUNDO (o programa mexe no mapa) também: `cap2-deposito`.
// Quando o mapa sair, cada peça muda para a sala definitiva e esta sala some.
//
// Fora do fluxo do jogo de propósito: sem porta, sem checkpoint (não pode virar
// o "CONTINUAR" de ninguém) e sem `id` nos puzzles (slug novo precisa entrar no
// seed.sql antes de a telemetria gravar). Acesso no modo dev, pelo console do
// navegador:  __game.scene.start("cap2-laboratorio")

// --- Puzzles de sala -----------------------------------------------------------

// 1) Um `se` simples. Iscas: `"3"` (texto) ensina que não se ordena texto com
// número; `<`/`==` erram casos de teste.
const CRACHA_PUZZLE = {
    title: "PORTA DO ALMOXARIFADO",
    briefing: [
        "A porta só deve abrir para crachás de nível 3 ou mais."
    ],
    hint: "monte:  se cracha >= 3 :   porta = true",
    lines: [
        "se [nome] [op] [valor] :",
        "    porta = [valor]"
    ],
    blocks: { nome: ["cracha"], op: [">=", "<", "=="], valor: ["3", '"3"', "true", "false"] },
    defaults: { porta: false },
    tests: [
        { given: { cracha: 1 }, expect: { porta: false } },
        { given: { cracha: 3 }, expect: { porta: true } },
        { given: { cracha: 5 }, expect: { porta: true } }
    ],
    successMessage: "ACESSO CONFIGURADO"
};

// 2) se / senão. O caso de 30 graus pega quem usa >= em vez de > ; o `=` como
// operador de comparação dá o erro explicado do interpretador.
const CLIMA_PUZZLE = {
    title: "CLIMATIZAÇÃO DA ESTUFA",
    briefing: [
        "Se passar de 30 graus, o sistema deve ventilar.",
        "Em qualquer outro caso, deve aquecer."
    ],
    hint: 'monte:  se graus > 30 :  clima = "ventilar"  /  senão :  clima = "aquecer"',
    lines: [
        "se [nome] [op] [valor] :",
        "    clima = [valor]",
        "senão :",
        "    clima = [valor]"
    ],
    blocks: { nome: ["graus"], op: [">", ">=", "="], valor: ["30", '"ventilar"', '"aquecer"'] },
    tests: [
        { given: { graus: 35 }, expect: { clima: "ventilar" } },
        { given: { graus: 30 }, expect: { clima: "aquecer" } },
        { given: { graus: 12 }, expect: { clima: "aquecer" } }
    ],
    successMessage: "ESTUFA ESTABILIZADA"
};

// 3) se / senão se / senão. A ORDEM importa: testar `peso > 20` primeiro manda a
// caixa de 150 kg para o carrinho. É o erro clássico de elif, e o teste pega.
const TRIAGEM_PUZZLE = {
    title: "TRIAGEM DE CAIXAS",
    briefing: [
        "Acima de 100 kg: doca. Acima de 20 kg: carrinho.",
        "O resto segue na esteira."
    ],
    hint: "comece pelo caso MAIS restrito: se peso > 100 ... senão se peso > 20 ...",
    lines: [
        "se [nome] [op] [valor] :",
        "    destino = [valor]",
        "senão se [nome] [op] [valor] :",
        "    destino = [valor]",
        "senão :",
        "    destino = [valor]"
    ],
    blocks: {
        nome: ["peso", "peso"],
        op: [">", ">", "<"],
        valor: ["100", "20", '"doca"', '"carrinho"', '"esteira"']
    },
    tests: [
        { given: { peso: 150 }, expect: { destino: "doca" } },
        { given: { peso: 100 }, expect: { destino: "carrinho" } },
        { given: { peso: 45 }, expect: { destino: "carrinho" } },
        { given: { peso: 20 }, expect: { destino: "esteira" } }
    ],
    successMessage: "ESTEIRA REPROGRAMADA"
};

const DEVICES = [
    { x: 250, label: "SE", puzzle: CRACHA_PUZZLE },
    { x: 470, label: "SE / SENÃO", puzzle: CLIMA_PUZZLE },
    { x: 690, label: "SENÃO SE", puzzle: TRIAGEM_PUZZLE }
];
const DEVICE_Y = 200;

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Laboratório de testes do andar 2. Aqui tudo roda por CONDIÇÕES: se isto, então aquilo." },
    { speaker: "COSMO", text: "Nos painéis, o sistema testa o seu programa em vários casos. Tem que acertar todos." },
    { speaker: "COSMO", text: "A vigia só atira se você se mexer. O faxineiro avança se você chegar perto." },
    { speaker: "COSMO", text: "E aquele ali no canto está dormindo. Dormindo é o estado dele ATÉ alguém passar perto." },
    { speaker: "COSMO", text: "E quando ele travar piscando, SAIA DA FRENTE: vem a gás em cima de você. Chega sem fôlego do outro lado - é aí que você pega." }
];

export default class LaboratorioScene extends BaseRoomScene {
    constructor() {
        super("cap2-laboratorio", {
            title: "CAP. 2 :: LABORATÓRIO DE TESTES",
            spawn: { x: 130, y: 560 },
            combat: true,
            autoSave: false,
            music: null
        });
    }

    preload() {
        super.preload();
        Enemy.preload(this);
    }

    onRoomCreate() {
        this.devices = DEVICES.map((d) => new PuzzleDevice(this, {
            x: d.x,
            y: DEVICE_Y,
            label: d.label,
            blocks: true,
            puzzle: d.puzzle
        }));

        new Enemy(this, 420, 470, { type: "vigia" });
        new Enemy(this, 760, 540, { type: "faxineiro" });
        // Longe do spawn (130, 560): o mensageiro precisa ser encontrado
        // DORMINDO, senão o gatilho dele não aparece como gatilho.
        new Enemy(this, 1060, 460, { type: "mensageiro" });

        addServicePanel(this, {
            x: 1130, y: 180, prompt: "[E] REINICIAR SALA", label: "RESET", color: 0xffb347,
            onInteract: () => this.scene.restart()
        });
        addServicePanel(this, {
            x: 640, y: 600, prompt: "[E] IR PARA O SALÃO DA LEO", label: "LEO", color: 0xff7ad9,
            onInteract: () => this.scene.start("cap2-sala-leo")
        });
        addServicePanel(this, {
            x: 870, y: 600, prompt: "[E] IR PARA O DEPÓSITO", label: "DEPÓSITO", color: 0x51e36b,
            onInteract: () => this.scene.start("cap2-deposito")
        });

        this.playDialogue(ENTRY_SCRIPT);
    }
}
