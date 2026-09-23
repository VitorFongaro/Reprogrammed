import BaseRoomScene from "../chapter1/BaseRoomScene";
import { addServicePanel } from "../../objects/ServicePanel";
import maidWalk from "../../assets/sprites/enemies/biped_maid/walk.png";
import maidDisabled from "../../assets/sprites/enemies/biped_maid/disabled.png";

// Capítulo 2: sala da LEO, PRÉ-BOSS do capítulo (a boss final é a WITCH, na
// SalaWitchScene; por isso `reward: null` aqui). Provisória como o laboratório — o
// mapa do cap. 2 ainda não existe —, mas SEPARADA dele de propósito: o embate
// com ela é longo e não tem por que ficar disputando espaço com a bancada de
// testes dos inimigos comuns.
//
// A LEO é inspirada no LEO I (Lyons Electronic Office, 1951), o primeiro
// computador de ESCRITÓRIO do mundo, construído pela J. Lyons & Co., uma rede
// britânica de casas de chá: daí a governanta robô que serve chá e decide tudo
// por regras. Arte PROVISÓRIA: recolor rosa do biped (tools/biped_recolor.py,
// `biped_maid`).
//
// Fora do fluxo do jogo: sem porta de capítulo, `autoSave: false` (não pode
// virar o CONTINUAR de ninguém) e `reward: null` (sem chip: refazer o embate
// para testar não pode virar farm). Acesso no dev, pelo console do navegador:
//   __game.scene.start("cap2-sala-leo")
// ou pelo painel [E] da sala de testes (`cap2-laboratorio`).

// HP calibrado como o do ENIAC (5-6 turnos na rota mais rápida), agora com 3
// REPROGRAMAR: forca 10 -> 20 -> 40, então 3 turnos investindo + 3 ataques de
// 40 = 120. Com o chip de cache do cap. 1 (+1 reprogramação, forca 80) cai
// para 3 + 2 = 5 turnos, ainda no alvo.
const LEO_HP = 120;
const LEO_POS = { x: 640, y: 300 };

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
    returnScene: "cap2-sala-leo",
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
    { speaker: "COSMO", text: "Salão de chá. Quer dizer: era. Agora é o escritório dela." },
    { speaker: "COSMO", text: "A LEO decide tudo por regra escrita. Na batalha ela MOSTRA a regra antes de bater." },
    { speaker: "COSMO", text: "Leia, decida, e só então se mexa. É um se/senão com você dentro." }
];

const VICTORY_SCRIPT = [
    { speaker: "COSMO", text: "A LEO desligou no meio de um se. Nunca vou saber qual era o senão." }
];

export default class SalaLeoScene extends BaseRoomScene {
    constructor() {
        super("cap2-sala-leo", {
            title: "CAP. 2 :: SALÃO DA LEO",
            spawn: { x: 640, y: 600 },
            combat: true,
            autoSave: false,
            music: null
        });
    }

    preload() {
        super.preload();
        if (!this.textures.exists("leo-walk")) {
            this.load.spritesheet("leo-walk", maidWalk, { frameWidth: 32, frameHeight: 32 });
        }
        if (!this.textures.exists("leo-disabled")) {
            this.load.spritesheet("leo-disabled", maidDisabled, { frameWidth: 32, frameHeight: 32 });
        }
    }

    onRoomCreate() {
        this.createLeo();
        addServicePanel(this, {
            x: 1130, y: 180, prompt: "[E] REINICIAR SALA", label: "RESET", color: 0xffb347,
            onInteract: () => this.scene.restart()
        });
        addServicePanel(this, {
            x: 150, y: 180, prompt: "[E] VOLTAR AOS TESTES", label: "LAB", color: 0x4ad6ff,
            onInteract: () => this.scene.start("cap2-laboratorio")
        });

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
