import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Enemy from "../../characters/Enemy";

// Capítulo 1, sala de treinamento (sala 4): barreira de laser + INIMIGOS. A
// barreira corta a sala num ciclo (atravesse na janela apagada; o painel do
// outro lado desliga com `lasers = false`) e três robôs patrulham/atacam o lado
// direito. Cada robô se neutraliza reprogramando ([R] seleciona direto → batalha
// de reprogramação) ou no melee ([F], placeholder). Encostar/levar tiro tira HP
// (base); zerar reinicia a Artemis no spawn. A porta abre com o laser desligado
// e todos os robôs desativados. Cenário procedural até a arte ficar pronta.

const LASER_X = 600;
const LASER_CYCLE = { warn: 500, on: 1100, off: 1400 };
const LASER_HIT_W = 14;
const LASER_DAMAGE = 5;

const LASER_PUZZLE = {
    title: "BARREIRA // LASERS",
    briefing: [
        "A barreira de lasers corta a sala.",
        "O emissor obedece à variável lasers:",
        "ache o valor que desliga os feixes."
    ],
    hint: "lasers = <ligada ou desligada?>  (booleano true/false)",
    variable: "lasers",
    expected: false,
    // Painel: os feixes ficam vermelhos (ligados) ou apagam conforme o valor.
    gauge: { kind: "toggle", label: "BARREIRA" },
    successMessage: "BARREIRA DESATIVADA",
    wrongValueMessage: "a barreira continua ligada",
    blockDistractors: {
        nome: ["barreira", "feixe"],
        op: ["=="],
        valor: ["true", '"false"']
    }
};

const ENEMY_SPAWNS = [
    { type: "exploding", x: 820, y: 300 },
    { type: "pistol", x: 1080, y: 430 },
    { type: "shotgun", x: 940, y: 560 }
];

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Barreira de laser e robôs de segurança. Atravesse quando a barreira apagar." },
    { speaker: "COSMO", text: "Contra os robôs: aperte [R] pra reprogramar um deles, ou [F] pra quebrá-lo no braço." },
    { speaker: "COSMO", text: "Se o HP zerar, eu te reinicio aqui. Desligue a barreira e neutralize todos." }
];

const CLEARED_SCRIPT = [
    { speaker: "COSMO", text: "Sala limpa. Adiante, uma arena de treino — hora de aprender a revidar." }
];

export default class TreinamentoScene extends BaseRoomScene {
    constructor() {
        super("cap1-treinamento", {
            title: "TREINAMENTO // SEGURANÇA",
            nextScene: "cap1-sentinela",
            spawn: { x: 140, y: 400 },
            ySort: true,
            combat: true
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        Enemy.preload(this);
    }

    onRoomCreate() {
        this.lasersOn = true;
        this.laserActive = false;
        this.cleared = false;

        this.createLaser();
        this.createPanel();

        ENEMY_SPAWNS.forEach((spawn) => new Enemy(this, spawn.x, spawn.y, { type: spawn.type }));

        this.playDialogue(ENTRY_SCRIPT);
    }

    onRoomUpdate() {
        if (this.cleared) {
            return;
        }
        if (!this.lasersOn && this.enemies.every((e) => e.disabled)) {
            this.handleCleared();
        }
    }

    handleCleared() {
        this.cleared = true;
        this.time.delayedCall(700, () => {
            this.playDialogue(CLEARED_SCRIPT, () => this.unlockDoor());
        });
    }

    // --- Barreira de laser ---
    createLaser() {
        this.laserGraphics = this.add.graphics().setDepth(700);

        const { y, h } = this.bounds;
        const zone = this.add.zone(LASER_X, y + h / 2, LASER_HIT_W, h);
        this.physics.add.existing(zone, true);
        this.physics.add.overlap(this.player.sprite, zone, () => {
            if (this.laserActive) {
                this.damagePlayer(LASER_DAMAGE);
            }
        });

        this.laserState = "off";
        this.startLaserCycle();
        this.drawLaser();
    }

    startLaserCycle() {
        const step = () => {
            if (!this.lasersOn) return;
            this.laserState = "warn";
            this.laserActive = false;
            this.drawLaser();
            this.laserTimer = this.time.delayedCall(LASER_CYCLE.warn, () => {
                if (!this.lasersOn) return;
                this.laserState = "on";
                this.laserActive = true;
                this.drawLaser();
                this.laserTimer = this.time.delayedCall(LASER_CYCLE.on, () => {
                    if (!this.lasersOn) return;
                    this.laserState = "off";
                    this.laserActive = false;
                    this.drawLaser();
                    this.laserTimer = this.time.delayedCall(LASER_CYCLE.off, step);
                });
            });
        };
        step();
    }

    drawLaser() {
        const { y, h } = this.bounds;
        const top = y + 4;
        const bottom = y + h - 4;
        const g = this.laserGraphics;

        g.clear();
        const emitterColor = this.lasersOn ? 0xff4545 : 0x3a3f55;
        g.fillStyle(emitterColor, 1);
        g.fillRect(LASER_X - 8, top - 4, 16, 10);
        g.fillRect(LASER_X - 8, bottom - 6, 16, 10);

        if (!this.lasersOn || this.laserState === "off") {
            return;
        }
        if (this.laserState === "warn") {
            g.lineStyle(2, 0xff4545, 0.35);
            g.lineBetween(LASER_X, top, LASER_X, bottom);
            return;
        }
        g.fillStyle(0xff4545, 0.22);
        g.fillRect(LASER_X - LASER_HIT_W / 2, top, LASER_HIT_W, bottom - top);
        g.lineStyle(4, 0xff4545, 1);
        g.lineBetween(LASER_X, top, LASER_X, bottom);
        g.lineStyle(8, 0xff4545, 0.25);
        g.lineBetween(LASER_X, top, LASER_X, bottom);
    }

    disableLasers() {
        this.lasersOn = false;
        this.laserActive = false;
        this.laserTimer?.remove();
        this.laserTimer = null;
        this.drawLaser();
    }

    // --- Painel da barreira ---
    createPanel() {
        this.laserPanel = new PuzzleDevice(this, {
            id: "treinamento-lasers",
            x: 300,
            y: 330,
            blocks: true,
            puzzle: LASER_PUZZLE,
            onSolved: () => this.disableLasers()
        });
    }
}
