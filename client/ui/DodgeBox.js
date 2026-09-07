import Phaser from "phaser";

// Mini-jogo de ESQUIVA estilo Undertale, reutilizável: uma caixa com uma alma
// (losango ciano) que o jogador move com WASD desviando de projéteis. A rodada
// dispara ATAQUES nomeados em sequência (cada inimigo tem os seus). Padrões:
//   rain          — chuva de balas do topo.
//   fan           — leque de balas de uma borda (escopeta).
//   fallExplode   — balas grandes que caem e explodem em menores.
//   bigDropHoming — uma bala grande que atravessa deixando pequenas que PERSEGUEM.
//   laserSweep    — feixe de laser varre a caixa de um lado ao outro, com uma
//                   ABERTURA por onde passar; o feixe em si dá dano fora dela.
// Autossuficiente (gera texturas, escuta o update da cena). `start(opts)` inicia;
// cada acerto chama `onHit`; ao fim da duração chama `onEnd`.

const SOUL_SPEED = 240;
const IFRAME_MS = 700;
const DEFAULT_BOX = { x: 640, y: 460, w: 480, h: 260 };

const EXPLODE_DELAY = 1100;
const EXPLODE_FRAGMENTS = 8;
const EXPLODE_FRAG_SPEED = 150;
const HOMING_SPEED = 120;
const HOMING_TURN = 2.6;           // rad/s de correção rumo à alma.
const HOMING_LIFE = 2600;
const HOMING_DELAY = 380;          // as pequenas caem antes de começar a perseguir.
const FAN_SPEED = 250;             // balas do leque.
const LASER_SWEEP_MS = 2600;       // tempo para o feixe atravessar a caixa (mais lento
                                    // que o antigo 1500ms — dá tempo de reagir).
const LASER_GAP_H = 100;           // altura da abertura segura no feixe.
const LASER_HALF_W = 9;            // meia-largura de colisão do feixe (fora da abertura).

export default class DodgeBox {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.box = config.box ?? DEFAULT_BOX;
        this.active = false;
        this.invulnUntil = 0;
        this.lasers = [];

        this.createTextures();

        const { x, y, w, h } = this.box;
        this.boxGraphics = scene.add.graphics().setDepth(20).setVisible(false);
        this.laserGraphics = scene.add.graphics().setDepth(29);

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

