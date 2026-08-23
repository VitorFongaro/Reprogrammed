import Phaser from "phaser";
import Enemy from "../../characters/Enemy";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import DodgeBox from "../../ui/DodgeBox";

// Batalha de REPROGRAMAÇÃO de um inimigo (aberta pelo modo [R] da sala via
// scene.launch + pause). Ao invadir: telinha "HACKING EFETUADO"; então o robô
// revida com um ATAQUE ESTILO UNDERTALE (esquiva na caixa com WASD — cada acerto
// tira HP); em seguida o jogador monta, com TEMPO, a instrução que o desliga; se
// errar/estourar o tempo, leva outro ataque de esquiva e tenta de novo; ao
// acertar, o robô é desativado. HP zerado = falha (o robô continua ativo).
// Devolve com scene.resume(returnScene, { enemyReprogram: { index, disabled } }).

const WIDTH = 1280;
const HEIGHT = 720;

const REPROG_HP = 20;
const DODGE_HIT_DAMAGE = 3;
const PUZZLE_TIME = 14000;
const PORTRAIT_SCALE = 6;
const BOX = { x: 640, y: 460, w: 480, h: 260 };

const DODGE_ROUND = {
    durationMs: 6500,
    attackIntervalMs: 1500,
    speed: { min: 150, max: 240 }
};

export default class ReprogramScene extends Phaser.Scene {
    constructor() {
        super("cap1-reprograma");
    }

    init(data) {
        this.config = data?.config ?? {};
    }

    preload() {
        Enemy.preload(this);
        BlockProgrammingConsole.preload(this);
    }

    create() {
        Enemy.createAnimations(this);
        this.hp = REPROG_HP;
        this.solvedThisRun = false;
        this.finished = false;

        this.cameras.main.setBackgroundColor("#04060a");
        this.drawBackdrop();

        const walkKey = `enemy-${this.config.type ?? "exploding"}-walk`;
        this.portrait = this.add.sprite(WIDTH / 2, 160, walkKey, 0).setScale(PORTRAIT_SCALE);
        this.portrait.play(walkKey);
        this.portraitBaseY = 160;

        this.add.text(WIDTH / 2, 76, this.config.name ?? "ROBÔ", {
            fontFamily: "VCR", fontSize: "26px", color: "#ff4545"
        }).setOrigin(0.5);

        this.statusText = this.add.text(WIDTH / 2, 280, "", {
            fontFamily: "VCR", fontSize: "20px", color: "#7a8099", align: "center"
        }).setOrigin(0.5);

        this.drawHpBar();
        this.dodge = new DodgeBox(this, { box: BOX });

        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.showHackScreen();
    }

    drawBackdrop() {
        const scan = this.add.graphics().setDepth(-4);
        scan.lineStyle(1, 0x000000, 0.35);
        for (let y = 0; y < HEIGHT; y += 4) {
            scan.lineBetween(0, y, WIDTH, y);
        }
    }

    // Telinha rápida antes do combate.
    showHackScreen() {
        const banner = this.add.text(WIDTH / 2, HEIGHT / 2, "HACKING EFETUADO", {
            fontFamily: "VCR", fontSize: "52px", color: "#51e36b", align: "center"
        }).setOrigin(0.5).setDepth(60).setScale(0.6);
        const sub = this.add.text(WIDTH / 2, HEIGHT / 2 + 48, "> acesso ao núcleo do robô concedido", {
            fontFamily: "VCR", fontSize: "18px", color: "#7a8099"
        }).setOrigin(0.5).setDepth(60);

        this.cameras.main.flash(200, 40, 255, 120);
        this.tweens.add({ targets: banner, scale: 1, duration: 260, ease: "Back.easeOut" });
        // Glitch: pequenos saltos horizontais.
        this.tweens.add({ targets: banner, x: WIDTH / 2 + 6, duration: 60, yoyo: true, repeat: 6, delay: 300 });

        this.time.delayedCall(1400, () => {
            this.tweens.add({
                targets: [banner, sub],
                alpha: 0, duration: 250,
                onComplete: () => {
                    banner.destroy();
                    sub.destroy();
                    this.enemyAttack();
                }
            });
        });
    }

