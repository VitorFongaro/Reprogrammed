import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Enemy from "../../characters/Enemy";
import { barrierPuzzle } from "../../data/puzzleVariants";
import treinamentoBg from "../../assets/images/treinamento/treinamento_bg.png";
import treinamentoMap from "../../assets/maps/treinamento.json";

// Capítulo 1, sala de treinamento (sala 4): barreira de laser + INIMIGOS. A
// barreira corta a sala num ciclo (atravesse na janela apagada; o painel do
// outro lado desliga com `lasers = false`) e três robôs patrulham/atacam o lado
// direito. Cada robô se neutraliza reprogramando ([R] seleciona direto → batalha
// de reprogramação) ou no melee ([F], placeholder). Encostar/levar tiro tira HP
// (base); zerar reinicia a Artemis no spawn. A porta abre com o laser desligado
// e todos os robôs desativados.
//
// Cenário: fundo gerado por tools/treinamento_bg.py (mesma parede e mesmo tile
// de piso das outras salas) + props/colisões no Tiled. A faixa amarela pintada
// no chão marca onde a barreira corta — o aviso existe antes de o feixe acender.

const LASER_X = 600;
const LASER_CYCLE = { warn: 500, on: 1100, off: 1400 };
const LASER_HIT_W = 14;
const LASER_DAMAGE = 5;

// O feixe vai da BASE DA PAREDE ao FIM DO PISO, não dos bounds do jogador. São
// os mesmos números da barreira da sala de arquivos (BARRIER_TOP/BOTTOM lá):
// usar os bounds deixava sobra nas duas pontas e a barreira parecia flutuar no
// meio da sala em vez de estar presa à estrutura.
const LASER_TOP = 136;
const LASER_BOTTOM = 680;
const LASER_H = LASER_BOTTOM - LASER_TOP;

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
            // Sem título de HUD: o nome da sala é PINTADO na parede do fundo
            // (ver tools/treinamento_bg.py). Nenhuma outra sala do capítulo usa
            // o título flutuante, e aqui ele ainda brigava com a barra de HP.
            nextScene: "cap1-sentinela",
            spawn: { x: 140, y: 400 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 1152, y: 98 },
            bg: treinamentoBg,
            map: treinamentoMap,
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

        const zone = this.add.zone(LASER_X, LASER_TOP + LASER_H / 2, LASER_HIT_W, LASER_H);
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
        const top = LASER_TOP;
        const bottom = LASER_BOTTOM;
        const g = this.laserGraphics;

        g.clear();
        // Emissores mordendo a ponta do feixe: o de cima cavalga a base da
        // parede, o de baixo o fim do piso — assim a barreira nasce presa à
        // estrutura, como a da sala de arquivos.
        const emitterColor = this.lasersOn ? 0xff4545 : 0x3a3f55;
        g.fillStyle(emitterColor, 1);
        g.fillRect(LASER_X - 10, top - 8, 20, 14);
        g.fillRect(LASER_X - 10, bottom - 6, 20, 14);

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
            // O corpo vem do prop `painel-laser` do Tiled (tools/painel_laser.py),
            // desenhado no tamanho padrão do PuzzleDevice para a caixa do alvo
            // de [R] continuar batendo com o sprite. A luz indicadora fica: ela
            // acende dentro do sinalizador que o prop tem no topo.
            drawBody: false,
            blocks: true,
            // Tema (e polaridade) sorteado a cada entrada (data/puzzleVariants.js).
            puzzle: barrierPuzzle(),
            onSolved: () => this.disableLasers()
        });
    }
}
