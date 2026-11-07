import Sfx from "../ui/Sfx";
import Effects from "../ui/Effects";

// PUZZLE DE MUNDO da linha de montagem (cap. 3, `repita`): cada caso de teste é
// um MOLDE na esteira, uma grade de `vao` colunas por `faixas` fileiras de
// encaixes, com o tamanho escrito nele. O mapa é gerado a partir dos `tests`.
//
// Ao rodar, cada molde vai até a prensa, que bate UMA PLACA POR VEZ — o laço do
// programa virando movimento: o jogador vê o `repita` acontecer. Molde cheio na
// medida acende verde; faltou placa, os buracos ficam vermelhos; sobrou, a
// prensa trava em faíscas. Errou um, todos voltam vazios (como o CrateCorridor:
// a próxima tentativa testa tudo de novo).
//
// `buildBridge()` é o que abre o caminho: os moldes cheios voam para o fosso e
// viram a ponte.

const CELL = 14;
const PAD = 5;
const STAMP_MS = 150;         // uma placa (a prensa desce e sobe)
const TRAVEL_MS = 380;
const RESULT_HOLD_MS = 1300;
const MAX_EXTRA = 4;          // placas a mais mostradas antes de travar
const COLORS = {
    frame: 0x3a3f4c, frameLight: 0x6a7186, hole: 0x101218,
    plate: 0xb8c0d0, plateLight: 0xe6ebf5, ok: 0x51e36b, bad: 0xff4545, red: 0xff2a4a
};

export default class AssemblyLine {
    // press = { x, y } (onde a prensa bate, tela); slots = x de cada molde na
    // esteira; beltY = linha da esteira; field = saída do programa ("placas").
    constructor(scene, { press, slots, beltY, tests, field = "placas" }) {
        this.scene = scene;
        this.press = press;
        this.beltY = beltY;
        this.field = field;

        this.drawPress();
        this.molds = tests.map((test, i) => this.createMold(test, slots[i]));
    }

    // Prensa: dois pilares, a viga e a cabeça que desce (só a cabeça anima).
    drawPress() {
        const s = this.scene;
        const { x, y } = this.press;
        const base = s.add.graphics().setDepth(y - 30);
        base.fillStyle(0x23262f, 1).fillRect(x - 46, y - 118, 12, 104).fillRect(x + 34, y - 118, 12, 104);
        base.fillStyle(0x2f3340, 1).fillRect(x - 52, y - 126, 104, 16);
        base.fillStyle(COLORS.red, 1).fillRect(x - 40, y - 122, 80, 3);
        base.lineStyle(2, 0x0a0b10, 1).strokeRect(x - 52, y - 126, 104, 16);
        this.pressHead = s.add.container(x, y - 100).setDepth(y + 40);
        const head = s.add.graphics();
        head.fillStyle(0x4a505e, 1).fillRect(-30, -14, 60, 22);
        head.fillStyle(0x7a8294, 1).fillRect(-30, -14, 60, 4);
        head.fillStyle(0x1a1c22, 1).fillRect(-6, -30, 12, 16);
        head.lineStyle(2, 0x0a0b10, 1).strokeRect(-30, -14, 60, 22);
        this.pressLight = s.add.circle(0, -3, 3, COLORS.red);
        this.pressHead.add([head, this.pressLight]);
        this.pressRestY = y - 100;
    }

    createMold(test, x) {
        const s = this.scene;
        const { vao, faixas } = test.given;
        const w = vao * CELL + PAD * 2;
        const h = faixas * CELL + PAD * 2;
        const c = s.add.container(x, this.beltY).setDepth(this.beltY + 20);
        const frame = s.add.graphics();
        frame.fillStyle(COLORS.frame, 1).fillRect(-w / 2, -h / 2, w, h);
        frame.lineStyle(2, COLORS.frameLight, 1).strokeRect(-w / 2, -h / 2, w, h);
        const cells = [];
        // Ordem de enchimento = a do programa: coluna por coluna (cada volta do
        // laço é uma batida), fileira por fileira dentro dela.
        for (let col = 0; col < vao; col += 1) {
            for (let row = 0; row < faixas; row += 1) {
                const cx = -w / 2 + PAD + col * CELL + CELL / 2;
                const cy = -h / 2 + PAD + row * CELL + CELL / 2;
                const hole = s.add.rectangle(cx, cy, CELL - 3, CELL - 3, COLORS.hole);
                const plate = s.add.rectangle(cx, cy, CELL - 3, CELL - 3, COLORS.plate)
                    .setStrokeStyle(1, COLORS.plateLight).setVisible(false);
                cells.push({ hole, plate });
            }
        }
        const tag = s.add.text(0, -h / 2 - 6, `${test.label ?? ""} ${vao}x${faixas}`, {
            fontFamily: "VCR", fontSize: "13px", color: "#e6ebf5",
            backgroundColor: "#0a0c12", padding: { x: 3, y: 1 }
        }).setOrigin(0.5, 1);
        c.add([frame, ...cells.flatMap((k) => [k.hole, k.plate]), tag]);
        return { c, home: x, w, h, cells, expect: test.expect[this.field], right: false };
    }

    // Executa o programa no mapa: um molde de cada vez, na ordem da esteira.
    play(results, done) {
        const step = (i) => {
            if (i >= this.molds.length) {
                this.finish(done);
                return;
            }
            this.run(this.molds[i], results[i]?.got?.[this.field], () => step(i + 1));
        };
        this.scene.time.delayedCall(250, () => step(0));
    }

