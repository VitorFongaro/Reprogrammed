import Phaser from "phaser";
import Sfx from "../ui/Sfx";
import Juice from "../ui/Juice";
import Effects from "../ui/Effects";

// PUZZLE DE MUNDO da refrigeração (cap. 3, `enquanto`): cada caso de teste é um
// RACK de servidor encostado na parede, com a temperatura no visor e a potência
// do resfriador (`passo`, graus por ciclo) na plaquinha. O mapa é gerado a partir
// dos `tests`.
//
// Ao rodar, cada rack liga o resfriador em CICLOS: a ventoinha gira, o visor cai
// `passo` graus — uma volta do laço por ciclo, então o jogador vê o `enquanto`
// acontecer, inclusive o rack que já estava frio e não roda nenhuma vez. Parou no
// ponto = visor verde; parou cedo = continua fervendo; passou do ponto = congela.
// Errou um, todos voltam à temperatura de antes (a próxima tentativa testa tudo).
//
// Os racks ficam em posições FIXAS (`slots`): a sala cria todos já na entrada,
// desligados, para os colisores existirem antes de a IA responder; `activate`
// liga os que o puzzle usa. Rack sem caso fica "OFFLINE".
//
// `SteamDuct` (abaixo) é a grade do piso cuspindo o calor dos racks: um colisor
// enquanto houver vapor. É ela que dá sentido ao puzzle abrir caminho.

const RACK_W = 60;
const RACK_H = 104;
const CYCLE_MS = 300;
const RESULT_HOLD_MS = 1400;
const MAX_CYCLES = 14;            // ciclos mostrados antes de pular para o fim
const COLORS = {
    body: 0x1b1d24, bodyLight: 0x3a3f4c, edge: 0x0a0b10,
    screen: 0x07080c, led: 0xff2a4a, ledOff: 0x3a1218, ledOk: 0x51e36b,
    hot: "#ff4545", ok: "#51e36b", cold: "#9fe3ff", idle: "#5b6178"
};

export default class CoolingRacks {
    // slots = [{ x, y }] (y = base do rack, na tela).
    constructor(scene, slots) {
        this.scene = scene;
        this.racks = slots.map((slot) => this.createRack(slot));
    }

