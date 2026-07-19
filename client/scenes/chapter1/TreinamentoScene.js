import Phaser from "phaser";
import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import armaUrl from "../../assets/sprites/arma/arma.png";
import projetilUrl from "../../assets/sprites/projetil/projetil.png";

// Capítulo 1, sala de treinamento (sala 4 do fluxo do capítulo): mecânicas de
// DESVIAR e DESATIVAR. Uma barreira de laser corta a sala num ciclo (atravesse
// na janela apagada; o painel do outro lado desliga de vez com `lasers = false`)
// e duas torretas atiram na Artemis no lado direito (o painel delas zera a
// munição com `municao = 0`). Encostar em laser/bala tira HP; zerar o HP
// reinicia a sala. Porta abre com os dois sistemas desativados.
//
// Cenário procedural (grade do BaseRoomScene) até a arte da sala ficar pronta.

const MAX_HP = 20;
const LASER_DAMAGE = 5;
const BULLET_DAMAGE = 3;
const IFRAME_MS = 800;
const HP_BAR = { x: 70, y: 46, w: 200, h: 10 };

// Barreira de laser vertical (px de tela).
const LASER_X = 600;
const LASER_CYCLE = { warn: 500, on: 1100, off: 1400 };   // ms de cada fase.
const LASER_HIT_W = 14;

// Torretas na parede de cima, ativas com a jogadora à direita de TURRET_RANGE_X.
const TURRETS_X = [820, 1060];
const FIRE_INTERVAL = 1500;
const BULLET_SPEED = 200;
const TURRET_RANGE_X = 660;

const RETRY_FLAG = "cap1-treinamento-retry";

const LASER_PUZZLE = {
    title: "BARREIRA // LASERS",
    briefing: [
        "A barreira de lasers corta a sala.",
        "O emissor obedece à variável lasers:",
        "com o valor certo, ele desliga de vez."
    ],
    hint: "monte na ordem:  lasers  =  false",
    variable: "lasers",
    expected: false,
    successMessage: "BARREIRA DESATIVADA",
    wrongValueMessage: "a barreira continua ligada",
    blockDistractors: {
        nome: ["barreira", "feixe"],
        op: ["=="],
        valor: ["true", '"false"']
    }
};

const TURRET_PUZZLE = {
    title: "TORRETAS // MUNIÇÃO",
    briefing: [
        "As torretas atiram enquanto houver munição.",
        "O contador vive na variável municao —",
        "esvazie os carregadores."
    ],
    hint: "monte na ordem:  municao  =  0",
    variable: "municao",
    expected: 0,
    successMessage: "TORRETAS OFFLINE",
    wrongValueMessage: "ainda há munição nos carregadores",
    blockDistractors: {
        nome: ["balas", "torreta"],
        op: ["=="],
        valor: ["100", '"0"']
    }
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Lasers e torretas. Atravesse a barreira quando ela apagar; os painéis desligam tudo de vez." },
    { speaker: "COSMO", text: "Se o seu HP zerar, eu reinicio a sala." }
];

const CLEARED_SCRIPT = [
    { speaker: "COSMO", text: "Sala limpa. Adiante, uma arena de treino — hora de aprender a revidar." }
];

