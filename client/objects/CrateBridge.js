import Effects from "../ui/Effects";
import Sfx from "../ui/Sfx";
import { makeCrate, flashCrate } from "./crates";

// PUZZLE DE MUNDO (cap. 2): um abismo que só se atravessa por uma ponte de
// CAIXAS. Um guindaste pega as caixas da esteira, uma por vez, e faz com cada
// uma o que o programa do jogador mandar:
//   - `bridgeValue` ("ponte"): encaixa no próximo vão vazio. Caixa FORTE vira
//     chão; caixa FRACA racha, afunda e leva a borda junto — aquele vão se perde.
//   - `discardValue` ("descarte"): vai para o buraco de descarte.
// A ponte só fica inteira se o programa acertar TODAS: fraca no vão deixa um
// buraco, forte no descarte faz falta no fim. O jogador vê onde ficou o buraco.
//
// Cada caixa é um caso de teste (`tests[i]`) e o número de vãos é o de caixas
// que DEVEM ir para a ponte. Caixa mandada para a ponte quando os vãos já estão
// todos ocupados cai em cima do ÚLTIMO: se for fraca, racha junto com ele (um
// programa que manda TUDO para a ponte nunca passa, venha a fraca onde vier na
// esteira — a ordem é livre, o que importa porque os testes podem vir da IA).
// Liga-se a um PuzzleDevice com `onRun: (r, done) => ponte.play(r, done)`.
//
// `x1` (em vez de `x0`) ancora o fosso pela margem DIREITA: como a quantidade de
// vãos muda com os testes, é a margem do lado da saída que fica no lugar.
// Arte da esteira e do compactador: tools/deposito_props.lua.

const SLOT_W = 60;
const ROW_H = 64;
const CRATE = 54;
const LIFT_SCALE = 1.18;       // "erguida": maior = mais perto da câmera
const START_MS = 250;
const LIFT_MS = 140;
const MOVE_MS = 380;
const DROP_MS = 120;
const GAP_MS = 140;            // pausa entre uma caixa e a próxima
const RESULT_HOLD_MS = 1200;   // a ponte furada fica à vista antes de desmontar
const FADE_MS = 220;
const CHUTE = 64;              // colisor da boca do compactador (descarte.png tem 72)

export default class CrateBridge {
    constructor(scene, { x0, x1, y, queue, chute, tests, field, bridgeValue, discardValue, lookOf }) {
        this.scene = scene;
        this.field = field;
        this.bridgeValue = bridgeValue;
        this.discardValue = discardValue;
        this.y = y;
        this.chute = chute;

        const count = tests.filter((test) => test.expect[field] === bridgeValue).length;
        this.x0 = x1 !== undefined ? x1 - count * SLOT_W : x0;
        this.x1 = this.x0 + count * SLOT_W;
        const top = y - ROW_H / 2;
        const bottom = y + ROW_H / 2;
        const b = scene.bounds;

        this.drawChasm(b);
        // O abismo é parede de cima a baixo; na linha da ponte, cada vão é um
        // colisor próprio, que some quando uma caixa forte encaixa ali.
        scene.addColliders([
            { x: this.x0, y: b.y, w: this.x1 - this.x0, h: top - b.y },
            { x: this.x0, y: bottom, w: this.x1 - this.x0, h: b.y + b.h - bottom }
        ]);
        this.slotGraphics = scene.add.graphics().setDepth(-6);
        this.slots = Array.from({ length: count }, (_, k) => ({
            x: this.x0 + k * SLOT_W + SLOT_W / 2,
            state: "vazio",                      // "vazio" | "cheio" | "quebrado"
            collider: scene.addColliders([{ x: this.x0 + k * SLOT_W, y: top, w: SLOT_W, h: ROW_H }])[0]
        }));
        this.drawSlots();

        this.drawConveyor(queue, tests.length);
        this.drawChute();

        this.crates = tests.map((test, i) => {
            const homeX = queue.x;
            const homeY = queue.y0 + i * queue.gap;
            const look = lookOf(test.given);
            const box = makeCrate(scene, homeX, homeY, {
                size: CRATE, kind: look.kind, letter: test.label ?? "", label: look.label ?? "", tag: look.tag
            }).setDepth(homeY + CRATE / 2);
            return { box, homeX, homeY, strong: test.expect[field] === bridgeValue };
        });
    }

    // --- Cenário -------------------------------------------------------------

