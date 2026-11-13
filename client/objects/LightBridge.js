import Sfx from "../ui/Sfx";
import Juice from "../ui/Juice";
import Effects from "../ui/Effects";

// PUZZLE DE MUNDO da ponte de luz (cap. 3, `para cada`): a ponte que atravessa o
// abismo é feita de FAIXAS, e cada caso de teste é uma faixa — a lista `placas`,
// com a energia que cada placa pede, escrita nela. O mapa é gerado dos `tests`.
//
// Ao rodar, o emissor da faixa recebe a `energia` que o programa calculou e um
// pulso de luz vai de placa em placa, da esquerda para a direita — uma volta do
// `para cada` por placa. Cada placa gasta a energia dela e acende; se acabou,
// ela pisca vermelha e fica apagada (FALTOU); se sobrou energia no fim, a faixa
// toda sobrecarrega (SOBRECARGA). Na medida, tudo aceso. Errou uma faixa, todas
// apagam para a próxima tentativa testar tudo de novo.
//
// As faixas ficam em linhas FIXAS (`rows`), criadas já na entrada como OFFLINE.
// `solidify()` é o que abre o caminho: com todas certas, a ponte inteira firma
// (inclusive as faixas que o puzzle não usou).

const ROW_H = 36;
const GAP = 4;
const PULSE_MS = 220;
const RESULT_HOLD_MS = 1400;
const COLORS = {
    off: 0x10141c, offLine: 0x2a3344, lit: 0x4ad6ff, litLine: 0xbff1ff,
    bad: 0xff4545, solid: 0xdff8ff, emitter: 0x2c303c
};

export default class LightBridge {
    // area = { x0, x1 } (bordas do abismo, tela); rows = y do centro de cada faixa.
    constructor(scene, { x0, x1, rows }) {
        this.scene = scene;
        this.x0 = x0;
        this.x1 = x1;
        this.rows = rows.map((y) => this.createRow(y));
    }

    createRow(y) {
        const s = this.scene;
        // emissor na borda esquerda
        const emitter = s.add.rectangle(this.x0 - 16, y, 14, ROW_H - 6, COLORS.emitter).setStrokeStyle(2, 0x0a0b10).setDepth(y);
        const lamp = s.add.circle(this.x0 - 16, y, 3, 0x3a1218).setDepth(y + 1);
        const counter = s.add.text(this.x0 - 30, y, "OFFLINE", {
            fontFamily: "VCR", fontSize: "13px", color: "#5b6178"
        }).setOrigin(1, 0.5).setDepth(y + 1);
        const g = s.add.graphics().setDepth(-3);
        g.lineStyle(1, COLORS.offLine, 0.6).strokeRect(this.x0 + 4, y - ROW_H / 2, this.x1 - this.x0 - 8, ROW_H);
        return { y, emitter, lamp, counter, frame: g, tiles: [], test: null, right: false };
    }

    activate(tests) {
        const s = this.scene;
        tests.forEach((test, i) => {
            const row = this.rows[i];
            if (!row) return;
            row.test = test;
            const n = test.given.placas.length;
            const span = this.x1 - this.x0 - 8;
            const w = (span - GAP * (n - 1)) / n;
            row.tiles = test.given.placas.map((need, k) => {
                const cx = this.x0 + 4 + k * (w + GAP) + w / 2;
                const rect = s.add.rectangle(cx, row.y, w, ROW_H - 6, COLORS.off, 0.9)
                    .setStrokeStyle(2, COLORS.offLine).setDepth(-2);
                const label = s.add.text(cx, row.y, String(need), {
                    fontFamily: "VCR", fontSize: "16px", color: "#8fa0b8"
                }).setOrigin(0.5).setDepth(-1);
                return { rect, label, need };
            });
            row.counter.setText(`${test.label ?? ""}  0`).setColor("#e6ebf5");
            row.lamp.setFillStyle(0xff2a4a);
        });
    }

    get active() {
        return this.rows.filter((r) => r.test);
    }

    play(results, done) {
        const rows = this.active;
        const step = (i) => {
            if (i >= rows.length) {
                this.finish(done);
                return;
            }
            this.run(rows[i], results[i]?.got?.energia, () => step(i + 1));
        };
        this.scene.time.delayedCall(250, () => step(0));
    }

