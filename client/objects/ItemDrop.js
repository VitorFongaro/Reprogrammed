import Phaser from "phaser";
import { itemDef } from "../data/items";
import { addItem } from "../state/inventory";
import Sfx from "../ui/Sfx";
import { hudPx } from "../state/hud";

// DROP de inimigo: robô neutralizado às vezes larga uma peça de CURA no chão.
// A Artemis pega passando por cima; o item entra no inventário e o nome sobe
// em cima dela (item que o jogador não vê entrar é item que ele nunca usa).
//
// Só cura: melhoria (o Cache, os chips) é do boss de capítulo e os de combate ficam raros de
// propósito. A tabela é por PESO; `DROP_CHANCE` é a chance de cair alguma coisa.
// Não entra no save: drop deixado para trás some com a sala.
//
// DESTAQUE (estilo Hades / Resident Evil): o item SALTA do robô num arco e
// quica, fica de pé dentro de um FEIXE DE LUZ na cor da raridade, com faíscas
// subindo e um REFLEXO que pisca de tempos em tempos (o brilho dos itens do
// Resident Evil). Perto dela, o nome aparece; mais perto, o item vem até ela.
// Tudo desenhado no código (texturas geradas uma vez por cena).

const DROP_CHANCE = 0.45;
// `tier` = raridade, que escolhe a cor do feixe. A mais rara é a mais vistosa.
const DROP_TABLE = [
    { id: "pente-ram", weight: 60, tier: "comum" },
    { id: "pasta-termica", weight: 25, tier: "incomum" },
    { id: "memoria-ecc", weight: 13, tier: "raro" },
    { id: "fonte-alimentacao", weight: 2, tier: "lendario" }
];
const TIERS = {
    comum: { color: 0x9fe8ff, text: "#9fe8ff", beam: 0.35, sparkMs: 240 },
    incomum: { color: 0x51e36b, text: "#51e36b", beam: 0.45, sparkMs: 180 },
    raro: { color: 0x6f8cff, text: "#8fa8ff", beam: 0.55, sparkMs: 140 },
    lendario: { color: 0xffc14d, text: "#ffc14d", beam: 0.7, sparkMs: 90 }
};

const PICKUP_RANGE = 26;
const MAGNET_RANGE = 64;        // a partir daqui o item vem até a Artemis
const LABEL_RANGE = 140;        // a partir daqui o nome aparece
const ICON_SCALE = 1.35;
const POP_MS = 520;             // o salto do robô até o chão
const GLINT_EVERY_MS = 1700;    // reflexo periódico

// Mesmos ícones (e mesmas chaves) do inventário: quem carregar primeiro serve aos dois.
const ICON_URLS = Object.fromEntries(
    Object.entries(import.meta.glob("../assets/sprites/itens/*.png", { eager: true, query: "?url", import: "default" }))
        .map(([caminho, url]) => [caminho.split("/").pop().replace(".png", ""), url])
);

export function preloadItemDrops(scene) {
    DROP_TABLE.forEach(({ id }) => {
        const icon = itemDef(id)?.icon ?? id;
        const key = `inv-item-${icon}`;
        if (ICON_URLS[icon] && !scene.textures.exists(key)) scene.load.image(key, ICON_URLS[icon]);
    });
}

// Sorteia o drop (id do item) ou null.
export function rollDrop(random = Math.random) {
    if (random() >= DROP_CHANCE) return null;
    const total = DROP_TABLE.reduce((s, d) => s + d.weight, 0);
    let r = random() * total;
    return DROP_TABLE.find((d) => (r -= d.weight) < 0)?.id ?? DROP_TABLE[0].id;
}

// Texturas do brilho: feixe com degradê vertical, estrela de 4 pontas e faísca.
function makeTextures(scene) {
    if (!scene.textures.exists("drop-beam")) {
        const g = scene.add.graphics();
        const h = 120;
        for (let y = 0; y < h; y += 1) {
            // Mais forte embaixo (no item), sumindo para cima.
            const a = Math.pow(y / h, 1.6);
            g.fillStyle(0xffffff, a);
            g.fillRect(0, y, 18, 1);
            g.fillStyle(0xffffff, a * 0.9);
            g.fillRect(6, y, 6, 1);       // miolo mais forte
        }
        g.generateTexture("drop-beam", 18, h);
        g.destroy();
    }
    if (!scene.textures.exists("drop-star")) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(8, 0, 10, 8, 6, 8);
        g.fillTriangle(8, 16, 10, 8, 6, 8);
        g.fillTriangle(0, 8, 8, 6, 8, 10);
        g.fillTriangle(16, 8, 8, 6, 8, 10);
        g.fillCircle(8, 8, 2);
        g.generateTexture("drop-star", 16, 16);
        g.destroy();
    }
    if (!scene.textures.exists("drop-spark")) {
        const g = scene.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 3, 3);
        g.generateTexture("drop-spark", 3, 3);
        g.destroy();
    }
}