export default class TreinamentoScene extends BaseRoomScene {
    constructor() {
        super("cap1-treinamento", {
            title: "TREINAMENTO // SEGURANÇA",
            footer: "WASD mover   SHIFT correr   [E] interagir",
            nextScene: "cap1-sentinela",
            spawn: { x: 140, y: 400 }
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        if (!this.textures.exists("arma")) {
            this.load.image("arma", armaUrl);
        }
        if (!this.textures.exists("projetil")) {
            this.load.spritesheet("projetil", projetilUrl, { frameWidth: 32, frameHeight: 32 });
        }
    }

    onRoomCreate() {
        this.hp = MAX_HP;
        this.invulnUntil = 0;
        this.downed = false;
        this.lasersOn = true;      // sistema da barreira (ciclo rodando).
        this.laserActive = false;  // feixe ligado neste instante.
        this.turretsOn = true;

        this.createProjectileAnim();
        this.drawHpBar();
        this.createLaser();
        this.createTurrets();
        this.createPanels();

        if (this.registry.get(RETRY_FLAG)) {
            this.registry.remove(RETRY_FLAG);
            this.setStatus("> SISTEMAS RESTAURADOS — TENTE DE NOVO", "#4ad6ff");
        } else {
            this.playDialogue(ENTRY_SCRIPT);
        }
    }

    onRoomUpdate() {
        // Balas que saíram da área jogável somem.
        if (this.bullets) {
            const { x, y, w, h } = this.bounds;
            this.bullets.getChildren().slice().forEach((bullet) => {
                if (bullet.x < x - 20 || bullet.x > x + w + 20 || bullet.y < y - 20 || bullet.y > y + h + 20) {
                    bullet.destroy();
                }
            });
        }
    }

    // --- HUD de HP da sala ---
    drawHpBar() {
        this.add.text(HP_BAR.x, HP_BAR.y - 12, "ARTEMIS :: HP", {
            fontFamily: "VCR",
            fontSize: "14px",
            color: "#7a8099"
        }).setOrigin(0, 0.5).setDepth(900);
        this.hpText = this.add.text(HP_BAR.x + HP_BAR.w + 12, HP_BAR.y + HP_BAR.h / 2, "", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#e7e9f2"
        }).setOrigin(0, 0.5).setDepth(900);
        this.hpGraphics = this.add.graphics().setDepth(900);
        this.updateHpBar();
    }

    updateHpBar() {
        const ratio = this.hp / MAX_HP;
        const color = ratio > 0.5 ? 0x51e36b : ratio > 0.25 ? 0xffb347 : 0xff4545;

        this.hpGraphics.clear();
        this.hpGraphics.lineStyle(1, 0x4ad6ff, 0.6);
        this.hpGraphics.strokeRect(HP_BAR.x, HP_BAR.y, HP_BAR.w, HP_BAR.h);
        this.hpGraphics.fillStyle(color, 0.9);
        this.hpGraphics.fillRect(HP_BAR.x + 1, HP_BAR.y + 1, (HP_BAR.w - 2) * ratio, HP_BAR.h - 2);
        this.hpText.setText(`${this.hp}/${MAX_HP}`);
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

        // Emissores (topo e base).
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

        // Ligado: feixe cheio + brilho.
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

    // --- Torretas ---
    createProjectileAnim() {
        if (!this.anims.exists("projetil-anim")) {
            this.anims.create({
                key: "projetil-anim",
                frames: this.anims.generateFrameNumbers("projetil", { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }
    }

    createTurrets() {
        const turretY = this.bounds.y + 16;

        // Sprite da arma (assets/sprites/arma) aponta para baixo por padrão;
        // no tiro, gira para mirar na Artemis.
        this.turretSprites = TURRETS_X.map((tx) =>
            this.add.image(tx, turretY, "arma").setScale(2).setDepth(700)
        );

        this.bullets = this.physics.add.group();
        this.physics.add.overlap(this.player.sprite, this.bullets, (_, bullet) => {
            bullet.destroy();
            this.damagePlayer(BULLET_DAMAGE);
        });

        this.fireTimer = this.time.addEvent({
            delay: FIRE_INTERVAL,
            loop: true,
            callback: () => this.fireTurrets()
        });
    }

    fireTurrets() {
        if (!this.turretsOn || !this.player.enabled || this.downed) {
            return;
        }
        if (this.player.sprite.x < TURRET_RANGE_X) {
            return;
        }

        this.turretSprites.forEach((turret) => {
            const angle = Phaser.Math.Angle.Between(
                turret.x, turret.y, this.player.sprite.x, this.player.sprite.y
            );
            // O cano aponta para baixo (90°); gira a diferença para mirar.
            turret.setRotation(angle - Math.PI / 2);

            const bullet = this.bullets.create(
                turret.x + Math.cos(angle) * 26,
                turret.y + Math.sin(angle) * 26,
                "projetil"
            );
            bullet.setDepth(750);
            bullet.play("projetil-anim");
            bullet.body.setSize(20, 20, true);
            bullet.body.setVelocity(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
        });
    }

    disableTurrets() {
        this.turretsOn = false;
        this.fireTimer?.remove();
        this.fireTimer = null;
        this.bullets?.clear(true, true);
        // Armas apagadas, de volta à posição de descanso.
        this.turretSprites.forEach((turret) => {
            turret.setTint(0x555a66);
            turret.setRotation(0);
        });
    }

    // --- Painéis de desativação ---
    createPanels() {
        this.laserPanel = new PuzzleDevice(this, {
            x: 710,
            y: 330,
            blocks: true,
            puzzle: LASER_PUZZLE,
            onSolved: () => {
                this.disableLasers();
                this.checkAllSolved();
            }
        });

        this.turretPanel = new PuzzleDevice(this, {
            x: 1140,
            y: 250,
            blocks: true,
            puzzle: TURRET_PUZZLE,
            onSolved: () => {
                this.disableTurrets();
                this.checkAllSolved();
            }
        });
    }

    checkAllSolved() {
        const solved = [this.laserPanel, this.turretPanel].filter((panel) => panel.solved).length;
        this.setStatus(`> SISTEMAS DESATIVADOS: ${solved}/2`, solved === 2 ? "#51e36b" : "#7a8099");

        if (solved < 2) {
            return;
        }

        this.time.delayedCall(800, () => {
            this.playDialogue(CLEARED_SCRIPT, () => this.unlockDoor());
        });
    }

    // --- Dano e reinício ---
    damagePlayer(amount) {
        if (this.downed || !this.player.enabled || this.time.now < this.invulnUntil) {
            return;
        }
        this.invulnUntil = this.time.now + IFRAME_MS;

        this.hp = Math.max(0, this.hp - amount);
        this.updateHpBar();
        this.cameras.main.shake(150, 0.004);

        this.tweens.add({
            targets: this.player.sprite,
            alpha: 0.3,
            duration: 90,
            yoyo: true,
            repeat: 3,
            onComplete: () => this.player.sprite.setAlpha(1)
        });

        if (this.hp <= 0) {
            this.handleDefeat();
        }
    }

    handleDefeat() {
        this.downed = true;
        this.player.setEnabled(false);
        this.cameras.main.flash(400, 255, 40, 40);
        this.setStatus("> SISTEMAS CRÍTICOS — REINICIANDO SALA", "#ff4545");

        this.time.delayedCall(1400, () => {
            this.registry.set(RETRY_FLAG, true);
            this.scene.restart();
        });
    }
}
