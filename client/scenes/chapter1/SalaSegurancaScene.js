import Phaser from "phaser";
import BaseRoomScene from "./BaseRoomScene";
import ProgrammingConsole from "../../ui/ProgrammingConsole";
import segurancaBg from "../../assets/images/seguranca/seguranca_bg.png";
import segurancaMap from "../../assets/maps/seguranca.json";

// Capítulo 1, sala 4 — Sala de segurança: boss battle contra o ENIAC, um
// computador central gigante fixo na parede do fundo. Três estágios de puzzle
// no terminal do núcleo (revisão de int e string + o novo tipo boolean); cada
// estágio derruba um bloco de integridade até o desligamento.

const WIDTH_CENTER = 640;
const ENIAC = { left: 220, top: 130, width: 840, height: 150 };
const CORE = { x: 640, y: 340, w: 96, h: 110 };
const CORE_RADIUS = 140;
const LIGHT_ROWS = 3;
const LIGHT_COLS = 18;

const ENIAC_COLOR = "#ff4545";

const ENTRY_SCRIPT = [
    { speaker: "ENIAC", color: ENIAC_COLOR, text: "UNIDADE NÃO AUTORIZADA DETECTADA." },
    { speaker: "ENIAC", color: ENIAC_COLOR, text: "ESTE SETOR ESTÁ SOB MINHA CUSTÓDIA DESDE 1946." },
    { speaker: "COSMO", text: "Um ENIAC... primeira geração. Ele controla a trava mestra do saguão." },
    { speaker: "COSMO", text: "Máquinas assim são lentas, mas teimosas. Vamos desmontá-lo por dentro — pelo terminal do núcleo." }
];

const STAGES = [
    {
        puzzle: {
            title: "ENIAC // SOBRECARGA",
            briefing: [
                "As válvulas do ENIAC operam a 190 volts.",
                "Dobre a voltagem para sobrecarregar o circuito."
            ],
            hint: "dica:  número inteiro, o dobro de 190",
            variable: "voltagem",
            expected: 380,
            successMessage: "CIRCUITO SOBRECARREGADO",
            wrongValueMessage: "voltagem insuficiente"
        },
        afterScript: [
            { speaker: "ENIAC", color: ENIAC_COLOR, text: "ANOMALIA... VÁLVULAS EM FALHA." },
            { speaker: "COSMO", text: "Funcionou! De novo — ele vai tentar se reautenticar." }
        ]
    },
    {
        puzzle: {
            title: "ENIAC // REGISTRO",
            briefing: [
                "O ENIAC só aceita comandos de unidades registradas.",
                "Injete o seu nome no registro de operadores.",
                "Lembre: texto vai entre aspas."
            ],
            hint: 'dica:  nome = "..."',
            variable: "nome",
            expected: "Artemis",
            successMessage: "OPERADOR RECONHECIDO",
            wrongValueMessage: "operador desconhecido"
        },
        afterScript: [
            { speaker: "ENIAC", color: ENIAC_COLOR, text: "OPERADOR... ARTEMIS...? REGISTRO CORROMPIDO." },
            { speaker: "COSMO", text: "Último passo. A trava mestra é um interruptor: verdadeiro ou falso, ligado ou desligado." },
            { speaker: "COSMO", text: "Em código: true ou false. Um valor booleano. Desligue-a." }
        ]
    },
    {
        puzzle: {
            title: "ENIAC // TRAVA MESTRA",
            briefing: [
                "A trava mestra é um valor booleano:",
                "true (travada) ou false (destravada).",
                "Desative-a."
            ],
            hint: "dica:  travaMestra = false",
            variable: "travaMestra",
            expected: false,
            successMessage: "TRAVA MESTRA DESATIVADA",
            wrongValueMessage: "trava ainda ativa"
        },
        afterScript: [
            { speaker: "ENIAC", color: ENIAC_COLOR, text: "CUSTÓDIA... ENCERRADA... ......" },
            { speaker: "COSMO", text: "Conseguimos. O caminho pro saguão está livre." },
            { speaker: "COSMO", text: "Espera... com o ENIAC fora, o bloqueio de sinal caiu um nível. Estou recebendo algo—" }
        ]
    }
];

export default class SalaSegurancaScene extends BaseRoomScene {
    constructor() {
        super("cap1-seguranca", {
            nextScene: "cap1-corredor",
            spawn: { x: 150, y: 480 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 1150, y: 98 },
            ySort: true,
            bg: segurancaBg,
            map: segurancaMap
        });
    }