    // --- HP do jogador ---
    drawHpBar() {
        this.add.text(70, 634, "ARTEMIS :: HP", {
            fontFamily: "VCR", fontSize: "14px", color: "#7a8099"
        }).setOrigin(0, 0.5);
        this.hpText = this.add.text(282, 650, "", {
            fontFamily: "VCR", fontSize: "16px", color: "#e7e9f2"
        }).setOrigin(0, 0.5);
        this.hpGraphics = this.add.graphics();
        this.updateHpBar();
    }

    updateHpBar() {
        const bar = { x: 70, y: 650, w: 200, h: 10 };
        const ratio = this.hp / REPROG_HP;
        const color = ratio > 0.5 ? 0x51e36b : ratio > 0.25 ? 0xffb347 : 0xff4545;
        this.hpGraphics.clear();
        this.hpGraphics.lineStyle(1, 0x4ad6ff, 0.6);
        this.hpGraphics.strokeRect(bar.x, bar.y, bar.w, bar.h);
        this.hpGraphics.fillStyle(color, 0.9);
        this.hpGraphics.fillRect(bar.x + 1, bar.y + 1, (bar.w - 2) * ratio, bar.h - 2);
        this.hpText.setText(`${this.hp}/${REPROG_HP}`);
    }

    setStatus(text, color = "#7a8099") {
        this.statusText.setText(text).setColor(color);
    }

    // --- Loop: esquiva (ataque do robô) → puzzle com tempo → repete → desativa ---
    enemyAttack() {
        if (this.finished) {
            return;
        }
        this.setStatus("O ROBÔ REVIDA — DESVIE COM WASD!", "#ff4545");

        // Telegrafo: investida do retrato.
        this.tweens.add({
            targets: this.portrait,
            y: this.portraitBaseY + 24, duration: 150, yoyo: true, ease: "Quad.easeOut"
        });
        this.portrait.setTintFill(0xffb347);
        this.time.delayedCall(140, () => this.portrait.clearTint());

        this.dodge.start({
            ...DODGE_ROUND,
            patterns: this.config.dodge ?? ["rain"],   // padrão de bullet hell do inimigo.
            onHit: () => this.onDodgeHit(),
            onEnd: () => this.afterDodge()
        });
    }

    onDodgeHit() {
        this.hp = Math.max(0, this.hp - DODGE_HIT_DAMAGE);
        this.updateHpBar();
        this.cameras.main.shake(120, 0.004);
        if (this.hp <= 0) {
            this.dodge.stop();
            this.fail();
        }
    }

    afterDodge() {
        if (this.finished) {
            return;
        }
        this.openPuzzle();
    }

    openPuzzle() {
        if (this.finished) {
            return;
        }
        this.setStatus("DESLIGUE O ROBÔ — MONTE A INSTRUÇÃO", "#4ad6ff");
        this.solvedThisRun = false;

        this.console = new BlockProgrammingConsole(this, this.config.puzzle, {
            singleAttempt: true,
            timeLimitMs: PUZZLE_TIME,
            onSolved: () => {
                this.solvedThisRun = true;
            },
            onClose: () => {
                if (this.solvedThisRun) {
                    this.win();
                } else {
                    this.enemyAttack();   // errou ou estourou o tempo: outra esquiva.
                }
            }
        });
        this.console.open();
    }

    win() {
        this.finished = true;
        this.dodge.stop();
        this.setStatus("ROBÔ DESATIVADO", "#51e36b");
        this.time.delayedCall(900, () => this.finish(true));
    }

    fail() {
        this.finished = true;
        this.setStatus("REPROGRAMAÇÃO FALHOU — RECUANDO", "#ff4545");
        this.cameras.main.flash(300, 255, 40, 40);
        this.time.delayedCall(1100, () => this.finish(false));
    }

    finish(disabled) {
        this.scene.stop();
        this.scene.resume(this.config.returnScene, {
            enemyReprogram: { index: this.config.enemyIndex, disabled }
        });
    }
}