        this.updateHandler = (time, delta) => this.onUpdate(delta);
        scene.events.on("update", this.updateHandler);
        scene.events.once("shutdown", () => this.destroy());
    }

    createTextures() {
        const orb = (key, size, r, fill, core) => {
            if (this.scene.textures.exists(key)) return;
            const g = this.scene.add.graphics();
            g.fillStyle(fill, 1);
            g.fillCircle(size / 2, size / 2, r);
            g.fillStyle(core, 1);
            g.fillCircle(size / 2, size / 2, Math.max(2, r * 0.4));
            g.lineStyle(2, 0x7a1020, 1);
            g.strokeCircle(size / 2, size / 2, r);
            g.generateTexture(key, size, size);
            g.destroy();
        };
        if (!this.scene.textures.exists("dodge-soul")) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x4ad6ff, 1);
            g.fillPoints([{ x: 7, y: 0 }, { x: 14, y: 7 }, { x: 7, y: 14 }, { x: 0, y: 7 }], true);
            g.generateTexture("dodge-soul", 14, 14);
            g.destroy();
        }
        orb("dodge-mini", 12, 5, 0xff4545, 0xffb0b0);
        orb("dodge-bullet", 20, 9, 0xff4545, 0xffb0b0);
        orb("dodge-big", 30, 14, 0xff4545, 0xffd0d0);
        if (!this.scene.textures.exists("dodge-exploder")) {
            const g = this.scene.add.graphics();
            g.fillStyle(0xffb347, 1); g.fillCircle(13, 13, 12);
            g.fillStyle(0xff7a1f, 1); g.fillCircle(13, 13, 8);
            g.fillStyle(0xfff2c8, 1); g.fillCircle(13, 13, 3);
            g.lineStyle(2, 0x7a3810, 1); g.strokeCircle(13, 13, 12);
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

    // opts: { durationMs, attackIntervalMs, patterns[], speed:{min,max}, onHit(), onEnd() }.
    start(opts = {}) {
        this.opts = {
            durationMs: opts.durationMs ?? 6500,
            attackIntervalMs: opts.attackIntervalMs ?? 1500,
            patterns: opts.patterns ?? ["rain"],
            speed: opts.speed ?? { min: 150, max: 240 },
            onHit: opts.onHit,
            onEnd: opts.onEnd
        };

        this.active = true;
        this.attackIndex = 0;
        this.drawBox();
        this.boxGraphics.setVisible(true);
        this.soul.body.reset(this.box.x, this.box.y);
        this.soul.setVisible(true).setAlpha(1);

        this.runNextAttack();
        this.attackTimer = this.scene.time.addEvent({
            delay: this.opts.attackIntervalMs, loop: true, callback: () => this.runNextAttack()
        });
        this.durationTimer = this.scene.time.delayedCall(this.opts.durationMs, () => this.end());
    }

    end() {
        if (!this.active) return;
        const onEnd = this.opts?.onEnd;
        this.stop();
        onEnd?.();
    }

    stop() {
        this.active = false;
        this.attackTimer?.remove();
        this.attackTimer = null;
        this.durationTimer?.remove();
        this.durationTimer = null;
        this.projectiles?.clear(true, true);
        this.lasers = [];
        this.laserGraphics?.clear();
        if (this.soul?.body) this.soul.body.setVelocity(0, 0);
        this.soul?.setVisible(false);
        this.boxGraphics?.setVisible(false);
    }

    runNextAttack() {
        if (!this.active) return;
        const pattern = this.opts.patterns[this.attackIndex % this.opts.patterns.length];
        this.attackIndex += 1;
        ({
            fan: () => this.attackFan(),
            fallExplode: () => this.attackFallExplode(),
            bigDropHoming: () => this.attackBigDropHoming(),
            laserSweep: () => this.attackLaserSweep()
        }[pattern] ?? (() => this.attackRain()))();
    }

    // Cria uma bala no grupo (com hitbox um pouco menor que a arte).
    spawnBullet(x, y, vx, vy, texture = "dodge-bullet") {
        const proj = this.projectiles.create(x, y, texture);
        proj.setDepth(28);
        proj.body.setVelocity(vx, vy);
        proj.body.setSize(proj.width - 4, proj.height - 4, true);
        this.scene.tweens.add({ targets: proj, angle: 360, duration: 800, repeat: -1 });
        return proj;
    }

    // --- Ataques ---
    attackRain() {
        const { x, y, w, h } = this.box;
        const left = x - w / 2 + 14;
        const right = x + w / 2 - 14;
        for (let i = 0; i < 4; i += 1) {
            const px = Phaser.Math.Between(left, right);
            const speed = Phaser.Math.Between(this.opts.speed.min, this.opts.speed.max);
            this.spawnBullet(px, y - h / 2 + 14, Phaser.Math.Between(-40, 40), speed);
        }
    }

    // Leque de balas rápidas vindo de uma borda aleatória, mirado na alma.
    attackFan() {
        const { x, y, w, h } = this.box;
        const edge = Phaser.Math.Between(0, 3);
        let ox;
        let oy;
        if (edge === 0) { ox = Phaser.Math.Between(x - w / 2 + 30, x + w / 2 - 30); oy = y - h / 2 + 18; }
        else if (edge === 1) { ox = x + w / 2 - 18; oy = Phaser.Math.Between(y - h / 2 + 30, y + h / 2 - 30); }
        else if (edge === 2) { ox = Phaser.Math.Between(x - w / 2 + 30, x + w / 2 - 30); oy = y + h / 2 - 18; }
        else { ox = x - w / 2 + 18; oy = Phaser.Math.Between(y - h / 2 + 30, y + h / 2 - 30); }

        const base = Phaser.Math.Angle.Between(ox, oy, this.soul.x, this.soul.y);
        const n = 6;
        const spread = 0.9;
        for (let i = 0; i < n; i += 1) {
            const a = base + (i / (n - 1) - 0.5) * spread;
            this.spawnBullet(ox, oy, Math.cos(a) * FAN_SPEED, Math.sin(a) * FAN_SPEED);
        }
    }

    attackFallExplode() {
        const { x, y, w, h } = this.box;
        for (let i = 0; i < 2; i += 1) {
            const px = Phaser.Math.Between(x - w / 2 + 30, x + w / 2 - 30);
            const bomb = this.spawnBullet(px, y - h / 2 + 24, Phaser.Math.Between(-20, 20), 70, "dodge-exploder");
            this.scene.tweens.add({ targets: bomb, scale: { from: 1, to: 1.3 }, duration: 220, yoyo: true, repeat: -1 });
            this.scene.time.delayedCall(EXPLODE_DELAY, () => this.explode(bomb));
        }
    }

    explode(bomb) {
        if (!this.active || !bomb || !bomb.active) return;
        const bx = bomb.x;
        const by = bomb.y;
        bomb.destroy();
        for (let i = 0; i < EXPLODE_FRAGMENTS; i += 1) {
            const a = (i / EXPLODE_FRAGMENTS) * Math.PI * 2;
            this.spawnBullet(bx, by, Math.cos(a) * EXPLODE_FRAG_SPEED, Math.sin(a) * EXPLODE_FRAG_SPEED, "dodge-mini");
        }
    }

    // Bala grande que atravessa deixando pequenas que perseguem a alma.
    attackBigDropHoming() {
        const { x, y, w, h } = this.box;
        const fromLeft = Math.random() < 0.5;
        const cy = Phaser.Math.Between(y - h / 2 + 30, y + h / 2 - 30);
        const carrier = this.spawnBullet(
            fromLeft ? x - w / 2 + 18 : x + w / 2 - 18, cy, fromLeft ? 120 : -120, 0, "dodge-big"
        );
        this.scene.time.addEvent({
            delay: 200, repeat: 8,
            callback: () => {
                if (!this.active || !carrier.active) return;
                // Nasce CAINDO (para baixo, com espalhamento) e só depois persegue.
                const mini = this.spawnBullet(carrier.x, carrier.y, Phaser.Math.Between(-45, 45), 150, "dodge-mini");
                this.scene.time.delayedCall(HOMING_DELAY, () => { if (mini.active) mini.homing = true; });
                this.scene.time.delayedCall(HOMING_LIFE, () => { if (mini.active) mini.destroy(); });
            }
        });
    }

    // Feixe de laser varrendo a caixa de um lado ao outro: o próprio feixe dá dano
    // (checado a cada frame em onUpdate), exceto na ABERTURA — um trecho vertical
    // seguro, em altura aleatória, por onde a alma pode passar. Cada sweep é
    // independente (lista), então varreduras seguidas não se atrapalham.
    attackLaserSweep() {
        const { x, y, w, h } = this.box;
        const fromLeft = Math.random() < 0.5;
        const gapMargin = LASER_GAP_H / 2 + 14;
        const gapCenter = Phaser.Math.Between(y - h / 2 + gapMargin, y + h / 2 - gapMargin);
        const laser = {
            x: fromLeft ? x - w / 2 + 10 : x + w / 2 - 10,
            y0: y - h / 2 + 6,
            y1: y + h / 2 - 6,
            gapTop: gapCenter - LASER_GAP_H / 2,
            gapBottom: gapCenter + LASER_GAP_H / 2,
            active: true
        };
        this.lasers.push(laser);

        this.scene.tweens.add({
            targets: laser,
            x: fromLeft ? x + w / 2 - 10 : x - w / 2 + 10,
            duration: LASER_SWEEP_MS, ease: "Sine.easeInOut",
            onComplete: () => { laser.active = false; }
        });
    }

    onProjectileHit(proj) {
        if (!this.active) return;
        proj.destroy();
        this.hitPlayer();
    }

    // Aplica um acerto na alma (i-frames + flash + onHit). Compartilhado pelas
    // balas (overlap físico) e pelo feixe de laser (checado por posição em onUpdate).
    hitPlayer() {
        if (this.scene.time.now < this.invulnUntil) return;
        this.invulnUntil = this.scene.time.now + IFRAME_MS;

        this.scene.tweens.add({
            targets: this.soul, alpha: 0.25, duration: 90, yoyo: true, repeat: 3,
            onComplete: () => this.soul.setAlpha(1)
        });
        this.opts.onHit?.();
    }

    onUpdate(delta) {
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

        // Feixes de laser: desenha em DOIS trechos, pulando a abertura (fica um vão
        // visível no feixe), e dá dano contínuo (com i-frames) se a alma cruzar o
        // feixe FORA da abertura.
        this.laserGraphics.clear();
        this.lasers = this.lasers.filter((laser) => laser.active);
        this.lasers.forEach((laser) => {
            this.laserGraphics.lineStyle(10, 0xff4545, 0.18);
            this.laserGraphics.lineBetween(laser.x, laser.y0, laser.x, laser.gapTop);
            this.laserGraphics.lineBetween(laser.x, laser.gapBottom, laser.x, laser.y1);
            this.laserGraphics.lineStyle(3, 0xff4545, 0.9);
            this.laserGraphics.lineBetween(laser.x, laser.y0, laser.x, laser.gapTop);
            this.laserGraphics.lineBetween(laser.x, laser.gapBottom, laser.x, laser.y1);

            if (this.soul.visible) {
                const withinBeam = Math.abs(this.soul.x - laser.x) <= LASER_HALF_W + this.soul.width / 2;
                const insideGap = this.soul.y >= laser.gapTop && this.soul.y <= laser.gapBottom;
                if (withinBeam && !insideGap) {
                    this.hitPlayer();
                }
            }
        });

        // Balas que perseguem: viram gradualmente rumo à alma.
        const dt = (delta ?? 16) / 1000;
        const children = this.projectiles.getChildren();
        for (let i = 0; i < children.length; i += 1) {
            const p = children[i];
            if (p.active && p.homing && p.body && this.soul.visible) {
                const desired = Phaser.Math.Angle.Between(p.x, p.y, this.soul.x, this.soul.y);
                const cur = Math.atan2(p.body.velocity.y, p.body.velocity.x);
                const next = Phaser.Math.Angle.RotateTo(cur, desired, HOMING_TURN * dt);
                p.body.setVelocity(Math.cos(next) * HOMING_SPEED, Math.sin(next) * HOMING_SPEED);
            }
        }

        // Projétil some ao TOCAR a parede (a borda dele cruza), então nada
        // aparece para fora do quadro de combate.
        const { x, y, w, h } = this.box;
        const left = x - w / 2;
        const right = x + w / 2;
        const top = y - h / 2;
        const bottom = y + h / 2;
        children.slice().forEach((proj) => {
            const hw = proj.displayWidth / 2;
            const hh = proj.displayHeight / 2;
            if (proj.x - hw <= left || proj.x + hw >= right || proj.y - hh <= top || proj.y + hh >= bottom) {
                proj.destroy();
            }
        });
    }

    // Shutdown da cena: NÃO tocar em physics (já desligada). Só solta o listener
    // e os timers; o Phaser destrói os objetos ao encerrar.
    destroy() {
        this.scene.events.off("update", this.updateHandler);
        this.attackTimer?.remove();
        this.durationTimer?.remove();
        this.active = false;
    }
}
