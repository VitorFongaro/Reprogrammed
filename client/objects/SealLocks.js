import Phaser from "phaser";
import Sfx from "../ui/Sfx";
import Juice from "../ui/Juice";
import Effects from "../ui/Effects";

// PUZZLE DE MUNDO da antessala (cap. 3, condição de parada): cada caso de teste
// é uma TRAVA do selo do núcleo — uma coluna de carga com o nível inicial, a
// potência do carregador (`passo`) e a marca do ponto de abertura. O mapa é
// gerado a partir dos `tests`.
//
// Antes do puzzle chegar, as travas ficam rodando o laço da ADA: a carga sobe,
// estoura e recomeça, para sempre. Ao rodar o programa do jogador, cada volta
// do laço é um ciclo do carregador (a carga sobe `passo`). Parou no ponto = a
// trava abre (verde); parou antes = NÃO ABRIU; um ciclo a mais = SOBRECARGA; e
// o laço infinito (o `!=` que pula o ponto, o `-` que desce) aparece AQUI no
// mapa, não no console: a carga sobe, estoura e recomeça até o alarme de LAÇO
// INFINITO. Errou uma, todas voltam ao começo para a próxima tentativa.
//
// `breakSeal()` é o que abre o caminho: o lacre vermelho da porta do núcleo se
// desfaz (ele é desenhado aqui, por cima da porta pintada no fundo).

const BAR_W = 26;
const BAR_H = 112;
const MAX_SHOWN = 50;            // carga máxima que a coluna mostra (= saída máxima da ficha)
const CYCLE_MS = 260;
const SPIN_CYCLES = 9;           // voltas mostradas de um laço infinito
const RESULT_HOLD_MS = 1500;
const COLORS = {
    frame: 0x1b1d24, edge: 0x0a0b10, fill: 0xff2a4a, fillOk: 0x51e36b,
    mark: 0xffb347, idle: 0x3a1218
};

export default class SealLocks {
    // slots = [{ x, y }] (y = base da coluna, na tela); seal = centro do lacre da porta.
    constructor(scene, slots, seal) {
        this.scene = scene;
        this.locks = slots.map((slot) => this.createLock(slot));
        this.drawSeal(seal);
        this.startIdleLoop();
    }

    createLock({ x, y }) {
        const s = this.scene;
        const top = y - BAR_H - 10;
        const g = s.add.graphics().setDepth(y);
        g.fillStyle(COLORS.frame, 1).fillRect(x - BAR_W / 2 - 6, top - 6, BAR_W + 12, BAR_H + 16);
        g.lineStyle(2, COLORS.edge, 1).strokeRect(x - BAR_W / 2 - 6, top - 6, BAR_W + 12, BAR_H + 16);
        g.fillStyle(0x07080c, 1).fillRect(x - BAR_W / 2, top, BAR_W, BAR_H);
        const fill = s.add.rectangle(x, top + BAR_H, BAR_W - 4, 0, COLORS.idle).setOrigin(0.5, 1).setDepth(y + 1);
        const mark = s.add.rectangle(x, top, BAR_W + 10, 2, COLORS.mark).setDepth(y + 2).setVisible(false);
        const ring = s.add.circle(x, top - 18, 9).setStrokeStyle(3, COLORS.fill).setDepth(y + 2);
        const value = s.add.text(x, top - 36, "", {
            fontFamily: "VCR", fontSize: "14px", color: "#e6ebf5"
        }).setOrigin(0.5).setDepth(y + 3);
        const tag = s.add.text(x, y + 6, "", {
            fontFamily: "VCR", fontSize: "13px", color: "#e6ebf5",
            backgroundColor: "#0a0c12", padding: { x: 3, y: 1 }
        }).setOrigin(0.5, 0).setDepth(y + 3);
        return { x, y, top, fill, mark, ring, value, tag, test: null, right: false };
    }

