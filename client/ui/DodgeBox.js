import Phaser from "phaser";

// Mini-jogo de ESQUIVA estilo Undertale, reutilizável: uma caixa com uma alma
// (losango ciano) que o jogador move com WASD desviando de projéteis. Varia os
// padrões de ataque em fases (chuva / laterais / mirado) e solta balas que
// EXPLODEM em várias outras. Autossuficiente (gera texturas, escuta o update da
// cena). Uma rodada é iniciada com `start(opts)`; cada acerto chama `onHit`, e
// ao fim da duração chama `onEnd`. Usado na ReprogramScene (ataque do inimigo).

const SOUL_SPEED = 240;
const IFRAME_MS = 700;
const DEFAULT_BOX = { x: 640, y: 460, w: 480, h: 260 };

const EXPLODE_DELAY = 1100;        // ms até a bala-bomba explodir.
const EXPLODE_FRAGMENTS = 8;       // balas geradas na explosão.
const EXPLODE_FRAG_SPEED = 150;

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
            g.fillCircle(10, 10, 9);
            g.fillStyle(0xffb0b0, 1);
            g.fillCircle(10, 10, 4);
            g.lineStyle(2, 0x7a1020, 1);
            g.strokeCircle(10, 10, 9);
            g.generateTexture("dodge-bullet", 20, 20);
            g.destroy();
        }
        if (!this.scene.textures.exists("dodge-exploder")) {
            const g = this.scene.add.graphics();
            g.fillStyle(0xffb347, 1);
            g.fillCircle(13, 13, 12);
            g.fillStyle(0xff7a1f, 1);
            g.fillCircle(13, 13, 8);
            g.fillStyle(0xfff2c8, 1);
            g.fillCircle(13, 13, 3);
            g.lineStyle(2, 0x7a3810, 1);
            g.strokeCircle(13, 13, 12);
            g.generateTexture("dodge-exploder", 26, 26);
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

    // Inicia uma rodada. opts: { durationMs, intervalMs, speed:{min,max}, drift,
    // aimedChance, patterns[], phaseMs, exploders, exploderMs, onHit(), onEnd() }.
    start(opts = {}) {
        this.opts = {
            durationMs: opts.durationMs ?? 6000,
            intervalMs: opts.intervalMs ?? 380,
            speed: opts.speed ?? { min: 150, max: 230 },
            drift: opts.drift ?? 45,
            aimedChance: opts.aimedChance ?? 0.4,
            patterns: opts.patterns ?? ["rain", "sides", "aimed"],
            phaseMs: opts.phaseMs ?? 2200,
            exploders: opts.exploders ?? true,
            exploderMs: opts.exploderMs ?? 2200,
            onHit: opts.onHit,
            onEnd: opts.onEnd
        };

        this.active = true;
        this.phaseIndex = 0;
        this.drawBox();
        this.boxGraphics.setVisible(true);
        this.soul.body.reset(this.box.x, this.box.y);
        this.soul.setVisible(true).setAlpha(1);

        this.spawnTimer = this.scene.time.addEvent({
            delay: this.opts.intervalMs, loop: true, callback: () => this.spawnProjectile()
        });
        this.phaseTimer = this.scene.time.addEvent({
            delay: this.opts.phaseMs, loop: true,
            callback: () => { this.phaseIndex = (this.phaseIndex + 1) % this.opts.patterns.length; }
        });
        if (this.opts.exploders) {
            this.exploderTimer = this.scene.time.addEvent({
                delay: this.opts.exploderMs, loop: true, callback: () => this.spawnExploder()
            });
        }
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
        this.phaseTimer?.remove();
        this.phaseTimer = null;
        this.exploderTimer?.remove();
        this.exploderTimer = null;
        this.durationTimer?.remove();
        this.durationTimer = null;
        this.projectiles?.clear(true, true);
        if (this.soul?.body) {
            this.soul.body.setVelocity(0, 0);
        }
        this.soul?.setVisible(false);
        this.boxGraphics?.setVisible(false);
    }

    // --- Cria uma bala genérica no grupo ---
    spawnBullet(x, y, vx, vy, texture = "dodge-bullet") {
        const proj = this.projectiles.create(x, y, texture);
        proj.setDepth(28);
        proj.body.setVelocity(vx, vy);
        proj.body.setSize(proj.width - 4, proj.height - 4, true);
        this.scene.tweens.add({ targets: proj, angle: 360, duration: 800, repeat: -1 });
        return proj;
    }

    // --- Padrões de ataque (variam por fase) ---
    spawnProjectile() {
        const pattern = this.opts.patterns[this.phaseIndex];
        if (pattern === "sides") {
            this.spawnSide();
        } else if (pattern === "aimed") {
            this.spawnAimed();
        } else {
            this.spawnRain();
        }
    }

    spawnRain() {
        const { x, y, w, h } = this.box;
        const left = x - w / 2 + 14;
        const right = x + w / 2 - 14;
        const aimed = Math.random() < this.opts.aimedChance;
        const px = aimed ? this.soul.x + Phaser.Math.Between(-22, 22) : Phaser.Math.Between(left, right);
        const speed = Phaser.Math.Between(this.opts.speed.min, this.opts.speed.max);
        this.spawnBullet(Phaser.Math.Clamp(px, left, right), y - h / 2 + 12,
            Phaser.Math.Between(-this.opts.drift, this.opts.drift), speed);
    }

    spawnSide() {
        const { x, y, w, h } = this.box;
        const fromLeft = Math.random() < 0.5;
        const py = Phaser.Math.Between(y - h / 2 + 14, y + h / 2 - 14);
        const speed = Phaser.Math.Between(this.opts.speed.min, this.opts.speed.max);
        this.spawnBullet(fromLeft ? x - w / 2 + 12 : x + w / 2 - 12, py,
            fromLeft ? speed : -speed, Phaser.Math.Between(-this.opts.drift, this.opts.drift));
    }

    spawnAimed() {
        const { x, y, w, h } = this.box;
        const sx = Phaser.Math.Between(x - w / 2 + 12, x + w / 2 - 12);
        const sy = y - h / 2 + 12;
        const angle = Phaser.Math.Angle.Between(sx, sy, this.soul.x, this.soul.y);
        const speed = this.opts.speed.max;
        this.spawnBullet(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    // --- Bala que explode em várias ---
    spawnExploder() {
        const { x, y, w, h } = this.box;
        const px = Phaser.Math.Between(x - w / 2 + 30, x + w / 2 - 30);
        const bomb = this.spawnBullet(px, y - h / 2 + 16, Phaser.Math.Between(-20, 20), 70, "dodge-exploder");
        // Pisca como aviso da explosão.
        this.scene.tweens.add({ targets: bomb, scale: { from: 1, to: 1.3 }, duration: 220, yoyo: true, repeat: -1 });
        this.scene.time.delayedCall(EXPLODE_DELAY, () => this.explode(bomb));
    }

    explode(bomb) {
        if (!this.active || !bomb || !bomb.active) {
            return;
        }
        const bx = bomb.x;
        const by = bomb.y;
        bomb.destroy();
        for (let i = 0; i < EXPLODE_FRAGMENTS; i += 1) {
            const a = (i / EXPLODE_FRAGMENTS) * Math.PI * 2;
            this.spawnBullet(bx, by, Math.cos(a) * EXPLODE_FRAG_SPEED, Math.sin(a) * EXPLODE_FRAG_SPEED);
        }
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

        // Projéteis que saíram da caixa somem (com folga, para as explosões).
        const { x, y, w, h } = this.box;
        const m = 40;
        this.projectiles.getChildren().slice().forEach((proj) => {
            if (proj.x < x - w / 2 - m || proj.x > x + w / 2 + m ||
                proj.y < y - h / 2 - m || proj.y > y + h / 2 + m) {
                proj.destroy();
            }
        });
    }

    // Chamado no shutdown da cena: NÃO tocar em physics (já desligada). Só solta
    // o listener e os timers; o Phaser destrói os objetos ao encerrar.
    destroy() {
        this.scene.events.off("update", this.updateHandler);
        this.spawnTimer?.remove();
        this.phaseTimer?.remove();
        this.exploderTimer?.remove();
        this.durationTimer?.remove();
        this.active = false;
    }
}