export default class ItemDrop {
    constructor(scene, x, y, id) {
        this.scene = scene;
        this.item = itemDef(id);
        this.tier = TIERS[DROP_TABLE.find((d) => d.id === id)?.tier] ?? TIERS.comum;
        this.taken = false;
        this.landed = false;
        makeTextures(scene);
        const key = `inv-item-${this.item.icon ?? this.item.id}`;
        const color = this.tier.color;

        // Cai um pouco para o lado de onde o robô estava, num arco.
        const b = scene.bounds;
        const lx = Phaser.Math.Clamp(x + Phaser.Math.Between(-46, 46), b.x + 20, b.x + b.w - 20);
        const ly = Phaser.Math.Clamp(y + Phaser.Math.Between(-10, 22), b.y + 20, b.y + b.h - 10);
        this.home = { x: lx, y: ly };

        this.glow = scene.add.ellipse(lx, ly + 6, 34, 12, color, 0.4).setDepth(ly - 2).setAlpha(0);
        this.beam = scene.add.image(lx, ly + 4, "drop-beam").setOrigin(0.5, 1)
            .setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(ly - 1).setAlpha(0).setScale(1, 0.2);
        this.sprite = scene.textures.exists(key)
            ? scene.add.image(x, y - 10, key).setScale(ICON_SCALE).setDepth(ly)
            : scene.add.rectangle(x, y - 10, 14, 14, color).setDepth(ly);
        this.glint = scene.add.image(lx, ly, "drop-star").setTint(0xffffff)
            .setBlendMode(Phaser.BlendModes.ADD).setDepth(ly + 1).setAlpha(0);

        this.sparks = scene.add.particles(0, 0, "drop-spark", {
            lifespan: 900, frequency: this.tier.sparkMs, quantity: 1,
            speedY: { min: -46, max: -18 }, speedX: { min: -10, max: 10 },
            x: { min: -10, max: 10 }, scale: { start: 1.4, end: 0 },
            alpha: { start: 0.9, end: 0 }, tint: color, blendMode: Phaser.BlendModes.ADD,
            emitting: false
        }).setDepth(ly + 1);

        this.label = scene.add.text(lx, ly - 44, this.item.name.toUpperCase(), {
            fontFamily: "VCR", fontSize: hudPx(14), color: this.tier.text,
            stroke: "#050505", strokeThickness: 4
        }).setOrigin(0.5).setDepth(820).setAlpha(0);

        this.pop(x, y - 10);

        this.onUpdate = () => this.check();
        scene.events.on("update", this.onUpdate);
        scene.events.once("shutdown", () => this.destroy());
    }

    // Salta do robô até o chão (arco) e quica; aí acendem o feixe e as faíscas.
    pop(fromX, fromY) {
        const s = this.scene;
        const { x, y } = this.home;
        s.tweens.addCounter({
            from: 0, to: 1, duration: POP_MS, ease: "Linear",
            onUpdate: (tw) => {
                const t = tw.getValue();
                if (this.taken) return;
                this.sprite.setPosition(
                    Phaser.Math.Linear(fromX, x, t),
                    Phaser.Math.Linear(fromY, y, t) - Math.sin(t * Math.PI) * 54
                );
                this.sprite.setAngle(t * 360);
            },
            onComplete: () => {
                if (this.taken) return;
                this.sprite.setAngle(0);
                this.land();
            }
        });
    }

