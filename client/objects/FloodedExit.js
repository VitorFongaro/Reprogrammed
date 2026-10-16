import Phaser from "phaser";
import Effects from "../ui/Effects";
import Sfx from "../ui/Sfx";

// A SAÍDA ALAGADA do jardim de inverno: é o que dá SENTIDO ao puzzle da
// irrigação abrir caminho. A irrigação quebrada rega tudo sem parar, a água
// transborda dos canteiros e empoça na frente da porta — e tem um cabo de força
// caído dentro da poça, faiscando. A Artemis é uma androide: não atravessa.
// Com a regra certa a água para de sobrar, o ralo dá conta, a poça seca e o
// cabo para de faiscar (sem água, sem curto).
//
// A poça é um COLISOR enquanto existe, desenhada no código (nada de arte nova:
// água translúcida + ondinhas), com as faíscas do pack de efeitos.

const WATER = 0x2c5f94;
const WATER_HI = 0x82beec;
const SPARK_MS = [500, 1300];      // intervalo entre faíscas (sorteado)
const DRAIN_MS = 2200;

export default class FloodedExit {
    // `area` = retângulo de TELA que a poça cobre (encostado na parede da porta);
    // `cable` = de onde o cabo cai (na parede) até onde a ponta dele fica.
    constructor(scene, { area, cable, leak }) {
        this.scene = scene;
        this.area = area;
        this.cableTip = cable.tip;
        this.active = true;

        this.water = scene.add.container(0, 0).setDepth(-3);
        const g = scene.add.graphics();
        // Contorno irregular: várias elipses sobrepostas, mais fundas no meio.
        const rng = new Phaser.Math.RandomDataGenerator(["jardim"]);
        const cx = area.x + area.w / 2;
        const cy = area.y + area.h / 2;
        g.fillStyle(WATER, 0.42);
        for (let k = 0; k < 9; k += 1) {
            g.fillEllipse(
                cx + rng.between(-area.w / 3, area.w / 3),
                cy + rng.between(-area.h / 3, area.h / 3),
                rng.between(area.w * 0.5, area.w * 0.8),
                rng.between(area.h * 0.45, area.h * 0.7)
            );
        }
        g.fillStyle(WATER, 0.35).fillEllipse(cx, cy, area.w * 0.7, area.h * 0.6);
        this.water.add(g);

        // Ondinhas que pulsam (a água está correndo, não parada).
        this.ripples = [0, 1, 2].map((k) => {
            const ring = scene.add.ellipse(cx + (k - 1) * area.w * 0.22, cy + (k % 2 ? -10 : 14), 30, 10)
                .setStrokeStyle(1, WATER_HI, 0.7);
            this.water.add(ring);
            scene.tweens.add({
                targets: ring, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 1500,
                delay: k * 480, repeat: -1
            });
            return ring;
        });

        // Cabo de força caído da parede, com a ponta descascada na água.
        this.cable = scene.add.graphics().setDepth(-2);
        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(cable.from.x, cable.from.y),
            new Phaser.Math.Vector2(cable.from.x - 10, cable.tip.y + 10),
            new Phaser.Math.Vector2(cable.tip.x, cable.tip.y)
        );
        this.cable.lineStyle(4, 0x0a0b0e, 1);
        curve.draw(this.cable);
        this.cable.lineStyle(2, 0x2a2d36, 1);
        curve.draw(this.cable);
        this.cable.fillStyle(0xc47c4a, 1).fillRect(cable.tip.x - 3, cable.tip.y - 2, 6, 4);

        // Pingos do cano que transbordou caindo na poça.
        this.drip = scene.time.addEvent({
            delay: 240, loop: true, callback: () => {
                const drop = scene.add.rectangle(leak.x + rng.between(-3, 3), leak.y, 2, 4, WATER_HI).setDepth(-2);
                scene.tweens.add({
                    targets: drop, y: area.y + 18, duration: 380, ease: "Quad.easeIn",
                    onComplete: () => drop.destroy()
                });
            }
        });

        [this.collider] = scene.addColliders([area]);
        this.scheduleSpark();
    }

    scheduleSpark() {
        this.sparkTimer = this.scene.time.delayedCall(Phaser.Math.Between(...SPARK_MS), () => {
            if (!this.active) return;
            Effects.play(this.scene, "fx-spark", this.cableTip.x + Phaser.Math.Between(-10, 10),
                this.cableTip.y + Phaser.Math.Between(-6, 4), { scale: 0.3, depth: 700 });
            this.scheduleSpark();
        });
    }

    // A regra certa entrou: para de pingar, a poça seca e o caminho abre.
    drain(onDone) {
        if (!this.active) {
            onDone?.();
            return;
        }
        this.active = false;
        this.drip.remove();
        this.sparkTimer?.remove();
        Sfx.play(this.scene, "confirm", 0.4);
        this.scene.tweens.add({
            targets: this.water, alpha: 0, duration: DRAIN_MS, ease: "Sine.easeIn",
            onComplete: () => {
                this.scene.tweens.killTweensOf(this.ripples);
                this.water.destroy(true);
                this.collider.body.enable = false;
                onDone?.();
            }
        });
    }
}