    // Uma volta do para cada por placa: o pulso chega, a placa gasta a dela.
    run(row, value, next) {
        const s = this.scene;
        const energia = Number.isFinite(value) ? value : 0;
        row.right = energia === row.test.expect.energia;
        row.counter.setText(`${row.test.label ?? ""}  ${energia}`);
        row.lamp.setFillStyle(COLORS.lit);
        let budget = energia;
        const step = (k) => {
            if (k >= row.tiles.length) {
                this.judge(row, budget);
                s.time.delayedCall(260, next);
                return;
            }
            const tile = row.tiles[k];
            const pulse = s.add.circle(k === 0 ? this.x0 : row.tiles[k - 1].rect.x, row.y, 5, COLORS.litLine).setDepth(830);
            s.tweens.add({
                targets: pulse, x: tile.rect.x, duration: PULSE_MS, ease: "Sine.easeIn",
                onComplete: () => {
                    pulse.destroy();
                    if (budget >= tile.need) {
                        budget -= tile.need;
                        tile.rect.setFillStyle(COLORS.lit, 0.55).setStrokeStyle(2, COLORS.litLine);
                        tile.label.setColor("#ffffff");
                        Sfx.play(s, "select", 0.3);
                    } else {
                        // faltou energia: a placa tenta acender e apaga
                        tile.rect.setStrokeStyle(2, COLORS.bad);
                        s.tweens.add({ targets: tile.rect, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
                        tile.label.setColor("#ff4545");
                    }
                    step(k + 1);
                }
            });
        };
        step(0);
    }

    judge(row, leftover) {
        const s = this.scene;
        if (row.right) {
            Sfx.play(s, "confirm", 0.4);
            return;
        }
        Sfx.play(s, "error", 0.4);
        row.lamp.setFillStyle(COLORS.bad);
        row.counter.setColor("#ff4545");
        if (leftover > 0) {
            // sobrou energia: a faixa inteira sobrecarrega
            row.tiles.forEach((t) => t.rect.setFillStyle(COLORS.bad, 0.5).setStrokeStyle(2, COLORS.bad));
            this.flash(row, "SOBRECARGA", "#ff4545");
            Effects.play(s, "fx-spark", (this.x0 + this.x1) / 2, row.y, { scale: 0.6, depth: 830 });
            s.cameras.main.shake(90, 0.002);
        } else {
            this.flash(row, "FALTOU", "#ffb347");
        }
    }

    flash(row, text, color) {
        const s = this.scene;
        const label = s.add.text(this.x1 + 14, row.y, text, {
            fontFamily: "VCR", fontSize: "14px", color, backgroundColor: "#050505", padding: { x: 4, y: 1 }
        }).setOrigin(0, 0.5).setDepth(900);
        s.time.delayedCall(RESULT_HOLD_MS, () => label.destroy());
    }

    finish(done) {
        if (this.active.every((r) => r.right)) {
            // Resolvido: cada um pulsa em sequência com o tom subindo (game juice).
            Juice.celebrate(this.scene, this.active.map((r) => r.emitter), () => done(true));
            return;
        }
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.active.forEach((r) => this.resetRow(r));
            this.scene.time.delayedCall(200, () => done(false));
        });
    }

    resetRow(row) {
        row.right = false;
        row.lamp.setFillStyle(0xff2a4a);
        row.counter.setText(`${row.test.label ?? ""}  0`).setColor("#e6ebf5");
        row.tiles.forEach((t) => {
            t.rect.setFillStyle(COLORS.off, 0.9).setStrokeStyle(2, COLORS.offLine).setAlpha(1);
            t.label.setColor("#8fa0b8");
        });
    }

    // A ponte firma: todas as faixas (até as que o puzzle não usou) viram chão de luz.
    solidify(onDone, { instant = false } = {}) {
        const s = this.scene;
        const top = this.rows[0].y - ROW_H / 2;
        const bottom = this.rows[this.rows.length - 1].y + ROW_H / 2;
        const deck = s.add.rectangle((this.x0 + this.x1) / 2, (top + bottom) / 2, this.x1 - this.x0, bottom - top, COLORS.solid, 0.22)
            .setStrokeStyle(2, COLORS.litLine, 0.9).setDepth(-4);
        this.rows.forEach((r) => {
            r.lamp.setFillStyle(COLORS.lit);
            r.tiles.forEach((t) => t.rect.setFillStyle(COLORS.lit, 0.55).setStrokeStyle(2, COLORS.litLine));
        });
        if (instant) {
            onDone?.();
            return;
        }
        deck.setAlpha(0);
        Sfx.play(s, "confirm", 0.5);
        s.cameras.main.flash(300, 74, 214, 255, false);
        s.tweens.add({ targets: deck, alpha: 1, duration: 900, onComplete: () => onDone?.() });
    }
}
