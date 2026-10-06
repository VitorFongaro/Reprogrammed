import Phaser from "phaser";
import Enemy from "../../characters/Enemy";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import { createConsole } from "../../ui/ConditionalConsole";
import DodgeBox from "../../ui/DodgeBox";
import { getHp, getMaxHp, damage as damageVitals, fullHeal } from "../../state/vitals";
import Sfx from "../../ui/Sfx";

// Batalha de REPROGRAMAÇÃO de um inimigo (aberta pelo modo [R] da sala via
// scene.launch + pause). Ao invadir: telinha "HACKING EFETUADO"; então o robô
// revida com um ATAQUE ESTILO UNDERTALE (esquiva na caixa com WASD — cada acerto
// tira HP); em seguida o jogador monta, com TEMPO, a instrução que o desliga; se
// errar/estourar o tempo, leva outro ataque de esquiva e tenta de novo; ao
// acertar, o robô é desativado. HP zerado = falha (o robô continua ativo).
// Devolve com scene.resume(returnScene, { enemyReprogram: { index, disabled } }).

const WIDTH = 1280;
const HEIGHT = 720;

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
        DodgeBox.preload(this);   // efeitos do pack usados pelos padrões da caixa.
    }

    create() {
        // Por cima da sala (ver o mesmo comentário na BattleScene): sem isso,
        // uma sala registrada depois desta no main.js a cobre por inteiro.
        this.scene.bringToTop();
        Enemy.createAnimations(this);
        // O robô resiste a N estágios (cada um = uma esquiva + um puzzle).
        this.enemyStages = this.config.stages ?? 1;
        this.enemyStage = 0;
        // HP GLOBAL da Artemis (state/vitals): a MESMA vida das salas e da batalha.
        // Entra com o HP atual e sem escala por estágio — quanto mais ferida chega,
        // mais arriscado é reprogramar.
        this.maxHp = getMaxHp();
        this.hp = getHp();
        this.solvedThisRun = false;
        this.finished = false;

        this.cameras.main.setBackgroundColor("#04060a");
        this.drawBackdrop();

        const { walkKey, tint } = Enemy.look(this.config.type);
        this.portrait = this.add.sprite(WIDTH / 2, 160, walkKey, 0).setScale(PORTRAIT_SCALE);
        this.portrait.play(walkKey);
        // Tint do tipo (vigia, faxineiro): os clarões de acerto voltam para ele.
        this.portraitTint = tint;
        this.restorePortraitTint();
        this.portraitBaseY = 160;

        this.add.text(WIDTH / 2, 76, this.config.name ?? "ROBÔ", {
            fontFamily: "VCR", fontSize: "26px", color: "#ff4545"
        }).setOrigin(0.5);

        this.statusText = this.add.text(WIDTH / 2, 280, "", {
            fontFamily: "VCR", fontSize: "20px", color: "#7a8099", align: "center"
        }).setOrigin(0.5);

        this.drawHpBar();
        this.drawEnemyBar();
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
        Sfx.play(this, "hack");   // robô inimigo invadido
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
        const ratio = this.hp / this.maxHp;
        const color = ratio > 0.5 ? 0x51e36b : ratio > 0.25 ? 0xffb347 : 0xff4545;
        this.hpGraphics.clear();
        this.hpGraphics.lineStyle(1, 0x4ad6ff, 0.6);
        this.hpGraphics.strokeRect(bar.x, bar.y, bar.w, bar.h);
        this.hpGraphics.fillStyle(color, 0.9);
        this.hpGraphics.fillRect(bar.x + 1, bar.y + 1, (bar.w - 2) * ratio, bar.h - 2);
        this.hpText.setText(`${this.hp}/${this.maxHp}`);
    }

    // Integridade do NÚCLEO do robô: um segmento por estágio (só aparece quando
    // há mais de um), esvaziando a cada camada quebrada. Fica numa linha própria,
    // abaixo do status e acima da caixa de combate.
    drawEnemyBar() {
        if (this.enemyStages <= 1) {
            return;
        }
        const segW = 40;
        const gap = 8;
        const h = 12;
        const y = 304;
        const total = this.enemyStages * segW + (this.enemyStages - 1) * gap;
        const startX = WIDTH / 2 - total / 2;
        this.enemyBarLayout = { startX, y, segW, gap, h };

        this.enemyBarGraphics = this.add.graphics().setDepth(20);
        this.add.text(startX - 12, y + h / 2, "NÚCLEO", {
            fontFamily: "VCR", fontSize: "13px", color: "#ff8a8a"
        }).setOrigin(1, 0.5);
        this.updateEnemyBar();
    }

    updateEnemyBar() {
        if (!this.enemyBarGraphics) {
            return;
        }
        const { startX, y, segW, gap, h } = this.enemyBarLayout;
        const remaining = this.enemyStages - this.enemyStage;
        const g = this.enemyBarGraphics;
        g.clear();
        for (let i = 0; i < this.enemyStages; i += 1) {
            const x = startX + i * (segW + gap);
            g.lineStyle(1, 0xff4545, 0.6);
            g.strokeRect(x, y, segW, h);
            if (i < remaining) {
                g.fillStyle(0xff4545, 0.9);
                g.fillRect(x + 1, y + 1, segW - 2, h - 2);
            }
        }
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
        this.time.delayedCall(140, () => this.restorePortraitTint());

        this.dodge.start({
            ...DODGE_ROUND,
            patterns: this.config.dodge ?? ["rain"],   // padrão de bullet hell do inimigo.
            onHit: () => this.onDodgeHit(),
            onEnd: () => this.afterDodge()
        });
    }

    onDodgeHit() {
        this.hp = damageVitals(DODGE_HIT_DAMAGE);
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

        // Título mostra o progresso quando o robô tem vários estágios.
        const puzzle = { ...this.config.puzzle };
        if (this.enemyStages > 1) {
            puzzle.title = `${this.config.puzzle.title}  [${this.enemyStage + 1}/${this.enemyStages}]`;
        }

        this.console = createConsole(this, puzzle, {
            singleAttempt: true,
            // Condicional de várias linhas pede mais tempo que `nome = valor`.
            timeLimitMs: puzzle.timeLimitMs ?? PUZZLE_TIME,
            onSolved: () => {
                this.solvedThisRun = true;
            },
            onClose: () => {
                if (!this.solvedThisRun) {
                    this.enemyAttack();       // errou/tempo: outra esquiva, sem avançar.
                    return;
                }
                this.enemyStage += 1;
                this.updateEnemyBar();
                if (this.enemyStage >= this.enemyStages) {
                    this.win();
                } else {
                    this.advanceStage();      // quebrou uma camada: mais uma rodada.
                }
            }
        });
        this.console.open();
    }

    // Uma camada caiu, mas o robô resiste: telegrafa o dano e parte para outra
    // rodada (esquiva → puzzle).
    advanceStage() {
        if (this.finished) {
            return;
        }
        this.portrait.setTintFill(0xffffff);
        this.cameras.main.shake(160, 0.005);
        this.time.delayedCall(120, () => this.restorePortraitTint());
        this.setStatus(`CAMADA ${this.enemyStage}/${this.enemyStages} QUEBRADA — ELE RESISTE`, "#ffb347");
        this.time.delayedCall(1000, () => this.enemyAttack());
    }

    win() {
        this.finished = true;
        this.dodge.stop();
        this.setStatus("ROBÔ DESATIVADO", "#51e36b");
        this.time.delayedCall(900, () => this.finish(true));
    }

    fail() {
        this.finished = true;
        // HP zerado é uma "derrota": restaura a vitalidade (reset de checkpoint,
        // como a morte na sala e o restart do embate), então a Artemis recua e
        // volta à sala inteira em vez de chegar lá com 0 de HP.
        fullHeal();
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

    restorePortraitTint() {
        if (this.portraitTint) {
            this.portrait.setTint(this.portraitTint);
        } else {
            this.portrait.clearTint();
        }
    }
}