    // Fosso de concreto: a parede do fundo (de cima) aparece em 3/4, as laterais
    // vão escurecendo para dentro e as margens têm a faixa zebrada.
    drawChasm(b) {
        const g = this.scene.add.graphics().setDepth(-8);
        const w = this.x1 - this.x0;
        const y0 = b.y - 4;
        const h = b.h + 18;
        g.fillStyle(0x020203, 1).fillRect(this.x0, y0, w, h);
        g.fillStyle(0x2a2c32, 1).fillRect(this.x0, y0, w, 26);          // parede do fundo
        g.fillStyle(0x1c1e23, 1).fillRect(this.x0, y0 + 18, w, 8);
        for (let x = this.x0 + 10; x < this.x1; x += 30) {
            g.fillStyle(0x16171b, 1).fillRect(x, y0 + 4, 2, 14);         // juntas da concretagem
        }
        [0.2, 0.12, 0.06].forEach((alpha, k) => {
            g.fillStyle(0x6a6e78, alpha);
            g.fillRect(this.x0 + k * 6, y0, 6, h);
            g.fillRect(this.x1 - (k + 1) * 6, y0, 6, h);
        });
        // Margens: guia de concreto e faixa zebrada.
        g.fillStyle(0x5a5e66, 1).fillRect(this.x0 - 10, y0, 4, h);
        g.fillStyle(0x5a5e66, 1).fillRect(this.x1 + 6, y0, 4, h);
        for (let y = y0; y < y0 + h; y += 12) {
            g.fillStyle(0xe2b01e, 1);
            g.fillRect(this.x0 - 6, y, 6, 6);
            g.fillRect(this.x1, y, 6, 6);
            g.fillStyle(0x121214, 1);
            g.fillRect(this.x0 - 6, y + 6, 6, 6);
            g.fillRect(this.x1, y + 6, 6, 6);
        }
    }

    // Vão vazio = contorno tracejado (é o "encaixe" no mapa). Vão perdido =
    // borda rachada em vermelho. Vão cheio não desenha nada: a caixa é o chão.
    drawSlots() {
        const g = this.slotGraphics;
        const top = this.y - ROW_H / 2;
        g.clear();
        this.slots.forEach((slot) => {
            const left = slot.x - SLOT_W / 2;
            if (slot.state === "vazio") {
                g.lineStyle(2, 0x4ad6ff, 0.55);
                dashedRect(g, left + 4, top + 4, SLOT_W - 8, ROW_H - 8);
            } else if (slot.state === "quebrado") {
                g.lineStyle(2, 0xff4545, 0.9);
                g.strokeRect(left + 4, top + 4, SLOT_W - 8, ROW_H - 8);
                g.lineBetween(left + 12, top + 12, left + SLOT_W - 12, top + ROW_H - 12);
                g.lineBetween(left + SLOT_W - 12, top + 12, left + 12, top + ROW_H - 12);
            }
        });
    }

    // Esteira: um trecho (esteira.png, 64x58) por caixa, emendados.
    drawConveyor(queue, n) {
        const s = this.scene;
        const w = 64;
        const x = queue.x - w / 2;
        const y0 = queue.y0 - queue.gap / 2;
        const y1 = queue.y0 + (n - 1) * queue.gap + queue.gap / 2;
        for (let i = 0; i < n; i += 1) {
            s.add.image(queue.x, queue.y0 + i * queue.gap, "prop-esteira").setDepth(-5);
        }
        const g = s.add.graphics().setDepth(-5);
        g.fillStyle(0x2a2c34, 1).fillRect(x - 2, y0 - 8, w + 4, 8);       // cabeceiras
        g.fillRect(x - 2, y1, w + 4, 8);
        g.lineStyle(2, 0x000000, 1).strokeRect(x - 2, y0 - 8, w + 4, y1 - y0 + 16);
        s.addColliders([{ x, y: y0, w, h: y1 - y0 }]);
    }

    drawChute() {
        const { x, y } = this.chute;
        this.scene.add.image(x, y, "prop-descarte").setDepth(-5);
        this.scene.add.text(x, y + CHUTE / 2 + 16, "DESCARTE", {
            fontFamily: "VCR", fontSize: "13px", color: "#7a8099"
        }).setOrigin(0.5).setDepth(-5);
        this.scene.addColliders([{ x: x - CHUTE / 2, y: y - CHUTE / 2, w: CHUTE, h: CHUTE }]);
    }

    // --- Execução no mapa ----------------------------------------------------

    // Uma caixa de cada vez, na ordem da esteira. `next` = próximo vão vazio.
    play(results, done) {
        let next = 0;
        let i = 0;
        const step = () => {
            if (i >= this.crates.length) {
                this.finish(done);
                return;
            }
            const crate = this.crates[i];
            const dest = results[i]?.got?.[this.field];
            i += 1;
            const after = () => this.scene.time.delayedCall(GAP_MS, step);

            if (dest === this.bridgeValue) {
                if (next < this.slots.length) {
                    const slot = this.slots[next];
                    next += 1;
                    this.carry(crate, slot.x, this.y, () => this.land(crate, slot, after));
                } else {
                    // Todos os vãos já usados: cai em cima do último.
                    const last = this.slots[this.slots.length - 1];
                    this.carry(crate, last.x, this.y, () => this.overload(crate, last, after));
                }
            } else if (dest === this.discardValue) {
                this.carry(crate, this.chute.x, this.chute.y, () => this.fall(crate, after));
            } else {
                this.jam(crate, after);
            }
        };
        this.scene.time.delayedCall(START_MS, step);
    }

