import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import Enemy from "../../characters/Enemy";
import maidWalk from "../../assets/sprites/enemies/biped_maid/walk.png";
import maidDisabled from "../../assets/sprites/enemies/biped_maid/disabled.png";

// Capítulo 2 (CONDICIONAIS), SALA DE TESTE PROVISÓRIA. O mapa do capítulo
// ainda não existe; aqui ficam lado a lado as peças novas para os devs jogarem:
//   - 3 puzzles de condicional em ordem de dificuldade (se / se-senão /
//     se-senão se-senão), no ConditionalConsole: o jogo EXECUTA o programa
//     montado contra casos de teste, então qualquer resposta que funcione vale;
//   - os 2 inimigos novos (VIGIA e FAXINEIRO, ver Enemy.js), cada um com uma
//     condicional como puzzle de desligar;
//   - a LEO, boss do capítulo (governanta robô), na BattleScene.
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

// --- Boss: LEO --------------------------------------------------------------------
// Inspirada no LEO I (Lyons Electronic Office, 1951), o primeiro computador de
// ESCRITÓRIO do mundo, construído pela J. Lyons & Co., uma rede britânica de
// casas de chá: daí a governanta robô que serve chá e decide tudo por regras.
// Arte PROVISÓRIA: recolor rosa do biped (tools/biped_recolor.py, `biped_maid`).
//
// HP calibrado como o do ENIAC (5-6 turnos na rota mais rápida), agora com 3
// REPROGRAMAR: forca 10 -> 20 -> 40, então 3 turnos investindo + 3 ataques de
// 40 = 120. Com o chip de cache do cap. 1 (+1 reprogramação, forca 80) cai
// para 3 + 2 = 5 turnos, ainda no alvo.
const LEO_HP = 120;
const LEO_POS = { x: 1040, y: 360 };

// Defesas do turno dela: condicionais com tempo (o console roda os testes).
const LEO_DEFENSES = [
    {
        title: "DEFESA // BANDEJA OU ESPANADOR",
        briefing: [
            "Ela vai atacar com o que estiver na mão.",
            "Contra a bandeja, escudo. Contra o resto, desvie."
        ],
        hint: 'monte:  se arma == "bandeja" :  acao = "escudo"  /  senão :  acao = "desviar"',
        lines: [
            "se [nome] [op] [valor] :",
            "    acao = [valor]",
            "senão :",
            "    acao = [valor]"
        ],
        blocks: { nome: ["arma"], op: ["==", "="], valor: ['"bandeja"', '"escudo"', '"desviar"'] },
        tests: [
            { given: { arma: "bandeja" }, expect: { acao: "escudo" } },
            { given: { arma: "espanador" }, expect: { acao: "desviar" } }
        ],
        successMessage: "GOLPE BLOQUEADO",
        timeLimitMs: 26000
    },
    {
        title: "DEFESA // CHÁ FERVENDO",
        briefing: [
            "Ela vai servir chá na sua cabeça.",
            "Se o chá estiver acima de 90 graus, resfrie o casco."
        ],
        hint: "monte:  se cha > 90 :   resfriar = true",
        lines: [
            "se [nome] [op] [valor] :",
            "    resfriar = [valor]"
        ],
        blocks: { nome: ["cha"], op: [">", "<"], valor: ["90", "true", "false"] },
        defaults: { resfriar: false },
        tests: [
            { given: { cha: 98 }, expect: { resfriar: true } },
            { given: { cha: 90 }, expect: { resfriar: false } },
            { given: { cha: 40 }, expect: { resfriar: false } }
        ],
        successMessage: "CASCO RESFRIADO",
        timeLimitMs: 22000
    }
];

