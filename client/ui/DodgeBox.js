import Phaser from "phaser";

// Mini-jogo de ESQUIVA estilo Undertale, reutilizável: uma caixa com uma alma
// (losango ciano) que o jogador move com WASD desviando de projéteis que caem.
// Autossuficiente (gera as próprias texturas e escuta o update da cena). Uma
// rodada é iniciada com `start(opts)`; cada acerto chama `onHit`, e ao fim da
// duração chama `onEnd`. Usado na ReprogramScene (ataque inicial do inimigo).

const SOUL_SPEED = 240;
const IFRAME_MS = 700;
const DEFAULT_BOX = { x: 640, y: 460, w: 440, h: 240 };

export default class DodgeBox {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.box = config.box ?? DEFAULT_BOX;
        this.active = false;
        this.invulnUntil = 0;

        this.createTextures();

        const { x, y, w, h } = this.box;
        this.boxGraphics = scene.add.graphics().setDepth(20).setVisible(false);

        this.soul = scene.physics.add.image(x, y, "dodge-soul").setDepth(30).setVisible(false);
        this.soul.body.setCollideWorldBounds(true);
        this.soul.body.setBoundsRectangle(new Phaser.Geom.Rectangle(
            x - w / 2 + 8, y - h / 2 + 8, w - 16, h - 16
        ));

        this.projectiles = scene.physics.add.group();
        scene.physics.add.overlap(this.soul, this.projectiles, (_, proj) => this.onProjectileHit(proj));

        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.updateHandler = () => this.onUpdate();
        scene.events.on("update", this.updateHandler);
        scene.events.once("shutdown", () => this.destroy());
    }

    createTextures() {
        if (!this.scene.textures.exists("dodge-soul")) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x4ad6ff, 1);
            g.fillPoints([{ x: 7, y: 0 }, { x: 14, y: 7 }, { x: 7, y: 14 }, { x: 0, y: 7 }], true);
            g.generateTexture("dodge-soul", 14, 14);
            g.destroy();
        }
        if (!this.scene.textures.exists("dodge-bullet")) {
            const g = this.scene.add.graphics();
            g.fillStyle(0xff4545, 1);
            g.fillCircle(6, 6, 5);
            g.lineStyle(2, 0x7a1020, 1);
            g.strokeCircle(6, 6, 5);
            g.generateTexture("dodge-bullet", 12, 12);
            g.destroy();
        }
    }

    drawBox() {
        const { x, y, w, h } = this.box;
        this.boxGraphics.clear();
        this.boxGraphics.fillStyle(0x000000, 1);
        this.boxGraphics.fillRect(x - w / 2, y - h / 2, w, h);
        this.boxGraphics.lineStyle(3, 0xf7f7f7, 0.95);
        this.boxGraphics.strokeRect(x - w / 2, y - h / 2, w, h);
    }

    // Inicia uma rodada de esquiva. opts: { durationMs, intervalMs, speed:{min,max},
    // drift, aimedChance, onHit(), onEnd() }.
    start(opts = {}) {
        this.opts = {
            durationMs: opts.durationMs ?? 3500,
            intervalMs: opts.intervalMs ?? 320,
            speed: opts.speed ?? { min: 150, max: 240 },
            drift: opts.drift ?? 45,
            aimedChance: opts.aimedChance ?? 0.4,
            onHit: opts.onHit,
            onEnd: opts.onEnd
        };

        this.active = true;
        this.drawBox();
        this.boxGraphics.setVisible(true);
        this.soul.body.reset(this.box.x, this.box.y);
        this.soul.setVisible(true).setAlpha(1);

        this.spawnTimer = this.scene.time.addEvent({
            delay: this.opts.intervalMs,
            loop: true,
            callback: () => this.spawnProjectile()
        });
        this.durationTimer = this.scene.time.delayedCall(this.opts.durationMs, () => this.end());
    }

    end() {
        if (!this.active) {
            return;
        }
        const onEnd = this.opts?.onEnd;
        this.stop();
        onEnd?.();
    }

    stop() {
        this.active = false;
        this.spawnTimer?.remove();
        this.spawnTimer = null;
        this.durationTimer?.remove();
        this.durationTimer = null;
        this.projectiles?.clear(true, true);
        // O corpo pode já não existir (chamado durante o shutdown da cena).
        if (this.soul?.body) {
            this.soul.body.setVelocity(0, 0);
        }
        this.soul?.setVisible(false);
        this.boxGraphics?.setVisible(false);
    }

    spawnProjectile() {
        const { x, y, w, h } = this.box;
        const left = x - w / 2 + 12;
        const right = x + w / 2 - 12;
        const aimed = Math.random() < this.opts.aimedChance;
        const px = aimed ? this.soul.x + Phaser.Math.Between(-22, 22) : Phaser.Math.Between(left, right);

        const proj = this.projectiles.create(Phaser.Math.Clamp(px, left, right), y - h / 2 + 10, "dodge-bullet");
        proj.setDepth(28);
        proj.body.setVelocity(
            Phaser.Math.Between(-this.opts.drift, this.opts.drift),
            Phaser.Math.Between(this.opts.speed.min, this.opts.speed.max)
        );
        this.scene.tweens.add({ targets: proj, angle: 360, duration: 800, repeat: -1 });
    }

    onProjectileHit(proj) {
        if (!this.active) {
            return;
        }
        proj.destroy();
        if (this.scene.time.now < this.invulnUntil) {
            return;
        }
        this.invulnUntil = this.scene.time.now + IFRAME_MS;

        this.scene.tweens.add({
            targets: this.soul,
            alpha: 0.25, duration: 90, yoyo: true, repeat: 3,
            onComplete: () => this.soul.setAlpha(1)
        });
        this.opts.onHit?.();
    }

    onUpdate() {
        if (this.active && this.soul.visible) {
            let vx = 0;
            let vy = 0;
            if (this.keys.left.isDown) vx -= 1;
            if (this.keys.right.isDown) vx += 1;
            if (this.keys.up.isDown) vy -= 1;
            if (this.keys.down.isDown) vy += 1;
            const norm = vx !== 0 && vy !== 0 ? Math.SQRT1_2 : 1;
            this.soul.body.setVelocity(vx * SOUL_SPEED * norm, vy * SOUL_SPEED * norm);
        } else if (this.soul.body) {
            this.soul.body.setVelocity(0, 0);
        }

        // Projéteis que saíram da caixa somem.
        const { x, y, w, h } = this.box;
        this.projectiles.getChildren().slice().forEach((proj) => {
            if (proj.y > y + h / 2 - 4 || proj.x < x - w / 2 - 20 || proj.x > x + w / 2 + 20) {
                proj.destroy();
            }
        });
    }

    // Chamado no shutdown da cena: NÃO tocar em physics (já desligada). Só
    // solta o listener e os timers; o Phaser destrói os objetos ao encerrar.
    destroy() {
        this.scene.events.off("update", this.updateHandler);
        this.spawnTimer?.remove();
        this.durationTimer?.remove();
        this.active = false;
    }
}