    onRoomCreate() {
        this.stage = 0;
        this.defeated = false;

        this.drawEniacLights();
        this.drawIntegrity();
        this.createCore();
        this.playDialogue(ENTRY_SCRIPT);
    }

    // --- Luzes do ENIAC (o gabinete está na arte do mapa; os soquetes apagados
    // também — aqui só as válvulas piscantes, por cima). ---
    drawEniacLights() {
        const { left, top, width } = ENIAC;

        this.lights = [];
        const spacingX = (width - 60) / (LIGHT_COLS - 1);
        for (let row = 0; row < LIGHT_ROWS; row += 1) {
            for (let col = 0; col < LIGHT_COLS; col += 1) {
                const lx = left + 30 + col * spacingX;
                const ly = top + 34 + row * 40;
                const light = this.add.graphics();
                const color = Math.random() > 0.5 ? 0xff4545 : 0xffb347;
                light.fillStyle(color, 1);
                light.fillCircle(lx, ly, 4);
                this.lights.push(light);

                this.tweens.add({
                    targets: light,
                    alpha: { from: 1, to: 0.15 },
                    duration: Phaser.Math.Between(300, 900),
                    delay: Phaser.Math.Between(0, 600),
                    yoyo: true,
                    repeat: -1
                });
            }
        }
    }

    drawIntegrity() {
        this.integrityGraphics = this.add.graphics();
        this.integrityLabel = this.add.text(WIDTH_CENTER, 106, "ENIAC :: INTEGRIDADE", {
            fontFamily: "VCR",
            fontSize: "14px",
            color: "#7a8099"
        }).setOrigin(0.5);
        this.updateIntegrity();
    }

    updateIntegrity() {
        const remaining = STAGES.length - this.stage;
        const blockW = 60;
        const totalW = STAGES.length * (blockW + 8) - 8;
        const startX = 640 - totalW / 2;

        this.integrityGraphics.clear();
        for (let i = 0; i < STAGES.length; i += 1) {
            const x = startX + i * (blockW + 8);
            if (i < remaining) {
                this.integrityGraphics.fillStyle(0xff4545, 0.9);
                this.integrityGraphics.fillRect(x, 116, blockW, 10);
            }
            this.integrityGraphics.lineStyle(1, 0xff4545, 0.6);
            this.integrityGraphics.strokeRect(x, 116, blockW, 10);
        }
    }

    // --- Terminal do núcleo (o pedestal e o cabo estão na arte do mapa) ---
    createCore() {
        const { x, y, h } = CORE;
        const top = y - h / 2;

        this.add.text(x, y + h / 2 + 16, "NÚCLEO", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#7a8099"
        }).setOrigin(0.5).setDepth(790);

        this.corePrompt = this.add.text(x, top - 24, "[E] INVADIR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.tweens.add({
            targets: this.corePrompt,
            y: top - 30,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.registerInteractable({
            x,
            y,
            radius: CORE_RADIUS,
            promptObj: this.corePrompt,
            isAvailable: () => !this.defeated,
            onInteract: () => this.openStageConsole()
        });
    }

    openStageConsole() {
        const stageData = STAGES[this.stage];
        let solvedThisRun = false;

        this.player.setEnabled(false);
        this.console = new ProgrammingConsole(this, stageData.puzzle, {
            onSolved: () => {
                solvedThisRun = true;
            },
            onClose: () => {
                if (solvedThisRun) {
                    this.handleStageSolved(stageData);
                } else {
                    this.player.setEnabled(true);
                }
            }
        });
        this.console.open();
    }

    handleStageSolved(stageData) {
        this.stage += 1;
        this.updateIntegrity();
        this.cameras.main.shake(350, 0.005);

        if (this.stage >= STAGES.length) {
            this.defeated = true;
            this.shutdownEniac();
        }

        this.time.delayedCall(500, () => {
            this.playDialogue(stageData.afterScript, () => {
                if (this.defeated) {
                    this.setStatus("> ENIAC DESLIGADO", "#51e36b");
                    this.unlockDoor();
                }
            });
        });
    }

    shutdownEniac() {
        // As luzes morrem em sequência, da esquerda para a direita.
        this.lights.forEach((light, index) => {
            this.tweens.killTweensOf(light);
            this.tweens.add({
                targets: light,
                alpha: 0,
                duration: 200,
                delay: index * 25
            });
        });
        this.cameras.main.shake(700, 0.006);
    }
}