const LEO_BATTLE = {
    name: "LEO",
    maxHp: LEO_HP,
    maxReprograms: 3,                 // cap. 2: o teto sobe de 2 para 3.
    returnScene: "cap2-laboratorio",
    defenseEnabled: true,
    defensePuzzles: LEO_DEFENSES,
    // "ifElse" é o padrão da LEO (regra escrita + lâmpada); "sweep" é a vassoura
    // atravessando a caixa e "splitBounce" os pratos quicando e se partindo.
    dodgePatterns: ["ifElse", "sweep", "ifElse", "splitBounce"],
    dodgeDuration: 6000,
    projectileInterval: 420,
    projectileSpeed: { min: 150, max: 220 },
    analysisLine: "LEO :: GOVERNANTA DA ELYSIUM, MODELO 1951.",
    analysisQuips: [
        "Baseada no LEO de 1951, o primeiro computador de escritório. Feito por uma rede de casas de chá.",
        "Cada golpe dela é um se/senão. Leia a regra antes de se mexer.",
        "Ela calcula a folha de pagamento e o ponto do chá ao mesmo tempo. Impressionante e irritante."
    ],
    reward: null,                     // sala de teste: sem chip (não dá para farmar testando).
    theme: null,                      // o cap. 2 ainda não tem trilha.
    combatants: [
        { key: "leo", walkUrl: maidWalk, disabledUrl: maidDisabled, x: 640, y: 140, scale: 3.4 }
    ]
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Laboratório de testes do andar 2. Aqui tudo roda por CONDIÇÕES: se isto, então aquilo." },
    { speaker: "COSMO", text: "Nos painéis, o sistema testa o seu programa em vários casos. Tem que acertar todos." },
    { speaker: "COSMO", text: "A vigia só atira se você se mexer. O faxineiro avança se você chegar perto. E a LEO... bom, ela serve chá." }
];

const VICTORY_SCRIPT = [
    { speaker: "COSMO", text: "A LEO desligou no meio de um se. Nunca vou saber qual era o senão." }
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
        if (!this.textures.exists("leo-walk")) {
            this.load.spritesheet("leo-walk", maidWalk, { frameWidth: 32, frameHeight: 32 });
        }
        if (!this.textures.exists("leo-disabled")) {
            this.load.spritesheet("leo-disabled", maidDisabled, { frameWidth: 32, frameHeight: 32 });
        }
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

        this.createLeo();
        this.createResetPanel();

        this.events.on("resume", this.onBattleResume, this);
        this.events.once("shutdown", () => this.events.off("resume", this.onBattleResume, this));

        this.playDialogue(ENTRY_SCRIPT);
    }

    createLeo() {
        if (!this.anims.exists("leo-walk")) {
            this.anims.create({ key: "leo-walk", frames: this.anims.generateFrameNumbers("leo-walk", { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
        }
        if (!this.anims.exists("leo-disabled")) {
            this.anims.create({ key: "leo-disabled", frames: this.anims.generateFrameNumbers("leo-disabled", { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
        }
        this.leo = this.add.sprite(LEO_POS.x, LEO_POS.y, "leo-walk", 0).setScale(3).setDepth(LEO_POS.y);
        this.leo.play("leo-walk");
        this.leoDefeated = false;

        const prompt = this.add.text(LEO_POS.x, LEO_POS.y - 80, "[E] DESAFIAR LEO", {
            fontFamily: "VCR", fontSize: "18px", color: "#ff7ad9"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.registerInteractable({
            x: LEO_POS.x,
            y: LEO_POS.y,
            radius: 150,
            promptObj: prompt,
            isAvailable: () => !this.leoDefeated,
            onInteract: () => {
                this.player.setEnabled(false);
                this.scene.launch("cap1-batalha", { config: LEO_BATTLE });
                this.scene.pause();
            }
        });
    }

    // Sala de teste: um painel que reinicia tudo (robôs, puzzles e a LEO) para
    // repetir sem recarregar a página.
    createResetPanel() {
        const x = 1130;
        const y = 180;
        const g = this.add.graphics();
        g.fillStyle(0x14161f, 1).fillRect(x - 30, y - 40, 60, 80);
        g.lineStyle(2, 0x3a3f55, 1).strokeRect(x - 30, y - 40, 60, 80);
        g.fillStyle(0xffb347, 1).fillCircle(x, y - 18, 6);
        this.add.text(x, y + 56, "RESET", { fontFamily: "VCR", fontSize: "15px", color: "#7a8099" }).setOrigin(0.5);

        const prompt = this.add.text(x, y - 70, "[E] REINICIAR SALA", {
            fontFamily: "VCR", fontSize: "18px", color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.registerInteractable({
            x, y, radius: 110, promptObj: prompt,
            isAvailable: () => true,
            onInteract: () => this.scene.restart()
        });
    }

    onBattleResume(_scene, data) {
        if (!data?.victory) {
            return;
        }
        this.leoDefeated = true;
        this.leo.play("leo-disabled");
        this.tweens.add({ targets: this.leo, alpha: 0.75, duration: 500 });
        this.time.delayedCall(600, () => this.playDialogue(VICTORY_SCRIPT));
    }
}
