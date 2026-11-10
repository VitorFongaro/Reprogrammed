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

const DROP_CHANCE = 0.45;
const DROP_TABLE = [
    { id: "pente-ram", weight: 60 },
    { id: "pasta-termica", weight: 25 },
    { id: "memoria-ecc", weight: 13 },
    { id: "fonte-alimentacao", weight: 2 }
];
const PICKUP_RANGE = 26;
const COLORS = { cura: 0x51e36b };

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

export default class ItemDrop {
    constructor(scene, x, y, id) {
        this.scene = scene;
        this.item = itemDef(id);
        this.taken = false;
        const key = `inv-item-${this.item.icon ?? this.item.id}`;

        this.glow = scene.add.ellipse(x, y + 6, 26, 10, COLORS[this.item.category] ?? 0x4ad6ff, 0.35).setDepth(y - 1);
        this.sprite = scene.textures.exists(key)
            ? scene.add.image(x, y - 30, key).setDepth(y)
            : scene.add.rectangle(x, y - 30, 14, 14, 0x51e36b).setDepth(y);

        // Cai do robô e fica flutuando de leve.
        scene.tweens.add({
            targets: this.sprite, y, duration: 380, ease: "Bounce.easeOut",
            onComplete: () => {
                if (this.taken) return;
                this.bob = scene.tweens.add({ targets: this.sprite, y: y - 4, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            }
        });
        scene.tweens.add({ targets: this.glow, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });

        this.home = { x, y };
        this.onUpdate = () => this.check();
        scene.events.on("update", this.onUpdate);
        scene.events.once("shutdown", () => this.destroy());
    }

    check() {
        const player = this.scene.player;
        if (this.taken || !player?.sprite?.active) return;
        const d = Phaser.Math.Distance.Between(player.sprite.x, player.feetY, this.home.x, this.home.y);
        if (d <= PICKUP_RANGE) this.pickUp();
    }

    pickUp() {
        const s = this.scene;
        this.taken = true;
        addItem(this.item.id, 1);
        Sfx.play(s, "select", 0.6);

        const label = s.add.text(s.player.sprite.x, s.player.sprite.y - 40, `+ ${this.item.name.toUpperCase()}`, {
            fontFamily: "VCR", fontSize: hudPx(16), color: "#51e36b",
            backgroundColor: "#050505", padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(820);
        s.tweens.add({ targets: label, y: label.y - 26, alpha: 0, delay: 700, duration: 700, onComplete: () => label.destroy() });

        this.bob?.remove();
        s.tweens.add({
            targets: this.sprite, y: this.sprite.y - 16, alpha: 0, scale: 1.4, duration: 220,
            onComplete: () => this.destroy()
        });
        this.glow.destroy();
    }

    destroy() {
        this.scene.events.off("update", this.onUpdate);
        this.bob?.remove();
        if (this.sprite?.active) this.sprite.destroy();
        if (this.glow?.active) this.glow.destroy();
    }
}