    createRack({ x, y }) {
        const s = this.scene;
        const c = s.add.container(x, y).setDepth(y);
        const g = s.add.graphics();
        const top = -RACK_H;
        g.fillStyle(COLORS.body, 1).fillRect(-RACK_W / 2, top, RACK_W, RACK_H);
        g.fillStyle(COLORS.bodyLight, 1).fillRect(-RACK_W / 2, top, RACK_W, 3);
        g.lineStyle(2, COLORS.edge, 1).strokeRect(-RACK_W / 2, top, RACK_W, RACK_H);
        // visor
        g.fillStyle(COLORS.screen, 1).fillRect(-24, top + 8, 48, 22);
        g.lineStyle(1, COLORS.bodyLight, 1).strokeRect(-24, top + 8, 48, 22);
        // gavetas de servidor
        for (let k = 0; k < 4; k += 1) {
            const gy = top + 36 + k * 11;
            g.fillStyle(0x23262f, 1).fillRect(-24, gy, 48, 8);
            g.fillStyle(0x0f1015, 1).fillRect(-20, gy + 3, 26, 2);
        }
        // grade da ventoinha
        g.fillStyle(0x0f1015, 1).fillCircle(0, -16, 12);
        g.lineStyle(2, COLORS.bodyLight, 1).strokeCircle(0, -16, 12);
        const leds = [0, 1, 2, 3].map((k) => s.add.rectangle(14, top + 40 + k * 11, 3, 3, COLORS.ledOff));
        const fan = s.add.graphics({ x: 0, y: -16 });
        fan.fillStyle(0x6a7186, 1);
        for (let k = 0; k < 3; k += 1) {
            const a = (k * Math.PI * 2) / 3;
            fan.fillTriangle(0, 0, Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a + 0.7) * 10, Math.sin(a + 0.7) * 10);
        }
        fan.fillStyle(0x1b1d24, 1).fillCircle(0, 0, 3);
        const display = s.add.text(0, top + 19, "--", {
            fontFamily: "VCR", fontSize: "18px", color: COLORS.idle
        }).setOrigin(0.5);
        const tag = s.add.text(0, 12, "OFFLINE", {
            fontFamily: "VCR", fontSize: "13px", color: "#5b6178",
            backgroundColor: "#0a0c12", padding: { x: 3, y: 1 }
        }).setOrigin(0.5, 0);
        const frost = s.add.rectangle(0, top + RACK_H / 2, RACK_W, RACK_H, 0xbfe9ff, 0).setStrokeStyle(2, 0xe6f7ff, 0);
        c.add([g, ...leds, fan, display, tag, frost]);
        return { c, x, y, leds, fan, display, tag, frost, test: null, steam: null };
    }

    // Liga os racks que o puzzle usa, da esquerda para a direita.
    activate(tests) {
        tests.forEach((test, i) => {
            const rack = this.racks[i];
            if (!rack) return;
            rack.test = test;
            rack.tag.setText(`${test.label ?? ""}  -${test.given.passo}/ciclo`).setColor("#e6ebf5");
            this.setHot(rack, test.given.temp);
        });
    }

    get active() {
        return this.racks.filter((r) => r.test);
    }

    // Rack fervendo: visor vermelho e um fiapo de vapor saindo de cima.
    setHot(rack, temp) {
        rack.display.setText(`${temp}°`).setColor(COLORS.hot);
        rack.frost.setFillStyle(0xbfe9ff, 0).setStrokeStyle(2, 0xe6f7ff, 0);
        this.setLeds(rack, true);
        this.startSteam(rack);
    }

    // LEDs do rack: vermelhos piscando enquanto ele ferve, verdes e acesos no
    // ponto (antes o rack resolvido, inclusive o carregado do save, seguia em alarme).
    setLeds(rack, hot) {
        rack.leds.forEach((led, k) => {
            this.scene.tweens.killTweensOf(led);
            led.setAlpha(1).setFillStyle(hot ? COLORS.led : COLORS.ledOk);
            if (hot) {
                this.scene.tweens.add({ targets: led, alpha: 0.3, duration: 260 + k * 90, yoyo: true, repeat: -1 });
            }
        });
    }

    startSteam(rack) {
        if (rack.steam) return;
        const s = this.scene;
        rack.steam = s.time.addEvent({
            delay: 420, loop: true, callback: () => {
                const puff = s.add.circle(rack.x + Phaser.Math.Between(-18, 18), rack.y - RACK_H - 4, Phaser.Math.Between(4, 7), 0xd9d9e0, 0.35)
                    .setDepth(rack.y + 1);
                s.tweens.add({
                    targets: puff, y: puff.y - 34, scale: 2, alpha: 0, duration: 1100,
                    onComplete: () => puff.destroy()
                });
            }
        });
    }

    stopSteam(rack) {
        rack.steam?.remove();
        rack.steam = null;
    }

    // Executa o programa no mapa: um rack de cada vez.
    play(results, done) {
        const racks = this.active;
        const step = (i) => {
            if (i >= racks.length) {
                this.finish(done);
                return;
            }
            this.run(racks[i], results[i]?.got?.temp, () => step(i + 1));
        };
        this.scene.time.delayedCall(250, () => step(0));
    }

    run(rack, value, next) {
        const s = this.scene;
        const { temp: start, passo } = rack.test.given;
        const end = Number.isFinite(value) ? value : start;
        rack.right = end === rack.test.expect.temp;
        // Um ciclo por volta do laço; se o programa fez algo estranho (não tirou
        // o passo), a animação só anda em passos de `passo` até o valor final.
        const dir = end < start ? -1 : 1;
        const cycles = Math.ceil(Math.abs(end - start) / passo);
        let shown = start;
        let k = 0;
        const cycle = () => {
            if (k >= cycles) {
                this.judge(rack, end);
                s.time.delayedCall(260, next);
                return;
            }
            k += 1;
            // Laço comprido: depois de MAX_CYCLES, o resto vai de uma vez.
            shown = k >= cycles || k >= MAX_CYCLES ? end : shown + dir * passo;
            if (k >= MAX_CYCLES) k = cycles;
            s.tweens.add({ targets: rack.fan, angle: rack.fan.angle + 240, duration: CYCLE_MS * 0.85, ease: "Sine.easeInOut" });
            rack.display.setText(`${shown}°`);
            const delta = s.add.text(rack.x + 22, rack.y - RACK_H + 4, `-${passo}`, {
                fontFamily: "VCR", fontSize: "13px", color: "#9fe3ff"
            }).setOrigin(0, 0.5).setDepth(820);
            s.tweens.add({ targets: delta, y: delta.y - 14, alpha: 0, duration: CYCLE_MS * 1.6, onComplete: () => delta.destroy() });
            Sfx.play(s, "select", 0.25);
            s.time.delayedCall(CYCLE_MS, cycle);
        };
        // Rack que já está no ponto: o laço não roda, o visor só pisca.
        if (cycles === 0) {
            s.tweens.add({ targets: rack.display, alpha: 0.2, duration: 160, yoyo: true, repeat: 1 });
            s.time.delayedCall(700, cycle);
            return;
        }
        cycle();
    }

    judge(rack, end) {
        const s = this.scene;
        const expect = rack.test.expect.temp;
        if (rack.right) {
            rack.display.setColor(COLORS.ok);
            this.setLeds(rack, false);
            this.stopSteam(rack);
            Sfx.play(s, "confirm", 0.4);
            return;
        }
        if (end > expect) {
            // Parou cedo: continua quente.
            rack.display.setColor(COLORS.hot);
            this.flash(rack, "QUENTE", COLORS.hot);
            Effects.play(s, "fx-spark", rack.x, rack.y - RACK_H + 18, { scale: 0.5, depth: 830 });
            Sfx.play(s, "error", 0.4);
            return;
        }
        // Passou do ponto: congela.
        this.stopSteam(rack);
        rack.display.setColor(COLORS.cold);
        rack.frost.setFillStyle(0xbfe9ff, 0.35).setStrokeStyle(2, 0xe6f7ff, 0.9);
        this.flash(rack, "CONGELOU", COLORS.cold);
        Sfx.play(s, "error", 0.4);
    }

    flash(rack, text, color) {
        const s = this.scene;
        const label = s.add.text(rack.x, rack.y - RACK_H - 20, text, {
            fontFamily: "VCR", fontSize: "14px", color, backgroundColor: "#050505", padding: { x: 4, y: 1 }
        }).setOrigin(0.5).setDepth(900);
        s.time.delayedCall(RESULT_HOLD_MS, () => label.destroy());
    }

    finish(done) {
        if (this.active.every((r) => r.right)) {
            // Resolvido: cada um pulsa em sequência com o tom subindo (game juice).
            Juice.celebrate(this.scene, this.active.map((r) => r.c), () => done(true), { amount: 1.08 });
            return;
        }
        // Errou: os racks voltam a esquentar para a próxima tentativa testar todos.
        this.scene.time.delayedCall(RESULT_HOLD_MS, () => {
            this.active.forEach((r) => {
                r.right = false;
                this.setHot(r, r.test.given.temp);
            });
            this.scene.time.delayedCall(200, () => done(false));
        });
    }

    // Save com a sala resolvida: todos estáveis.
    showSolved() {
        this.active.forEach((r) => {
            r.display.setText(`${r.test.expect.temp}°`).setColor(COLORS.ok);
            this.setLeds(r, false);
            this.stopSteam(r);
        });
    }
}