    // Guindaste: ergue (cresce), leva e pousa (volta ao tamanho).
    carry(crate, tx, ty, onLanded) {
        const s = this.scene;
        crate.box.setDepth(700);                 // no ar, por cima de tudo
        s.tweens.add({
            targets: crate.box, scale: LIFT_SCALE, duration: LIFT_MS, ease: "Quad.easeOut",
            onComplete: () => s.tweens.add({
                targets: crate.box, x: tx, y: ty, duration: MOVE_MS, ease: "Sine.easeInOut",
                onComplete: () => s.tweens.add({
                    targets: crate.box, scale: 1, duration: DROP_MS, ease: "Quad.easeIn",
                    onComplete: onLanded
                })
            })
        });
    }

    land(crate, slot, next) {
        const s = this.scene;
        if (crate.strong) {
            slot.state = "cheio";
            slot.crate = crate;
            slot.collider.body.enable = false;
            crate.box.setDepth(-3);              // virou chão: a Artemis passa por cima
            Sfx.play(s, "bump", 0.45);
            this.drawSlots();
            next();
            return;
        }
        // Fraca: aguenta um instante, racha e afunda — e o vão fica perdido.
        Sfx.play(s, "bump", 0.8);
        flashCrate(s, crate.box);
        s.tweens.add({
            targets: crate.box, x: slot.x + 3, duration: 45, yoyo: true, repeat: 3,
            onComplete: () => {
                Effects.play(s, "fx-spark", slot.x, this.y, { scale: 0.45, depth: 700 });
                slot.state = "quebrado";
                this.drawSlots();
                this.fall(crate, next);
            }
        });
    }

    // Caixa a mais numa ponte já cheia. Forte, só rola para o fosso; fraca, cede
    // e leva o último vão junto (e a caixa que estava nele).
    overload(crate, slot, next) {
        const s = this.scene;
        if (crate.strong || slot.state !== "cheio") {
            this.fall(crate, next);
            return;
        }
        Sfx.play(s, "bump", 0.8);
        flashCrate(s, crate.box);
        flashCrate(s, slot.crate.box);
        s.cameras.main.shake(140, 0.005);
        Effects.play(s, "fx-spark", slot.x, this.y, { scale: 0.45, depth: 700 });
        const under = slot.crate;
        slot.state = "quebrado";
        slot.crate = null;
        slot.collider.body.enable = true;
        this.drawSlots();
        this.fall(under, () => {});
        this.fall(crate, next);
    }

    fall(crate, next) {
        this.scene.tweens.add({
            targets: crate.box, scale: 0.35, alpha: 0, angle: 25, duration: 380, ease: "Quad.easeIn",
            onComplete: next
        });
    }

    jam(crate, next) {
        flashCrate(this.scene, crate.box);
        this.scene.tweens.add({
            targets: crate.box, x: crate.homeX + 4, duration: 50, yoyo: true, repeat: 3,
            onComplete: next
        });
    }

    // Save com a ponte já montada: as caixas fortes nos vãos, as fracas descartadas.
    showSolved() {
        let k = 0;
        this.crates.forEach((crate) => {
            if (!crate.strong) {
                crate.box.setAlpha(0);
                return;
            }
            const slot = this.slots[k];
            k += 1;
            crate.box.setPosition(slot.x, this.y).setDepth(-3);
            slot.state = "cheio";
            slot.crate = crate;
            slot.collider.body.enable = false;
        });
        this.drawSlots();
    }

    finish(done) {
        if (this.slots.every((slot) => slot.state === "cheio")) {
            done(true);
            return;
        }
        // Errou: a ponte furada fica à vista e depois o guindaste desmonta tudo
        // e devolve as caixas à esteira, para a próxima tentativa começar do zero.
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => this.reset(done));
    }

    reset(done) {
        const s = this.scene;
        const boxes = this.crates.map((crate) => crate.box);
        s.tweens.add({
            targets: boxes, alpha: 0, duration: FADE_MS,
            onComplete: () => {
                this.crates.forEach((crate) => {
                    crate.box.setPosition(crate.homeX, crate.homeY).setScale(1).setAngle(0)
                        .setDepth(crate.homeY + CRATE / 2);
                    crate.box.flash.setAlpha(0);
                });
                this.slots.forEach((slot) => {
                    slot.state = "vazio";
                    slot.crate = null;
                    slot.collider.body.enable = true;
                });
                this.drawSlots();
                s.tweens.add({ targets: boxes, alpha: 1, duration: FADE_MS, onComplete: () => done(false) });
            }
        });
    }
}

// Retângulo tracejado (Graphics não tem traço pontilhado nativo).
function dashedRect(g, x, y, w, h, dash = 8, gap = 6) {
    const side = (x1, y1, x2, y2) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        for (let d = 0; d < len; d += dash + gap) {
            const t0 = d / len;
            const t1 = Math.min(d + dash, len) / len;
            g.lineBetween(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
        }
    };
    side(x, y, x + w, y);
    side(x + w, y, x + w, y + h);
    side(x + w, y + h, x, y + h);
    side(x, y + h, x, y);
}