    land() {
        const s = this.scene;
        const { x, y } = this.home;
        this.landed = true;
        // Quique curto + anel no chão + som com o tom da raridade.
        s.tweens.add({ targets: this.sprite, y: y - 12, duration: 120, yoyo: true, ease: "Quad.easeOut" });
        const ring = s.add.circle(x, y + 4, 10).setStrokeStyle(2, this.tier.color, 1).setDepth(y - 2);
        s.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
        Sfx.play(s, "select", 0.5, { detune: 300 + Object.values(TIERS).indexOf(this.tier) * 200 });

        s.tweens.add({ targets: this.glow, alpha: 1, duration: 200 });
        s.tweens.add({ targets: this.beam, alpha: this.tier.beam, scaleY: 1, duration: 260, ease: "Back.easeOut" });
        this.beamPulse = s.time.delayedCall(260, () => {
            if (this.taken) return;
            s.tweens.add({ targets: this.beam, alpha: this.tier.beam * 0.55, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            s.tweens.add({ targets: this.glow, alpha: 0.45, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        });
        this.bob = s.tweens.add({
            targets: this.sprite, y: y - 6, duration: 760, yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: 240
        });
        this.sparks.startFollow(this.sprite);
        this.sparks.start();
        this.glintTimer = s.time.addEvent({ delay: GLINT_EVERY_MS, loop: true, callback: () => this.flashGlint() });
        this.flashGlint();
    }

    // O reflexo: uma estrela que acende e gira por cima do item.
    flashGlint() {
        if (this.taken) return;
        const s = this.scene;
        this.glint.setPosition(this.sprite.x + 8, this.sprite.y - 8).setAlpha(1).setScale(0.2).setAngle(0);
        s.tweens.add({
            targets: this.glint, scale: 1.3, angle: 90, alpha: 0, duration: 520, ease: "Quad.easeOut"
        });
    }

    check() {
        const player = this.scene.player;
        if (this.taken || !this.landed || !player?.sprite?.active) return;
        const px = player.sprite.x;
        const py = player.feetY;
        const d = Phaser.Math.Distance.Between(px, py, this.sprite.x, this.sprite.y);

        // Nome aparece de perto (e some de longe), como os itens do Hades.
        const showLabel = d <= LABEL_RANGE;
        if (showLabel !== this.labelShown) {
            this.labelShown = showLabel;
            this.scene.tweens.add({ targets: this.label, alpha: showLabel ? 1 : 0, duration: 160 });
        }

        // Ímã: bem perto, o item vem até ela.
        if (d <= MAGNET_RANGE) {
            this.bob?.remove();
            this.bob = null;
            this.sprite.x += (px - this.sprite.x) * 0.22;
            this.sprite.y += (py - 12 - this.sprite.y) * 0.22;
            this.beam.setPosition(this.sprite.x, this.sprite.y + 4);
            this.glow.setPosition(this.sprite.x, this.sprite.y + 6);
            this.label.setPosition(this.sprite.x, this.sprite.y - 44);
        }
        if (d <= PICKUP_RANGE) this.pickUp();
    }

    pickUp() {
        const s = this.scene;
        this.taken = true;
        addItem(this.item.id, 1);
        Sfx.play(s, "select", 0.6, { detune: 500 });
        Sfx.play(s, "confirm", 0.35);

        const label = s.add.text(s.player.sprite.x, s.player.sprite.y - 40, `+ ${this.item.name.toUpperCase()}`, {
            fontFamily: "VCR", fontSize: hudPx(16), color: this.tier.text,
            backgroundColor: "#050505", padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(820).setScale(1.3);
        s.tweens.add({ targets: label, scale: 1, duration: 140, ease: "Back.easeOut" });
        s.tweens.add({ targets: label, y: label.y - 26, alpha: 0, delay: 800, duration: 700, onComplete: () => label.destroy() });

        // Estouro de brilho onde estava.
        const { x, y } = this.sprite;
        const burst = s.add.particles(x, y, "drop-spark", {
            lifespan: 500, speed: { min: 60, max: 150 }, scale: { start: 1.6, end: 0 },
            alpha: { start: 1, end: 0 }, tint: this.tier.color, blendMode: Phaser.BlendModes.ADD,
            emitting: false
        }).setDepth(830);
        burst.explode(14);
        s.time.delayedCall(600, () => burst.destroy());

        this.bob?.remove();
        this.glintTimer?.remove();
        this.sparks.stop();
        s.tweens.add({
            targets: [this.beam, this.glow, this.label], alpha: 0, duration: 200
        });
        s.tweens.add({
            targets: this.sprite, y: this.sprite.y - 16, alpha: 0, scale: ICON_SCALE * 1.5, duration: 220,
            onComplete: () => this.destroy()
        });
    }

    destroy() {
        this.scene.events.off("update", this.onUpdate);
        this.bob?.remove();
        this.glintTimer?.remove();
        this.beamPulse?.remove();
        [this.sprite, this.glow, this.beam, this.glint, this.sparks, this.label].forEach((o) => {
            if (o?.active) o.destroy();
        });
    }
}