// A grade de exaustão do piso cuspindo o calor dos racks: vapor subindo de cima
// a baixo da fenda e um COLISOR enquanto ele existir.
export class SteamDuct {
    // area = retângulo de tela da grade.
    constructor(scene, area) {
        this.scene = scene;
        this.area = area;
        this.active = true;
        this.puffs = scene.add.container(0, 0).setDepth(700);
        this.timer = scene.time.addEvent({
            delay: 60, loop: true, callback: () => this.puff()
        });
        [this.collider] = scene.addColliders([area]);
    }

    puff() {
        const s = this.scene;
        const { x, y, w, h } = this.area;
        const hot = Math.random() < 0.3;
        const p = s.add.circle(
            x + Phaser.Math.Between(4, w - 4), y + Phaser.Math.Between(0, h),
            Phaser.Math.Between(6, 13), hot ? 0xff6a6a : 0xe6e6ee, hot ? 0.28 : 0.22
        );
        this.puffs.add(p);
        s.tweens.add({
            targets: p, y: p.y - Phaser.Math.Between(30, 60), x: p.x + Phaser.Math.Between(-14, 14),
            scale: 2.2, alpha: 0, duration: Phaser.Math.Between(700, 1200),
            onComplete: () => p.destroy()
        });
    }

    // O calor parou de chegar: o vapor some e o caminho abre.
    stop(onDone) {
        if (!this.active) {
            onDone?.();
            return;
        }
        this.active = false;
        this.timer.remove();
        this.collider.body.enable = false;
        Sfx.play(this.scene, "confirm", 0.4);
        this.scene.time.delayedCall(1300, () => onDone?.());
    }

    // Save com a sala resolvida: sem vapor desde a entrada.
    clear() {
        this.active = false;
        this.timer.remove();
        this.collider.body.enable = false;
    }
}
