// Barra de HP com DANO ATRASADO (game juice): ao perder vida, o trecho perdido
// fica BRANCO por um instante e só então esvazia até o valor novo — o jogador
// vê quanto levou, não só quanto sobrou. Curar enche na hora. O texto ao lado
// (opcional) dá um pulo quando o valor cai.
//
// Desenha num Graphics que a cena já criou (quem chama controla a profundidade).
// Usada pela barra da Artemis nas salas (BaseRoomScene) e pelas duas barras da
// BattleScene.

const GHOST_DELAY_MS = 380;
const GHOST_DRAIN_MS = 420;
const GHOST_COLOR = 0xf7f7f7;

export default class HpMeter {
    // `bar` = { x, y, w, h }; `color(ratio)` = cor do preenchimento;
    // `stroke` = [espessura, cor, alfa]; `text` = Text a dar o pulo no dano.
    constructor(scene, graphics, { bar, color, stroke = [1, 0x4ad6ff, 0.6], text = null }) {
        this.scene = scene;
        this.g = graphics;
        this.bar = bar;
        this.color = color;
        this.stroke = stroke;
        this.text = text;
        this.ratio = null;
        this.ghost = 0;
        this.drain = null;
    }

    set(ratio) {
        const r = Math.max(0, Math.min(1, ratio));
        const tookDamage = this.ratio !== null && r < this.ratio;
        if (this.ratio === null || r >= this.ghost) {
            // Primeira pintura ou cura: o fantasma acompanha na hora.
            this.drain?.remove();
            this.drain = null;
            this.ghost = r;
        } else if (tookDamage) {
            // O fantasma espera e esvazia a partir de onde estiver (dano em
            // sequência emenda num esvaziar só).
            this.drain?.remove();
            this.drain = this.scene.tweens.addCounter({
                from: this.ghost,
                to: r,
                delay: GHOST_DELAY_MS,
                duration: GHOST_DRAIN_MS,
                ease: "Quad.easeIn",
                onUpdate: (tween) => {
                    this.ghost = tween.getValue();
                    this.draw();
                },
                onComplete: () => { this.drain = null; }
            });
            this.bump();
        }
        this.ratio = r;
        this.draw();
    }

    bump() {
        const t = this.text;
        if (!t?.active) return;
        this.scene.tweens.killTweensOf(t);
        t.setScale(1);
        this.scene.tweens.add({ targets: t, scale: 1.35, duration: 70, yoyo: true, ease: "Quad.easeOut" });
    }

    draw() {
        const { x, y, w, h } = this.bar;
        const [lw, lc, la] = this.stroke;
        const inner = w - 2;
        this.g.clear();
        this.g.lineStyle(lw, lc, la);
        this.g.strokeRect(x, y, w, h);
        if (this.ghost > this.ratio) {
            this.g.fillStyle(GHOST_COLOR, 0.85);
            this.g.fillRect(x + 1 + inner * this.ratio, y + 1, inner * (this.ghost - this.ratio), h - 2);
        }
        this.g.fillStyle(this.color(this.ratio), 0.9);
        this.g.fillRect(x + 1, y + 1, inner * this.ratio, h - 2);
    }
}
