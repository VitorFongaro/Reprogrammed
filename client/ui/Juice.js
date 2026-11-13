import Phaser from "phaser";
import Sfx from "./Sfx";

// GAME JUICE: os efeitos de resposta que dão PESO a uma ação sem mudar regra
// nenhuma (congelar o quadro no golpe, amassar a peça que encaixa, o número de
// dano saltando, a comemoração em sequência do puzzle resolvido). Tudo aqui é
// desenhado no código, sem asset: dá para usar em qualquer cena sem preload.
//
// Usam: o encaixe dos consoles de blocos, o [F] das salas, o ATACAR da batalha
// e os puzzles de mundo (celebrate). As barras de HP têm o próprio arquivo
// (ui/HpMeter.js).

const HITSTOP_MS = 70;
const CELEBRATE_STEP_MS = 130;     // intervalo entre um objeto e o próximo
const CELEBRATE_DETUNE = 200;      // o tom sobe 2 semitons a cada acerto
const CELEBRATE_TAIL_MS = 260;     // folga depois do último antes de seguir

const Juice = {
    // HITSTOP: congela física e tweens por um instante (tempo REAL,
    // por setTimeout, porque o relógio da cena é justamente o que para). O
    // estado anterior é devolvido só se ainda for o que deixamos — se algo mudou
    // a escala do tempo nesse meio (o modo [R]), ele vence.
    hitStop(scene, ms = HITSTOP_MS) {
        if (scene.juiceFrozen) return;
        scene.juiceFrozen = true;
        const world = scene.physics?.world;
        const froze = world && !world.isPaused;
        if (froze) world.pause();
        const tweenScale = scene.tweens.timeScale;
        scene.tweens.timeScale = 0;
        window.setTimeout(() => {
            scene.juiceFrozen = false;
            if (scene.tweens && scene.tweens.timeScale === 0) scene.tweens.timeScale = tweenScale;
            if (froze && scene.physics?.world === world && world.isPaused) world.resume();
        }, ms);
    },

    // Escala de "soco": cresce e volta à escala que o objeto tinha.
    punch(scene, target, amount = 1.15, ms = 90) {
        if (!target?.active) return;
        if (target.juiceBase === undefined) {
            target.juiceBase = { x: target.scaleX, y: target.scaleY };
        }
        const base = target.juiceBase;
        scene.tweens.add({
            targets: target,
            scaleX: base.x * amount,
            scaleY: base.y * amount,
            duration: ms,
            yoyo: true,
            ease: "Quad.easeOut",
            onComplete: () => { if (target.active) target.setScale(base.x, base.y); }
        });
    },

    // Faísca de impacto: clarão que abre e lascas voando para fora.
    impact(scene, x, y, { color = 0xffffff, size = 1, depth = 830 } = {}) {
        const flash = scene.add.circle(x, y, 10 * size, color, 0.9).setDepth(depth);
        scene.tweens.add({
            targets: flash, scale: 2.2, alpha: 0, duration: 160, ease: "Quad.easeOut",
            onComplete: () => flash.destroy()
        });
        const shards = 6;
        for (let k = 0; k < shards; k += 1) {
            const angle = (k / shards) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
            const dist = Phaser.Math.Between(18, 30) * size;
            const shard = scene.add.rectangle(x, y, 6 * size, 2 * size, color, 1)
                .setRotation(angle).setDepth(depth);
            scene.tweens.add({
                targets: shard,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                scaleX: 0.2,
                alpha: 0,
                duration: 220,
                ease: "Quad.easeOut",
                onComplete: () => shard.destroy()
            });
        }
    },

    // Anel que abre e some (marca um acerto num ponto do mapa).
    ring(scene, x, y, { color = 0x51e36b, radius = 18, depth = 830 } = {}) {
        const ring = scene.add.circle(x, y, radius).setStrokeStyle(3, color, 1).setDepth(depth);
        scene.tweens.add({
            targets: ring, scale: 2, alpha: 0, duration: 320, ease: "Quad.easeOut",
            onComplete: () => ring.destroy()
        });
    },

    // Número/texto que SALTA (nasce grande, assenta) e depois sobe sumindo.
    popText(scene, x, y, text, { color = "#ffffff", size = 34, depth = 900 } = {}) {
        const label = scene.add.text(x, y, text, {
            fontFamily: "VCR", fontSize: `${size}px`, color,
            stroke: "#050505", strokeThickness: 5
        }).setOrigin(0.5).setDepth(depth).setScale(1.7);
        scene.tweens.add({ targets: label, scale: 1, duration: 140, ease: "Back.easeOut" });
        scene.tweens.add({
            targets: label, y: y - 46, alpha: 0, delay: 520, duration: 520, ease: "Quad.easeIn",
            onComplete: () => label.destroy()
        });
        return label;
    },

    // Comemoração do puzzle de mundo resolvido: cada objeto pulsa em sequência,
    // com um anel verde e o tom SUBINDO a cada um (como um combo). `onDone` vem
    // depois do último, para a sala seguir com o diálogo/porta.
    celebrate(scene, targets, onDone, { amount = 1.15 } = {}) {
        const list = targets.filter((t) => t?.active);
        list.forEach((target, i) => {
            scene.time.delayedCall(i * CELEBRATE_STEP_MS, () => {
                Juice.punch(scene, target, amount, 110);
                const b = target.getBounds();
                Juice.ring(scene, b.centerX, b.centerY, { radius: Math.min(28, Math.max(14, b.height / 3)) });
                Sfx.play(scene, "select", 0.5, { detune: i * CELEBRATE_DETUNE });
            });
        });
        scene.time.delayedCall(list.length * CELEBRATE_STEP_MS + CELEBRATE_TAIL_MS, () => onDone?.());
    }
};

export default Juice;