    // Lacre por cima da porta do núcleo: hexágono vermelho pulsando.
    drawSeal({ x, y }) {
        const s = this.scene;
        this.seal = s.add.container(x, y).setDepth(-3);
        const g = s.add.graphics();
        const pts = Array.from({ length: 6 }, (_, k) => {
            const a = Math.PI / 6 + (k * Math.PI) / 3;
            return new Phaser.Math.Vector2(Math.cos(a) * 46, Math.sin(a) * 46);
        });
        g.fillStyle(0x2a0810, 0.75).fillPoints(pts, true);
        g.lineStyle(3, COLORS.fill, 1).strokePoints(pts, true, true);
        g.lineStyle(2, COLORS.fill, 0.7).strokeCircle(0, 0, 22);
        g.fillStyle(COLORS.fill, 1).fillCircle(0, 0, 6);
        this.seal.add(g);
        this.sealPulse = s.tweens.add({ targets: this.seal, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
    }

    // O laço da ADA, rodando enquanto o puzzle não chega: sobe, estoura, recomeça.
    startIdleLoop() {
        this.idle = this.scene.time.addEvent({
            delay: 120, loop: true, callback: () => {
                this.locks.forEach((lock, i) => {
                    if (lock.test) return;
                    lock.idleV = ((lock.idleV ?? i * 9) + 3) % MAX_SHOWN;
                    this.setLevel(lock, lock.idleV, COLORS.idle);
                });
            }
        });
    }

    setLevel(lock, v, color) {
        const h = Math.max(0, Math.min(BAR_H - 4, ((BAR_H - 4) * v) / MAX_SHOWN));
        lock.fill.setSize(BAR_W - 4, h).setFillStyle(color);
    }

    // Liga as travas que o puzzle usa; a marca é o ponto de abertura (o menor
    // nível final das travas que carregam, o mesmo número do briefing).
    activate(tests) {
        const looped = tests.filter((t) => t.expect.nivel > t.given.nivel).map((t) => t.expect.nivel);
        const ponto = looped.length ? Math.min(...looped) : null;
        tests.forEach((test, i) => {
            const lock = this.locks[i];
            if (!lock) return;
            lock.test = test;
            lock.tag.setText(`${test.label ?? ""}  +${test.given.passo}`);
            if (ponto !== null) {
                lock.mark.setY(lock.top + BAR_H - 2 - ((BAR_H - 4) * ponto) / MAX_SHOWN).setVisible(true);
            }
            this.resetLock(lock);
        });
        // travas sem caso ficam paradas, apagadas
        this.locks.filter((l) => !l.test).forEach((l) => {
            l.tag.setText("OFFLINE").setColor("#5b6178");
            this.setLevel(l, 0, COLORS.idle);
        });
    }

    resetLock(lock) {
        lock.right = false;
        lock.value.setText(String(lock.test.given.nivel)).setColor("#e6ebf5");
        lock.ring.setStrokeStyle(3, COLORS.fill);
        this.setLevel(lock, lock.test.given.nivel, COLORS.fill);
    }

    get active() {
        return this.locks.filter((l) => l.test);
    }

    play(results, done) {
        const locks = this.active;
        const step = (i) => {
            if (i >= locks.length) {
                this.finish(done);
                return;
            }
            this.run(locks[i], results[i], () => step(i + 1));
        };
        this.scene.time.delayedCall(250, () => step(0));
    }

    run(lock, result, next) {
        const s = this.scene;
        const { nivel: start, passo } = lock.test.given;
        if (result?.infinite) {
            this.spinForever(lock, next);
            return;
        }
        const end = Number.isFinite(result?.got?.nivel) ? result.got.nivel : start;
        lock.right = end === lock.test.expect.nivel;
        const dir = end < start ? -1 : 1;
        const cycles = Math.ceil(Math.abs(end - start) / passo);
        let shown = start;
        let k = 0;
        const cycle = () => {
            if (k >= cycles) {
                this.judge(lock, end);
                s.time.delayedCall(260, next);
                return;
            }
            k += 1;
            shown = k >= cycles ? end : shown + dir * passo;
            this.setLevel(lock, shown, COLORS.fill);
            lock.value.setText(String(shown));
            Sfx.play(s, "select", 0.25);
            s.time.delayedCall(CYCLE_MS, cycle);
        };
        if (cycles === 0) {
            s.tweens.add({ targets: lock.value, alpha: 0.2, duration: 150, yoyo: true, repeat: 1 });
            s.time.delayedCall(650, cycle);
            return;
        }
        cycle();
    }

    // O laço que não termina: a carga sobe, estoura e recomeça, cada vez mais
    // rápido, até o alarme. O console não acusa: é aqui que o jogador vê.
    spinForever(lock, next) {
        const s = this.scene;
        const { nivel: start, passo } = lock.test.given;
        lock.right = false;
        let v = start;
        let k = 0;
        const spin = () => {
            if (k >= SPIN_CYCLES) {
                lock.ring.setStrokeStyle(3, 0xff4545);
                lock.value.setText("!!").setColor("#ff4545");
                this.flash(lock, "LAÇO INFINITO", "#ff4545");
                Sfx.play(s, "error", 0.45);
                s.cameras.main.shake(140, 0.003);
                s.time.delayedCall(420, next);
                return;
            }
            k += 1;
            v += passo;
            if (v > MAX_SHOWN || v < 0) {
                v = start;                                         // estourou: recomeça
                Effects.play(s, "fx-spark", lock.x, lock.top + 6, { scale: 0.4, depth: 830 });
            }
            this.setLevel(lock, v, COLORS.fill);
            lock.value.setText(String(v));
            s.time.delayedCall(Math.max(60, CYCLE_MS - k * 22), spin);
        };
        spin();
    }

    judge(lock, end) {
        const s = this.scene;
        if (lock.right) {
            this.setLevel(lock, end, COLORS.fillOk);
            lock.ring.setStrokeStyle(3, COLORS.fillOk);
            lock.value.setColor("#51e36b");
            Sfx.play(s, "confirm", 0.4);
            return;
        }
        Sfx.play(s, "error", 0.4);
        lock.value.setColor("#ff4545");
        if (end > lock.test.expect.nivel) {
            this.flash(lock, "SOBRECARGA", "#ff4545");
            Effects.play(s, "fx-spark", lock.x, lock.top + 10, { scale: 0.5, depth: 830 });
        } else {
            this.flash(lock, "NÃO ABRIU", "#ffb347");
        }
    }

    flash(lock, text, color) {
        const s = this.scene;
        const label = s.add.text(lock.x, lock.top - 56, text, {
            fontFamily: "VCR", fontSize: "14px", color, backgroundColor: "#050505", padding: { x: 4, y: 1 }
        }).setOrigin(0.5).setDepth(900);
        s.time.delayedCall(RESULT_HOLD_MS, () => label.destroy());
    }

    finish(done) {
        if (this.active.every((l) => l.right)) {
            // Resolvido: cada um pulsa em sequência com o tom subindo (game juice).
            Juice.celebrate(this.scene, this.active.map((l) => l.ring), () => done(true));
            return;
        }
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.active.forEach((l) => this.resetLock(l));
            this.scene.time.delayedCall(200, () => done(false));
        });
    }

    // O selo rompe: o lacre da porta pisca, cresce e some.
    breakSeal(onDone) {
        const s = this.scene;
        this.sealPulse?.remove();
        Sfx.play(s, "confirm", 0.5);
        s.cameras.main.flash(300, 255, 42, 74, false);
        s.tweens.add({
            targets: this.seal, scale: 1.6, alpha: 0, duration: 900, ease: "Quad.easeIn",
            onComplete: () => {
                this.seal.setVisible(false);
                onDone?.();
            }
        });
    }

    // Save com a sala resolvida: travas abertas e sem lacre.
    showSolved() {
        this.idle?.remove();
        this.active.forEach((l) => {
            l.right = true;
            this.setLevel(l, l.test.expect.nivel, COLORS.fillOk);
            l.ring.setStrokeStyle(3, COLORS.fillOk);
            l.value.setText(String(l.test.expect.nivel)).setColor("#51e36b");
        });
        this.sealPulse?.remove();
        this.seal.setVisible(false);
    }
}