    run(mold, value, next) {
        const s = this.scene;
        const count = Number.isInteger(value) && value >= 0 ? value : 0;
        mold.right = count === mold.expect;
        s.tweens.add({
            targets: mold.c, x: this.press.x, duration: TRAVEL_MS, ease: "Sine.easeInOut",
            onComplete: () => this.stamp(mold, count, 0, () => {
                s.time.delayedCall(220, () => s.tweens.add({
                    targets: mold.c, x: mold.home, duration: TRAVEL_MS, ease: "Sine.easeInOut", onComplete: next
                }));
            })
        });
    }

    // Uma placa por batida, até `count`. Passou do molde: a prensa trava.
    stamp(mold, count, k, done) {
        const s = this.scene;
        if (k >= count || k >= mold.cells.length + MAX_EXTRA) {
            this.judge(mold, count);
            done();
            return;
        }
        s.tweens.add({
            targets: this.pressHead, y: this.beltY - 18, duration: STAMP_MS / 2, ease: "Quad.easeIn", yoyo: true,
            onYoyo: () => {
                const cell = mold.cells[k];
                if (cell) {
                    cell.plate.setVisible(true);
                    Sfx.play(s, "select", 0.35);
                } else {
                    // Placa sem encaixe: bate em cima do molde cheio.
                    Effects.play(s, "fx-spark", this.press.x, this.beltY - 6, { scale: 0.5, depth: 830 }).setTint(COLORS.red);
                    s.cameras.main.shake(70, 0.002);
                    Sfx.play(s, "error", 0.4);
                }
            },
            onComplete: () => this.stamp(mold, count, k + 1, done)
        });
    }

    judge(mold, count) {
        const s = this.scene;
        if (mold.right) {
            mold.cells.forEach((cell) => cell.plate.setFillStyle(COLORS.ok));
            this.pressLight.setFillStyle(COLORS.ok);
            Sfx.play(s, "confirm", 0.4);
            return;
        }
        this.pressLight.setFillStyle(COLORS.bad);
        if (count > mold.cells.length) {
            mold.cells.forEach((cell) => cell.plate.setFillStyle(COLORS.bad));
            const jam = s.add.text(this.press.x, this.beltY - 60, "TRAVOU", {
                fontFamily: "VCR", fontSize: "14px", color: "#ff4545", backgroundColor: "#050505", padding: { x: 4, y: 1 }
            }).setOrigin(0.5).setDepth(900);
            s.time.delayedCall(RESULT_HOLD_MS, () => jam.destroy());
        } else {
            mold.cells.slice(count).forEach((cell) => cell.hole.setFillStyle(COLORS.bad));
        }
    }

    finish(done) {
        if (this.molds.every((m) => m.right)) {
            done(true);
            return;
        }
        // Errou: os moldes voltam vazios para a próxima tentativa testar todos.
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.reset();
            this.scene.time.delayedCall(200, () => done(false));
        });
    }

    reset() {
        this.pressLight.setFillStyle(COLORS.red);
        this.molds.forEach((m) => {
            m.right = false;
            m.cells.forEach((cell) => {
                cell.plate.setVisible(false).setFillStyle(COLORS.plate);
                cell.hole.setFillStyle(COLORS.hole);
            });
        });
    }

    // A linha certa: os moldes cheios voam para o fosso e viram a ponte, uma
    // tábua por molde, empilhadas de cima para baixo dentro de `rect`.
    buildBridge(rect, onDone) {
        const s = this.scene;
        const plank = rect.h / this.molds.length;
        this.molds.forEach((m, i) => {
            m.cells.forEach((cell) => cell.plate.setVisible(true).setFillStyle(COLORS.plate));
            s.time.delayedCall(i * 260, () => {
                const ty = rect.y + plank * i + plank / 2;
                s.tweens.add({
                    targets: m.c, x: rect.x + rect.w / 2, y: ty, scaleX: rect.w / m.w, scaleY: plank / m.h,
                    duration: 520, ease: "Back.easeIn",
                    onUpdate: () => m.c.setDepth(m.c.y - 40),
                    onComplete: () => {
                        m.c.list.filter((o) => o.type === "Text").forEach((t) => t.setVisible(false));
                        m.c.setDepth(-2);
                        Effects.play(s, "fx-impact", rect.x + rect.w / 2, ty, { scale: 0.9, depth: 830 });
                        Sfx.play(s, "bump", 0.5);
                        if (i === this.molds.length - 1) onDone?.();
                    }
                });
            });
        });
    }

    // Save com a linha resolvida: a ponte já montada.
    showSolved(rect) {
        const plank = rect.h / this.molds.length;
        this.molds.forEach((m, i) => {
            m.cells.forEach((cell) => cell.plate.setVisible(true));
            m.c.list.filter((o) => o.type === "Text").forEach((t) => t.setVisible(false));
            m.c.setPosition(rect.x + rect.w / 2, rect.y + plank * i + plank / 2)
                .setScale(rect.w / m.w, plank / m.h).setDepth(-2);
        });
    }
}

// Exportado para a cena posicionar a esteira sem repetir as contas.
AssemblyLine.moldWidth = (vao) => vao * CELL + PAD * 2;
