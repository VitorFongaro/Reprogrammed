import Phaser from "phaser";
import expIdle from "../assets/sprites/enemies/exploding/idle.png";
import expWalk from "../assets/sprites/enemies/exploding/walk.png";
import expExplode from "../assets/sprites/enemies/exploding/explode.png";
import expDisabled from "../assets/sprites/enemies/exploding/disabled.png";
import pistolWalk from "../assets/sprites/enemies/pistol/walk.png";
import pistolDisabled from "../assets/sprites/enemies/pistol/disabled.png";
import pistolWeapon from "../assets/sprites/enemies/pistol/weapon.png";
import shotgunWalk from "../assets/sprites/enemies/shotgun/walk.png";
import shotgunShoot from "../assets/sprites/enemies/shotgun/shoot.png";
import shotgunDisabled from "../assets/sprites/enemies/shotgun/disabled.png";
import shotgunWeapon from "../assets/sprites/enemies/shotgun/weapon.png";
import bipedWalk from "../assets/sprites/enemies/biped/walk.png";
import bipedDisabled from "../assets/sprites/enemies/biped/disabled.png";

// Inimigos do capítulo 1 (packs SteamRobotsPack + biped_robot, quadros 32×32).
// Cada inimigo anda/persegue a Artemis e ataca (contato ou tiro), tirando HP da
// sala. Os robôs à distância EMPUNHAM uma arma (pistola/escopeta, folha própria
// sobreposta 1:1 no robô, mira e dispara). Neutraliza-se de dois modos:
//   • REPROGRAMAR ([R] mira com o mouse → batalha de reprogramação);
//   • MELEE ([F] perto dele — placeholder até a animação de ataque da Artemis).
// Ao ser neutralizado toca `disabled` e para. Colisão/tiro/dano são geridos pela
// cena (BaseRoomScene).

const FRAME = 32;

// [chave] -> { url, quadros, fh? (altura, default 32), repeat? (default -1) }.
const SHEETS = {
    "enemy-exploding-idle": { url: expIdle, frames: 5 },
    "enemy-exploding-walk": { url: expWalk, frames: 6 },
    "enemy-exploding-explode": { url: expExplode, frames: 6 },
    "enemy-exploding-disabled": { url: expDisabled, frames: 1 },
    "enemy-pistol-walk": { url: pistolWalk, frames: 8 },
    "enemy-pistol-disabled": { url: pistolDisabled, frames: 7 },
    "enemy-pistol-weapon": { url: pistolWeapon, frames: 5, repeat: 0 },
    "enemy-shotgun-walk": { url: shotgunWalk, frames: 5 },
    "enemy-shotgun-shoot": { url: shotgunShoot, frames: 4 },
    "enemy-shotgun-disabled": { url: shotgunDisabled, frames: 1 },
    "enemy-shotgun-weapon": { url: shotgunWeapon, frames: 7, fh: 16, repeat: 0 },
    "enemy-biped-walk": { url: bipedWalk, frames: 6 },
    "enemy-biped-disabled": { url: bipedDisabled, frames: 2 }
};

const TYPES = {
    exploding: {
        name: "ROBÔ EXPLOSIVO",
        walkKey: "enemy-exploding-walk",
        disabledKey: "enemy-exploding-disabled",
        scale: 3.3, speed: 130, meleeHp: 2, ranged: false, contactDamage: 5,
        disablePuzzle: { variable: "carga", expected: 0,
            hint: "monte:  carga = 0", wrongValueMessage: "ainda vai explodir",
            blockDistractors: { nome: ["fusivel"], op: ["=="], valor: ["100", '"0"'] } }
    },
    pistol: {
        name: "ROBÔ PISTOLEIRO",
        walkKey: "enemy-pistol-walk",
        disabledKey: "enemy-pistol-disabled",
        weaponKey: "enemy-pistol-weapon",
        scale: 3.3, speed: 100, meleeHp: 2, ranged: true, fireMs: 1800, contactDamage: 3,
        disablePuzzle: { variable: "mira", expected: false,
            hint: "monte:  mira = false", wrongValueMessage: "ainda está mirando",
            blockDistractors: { nome: ["gatilho"], op: ["=="], valor: ["true", '"false"'] } }
    },
    shotgun: {
        name: "ROBÔ ESCOPETA",
        walkKey: "enemy-shotgun-walk",
        disabledKey: "enemy-shotgun-disabled",
        weaponKey: "enemy-shotgun-weapon",
        scale: 3.3, speed: 90, meleeHp: 3, ranged: true, fireMs: 2500, contactDamage: 4,
        pellets: 5, spread: 0.6,       // rajada de 5 balas em leque.
        disablePuzzle: { variable: "cartucho", expected: 0,
            hint: "monte:  cartucho = 0", wrongValueMessage: "ainda tem cartucho",
            blockDistractors: { nome: ["cano"], op: ["=="], valor: ["50", '"0"'] } }
    },
    biped: {
        name: "MECH VERMELHO",
        walkKey: "enemy-biped-walk",
        disabledKey: "enemy-biped-disabled",
        scale: 3.2, speed: 90, meleeHp: 4, ranged: false, contactDamage: 4,
        // Anda ALEATÓRIO (não persegue) e periodicamente pula: ao aterrissar
        // solta 4 bolas de energia que quicam nas paredes até sumirem.
        wander: true, slam: true, slamMs: 3800,
        disablePuzzle: { variable: "sistema", expected: false,
            hint: "monte:  sistema = false", wrongValueMessage: "sistema ainda ativo",
            blockDistractors: { nome: ["motor", "servo"], op: ["=="], valor: ["true", '"false"'] } }
    }
};

const CHASE_RANGE = 340;        // distância para começar a perseguir.
const FIRE_RANGE = 400;         // alcance de tiro (ranged).
const MUZZLE_OFFSET = 26;       // saída da bala, à frente do robô.
const HITBOX = 20;

export default class Enemy {
    static preload(scene) {
        Object.entries(SHEETS).forEach(([key, def]) => {
            if (!scene.textures.exists(key)) {
                scene.load.spritesheet(key, def.url, { frameWidth: FRAME, frameHeight: def.fh ?? FRAME });
            }
        });
    }

    static createAnimations(scene) {
        Object.entries(SHEETS).forEach(([key, def]) => {
            if (scene.anims.exists(key)) {
                return;
            }
            scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers(key, { start: 0, end: def.frames - 1 }),
                frameRate: def.frames > 1 ? (def.repeat === 0 ? 16 : 8) : 1,
                repeat: def.repeat ?? -1
            });
        });
    }

    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        Enemy.createAnimations(scene);

        this.def = TYPES[options.type] ?? TYPES.exploding;
        this.type = options.type ?? "exploding";
        this.homeX = x;
        this.meleeHp = this.def.meleeHp;
        this.disabled = false;
        this.nextFire = 0;
        this.nextWander = 0;
        this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.nextSlam = 2000;
        this.jumping = false;

        this.sprite = scene.physics.add.sprite(x, y, this.def.walkKey, 0)
            .setScale(this.def.scale);
        this.sprite.play(this.def.walkKey);
        this.sprite.body.setSize(HITBOX, HITBOX, true);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.enemyRef = this;

        // Arma empunhada (robôs à distância): sobreposta 1:1, mira/dispara junto.
        if (this.def.weaponKey) {
            this.weapon = scene.add.sprite(x, y, this.def.weaponKey, 0).setScale(this.def.scale);
        }

        scene.registerEnemy?.(this);
        scene.registerReprogrammable?.({
            sprite: this.sprite,                 // posição viva (o inimigo se move).
            w: FRAME * this.def.scale * 0.7,
            h: FRAME * this.def.scale * 0.7,
            label: this.def.name,
            isAvailable: () => !this.disabled,
            onReprogram: () => scene.startEnemyReprogram?.(this)
        });
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }

    update(time) {
        // Profundidade por y (pés), para o y-sort das salas com props.
        this.sprite.setDepth(this.sprite.y + 40);
        this.syncWeapon();

        if (this.disabled || !this.sprite.body || this.jumping) {
            return;
        }

        const player = this.scene.player?.sprite;
        if (!player || !this.scene.player.enabled) {
            this.sprite.body.setVelocity(0, 0);
            return;
        }

        // Ataque de pulo (biped): salta e solta bolas de energia quicantes.
        if (this.def.slam && time >= this.nextSlam) {
            this.nextSlam = time + this.def.slamMs;
            this.slamAttack();
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (this.def.wander) {
            this.wander(time);
        } else if (dist <= CHASE_RANGE) {
            // Persegue a Artemis.
            const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            this.sprite.body.setVelocity(Math.cos(angle) * this.def.speed, Math.sin(angle) * this.def.speed);
            this.sprite.setFlipX(player.x < this.x);
        } else {
            // Patrulha em torno da posição.
            const dir = Math.sin(time / 900) >= 0 ? 1 : -1;
            this.sprite.body.setVelocity(dir * this.def.speed * 0.6, 0);
            if (this.sprite.body.velocity.x !== 0) {
                this.sprite.setFlipX(this.sprite.body.velocity.x < 0);
            }
        }

        if (this.def.ranged && dist <= FIRE_RANGE && time >= this.nextFire) {
            this.nextFire = time + this.def.fireMs;
            this.shoot(player);
        }
    }

    // Movimento aleatório: muda de direção periodicamente; ao bater numa parede,
    // vira para o centro da sala (com espalhamento) para não travar no canto.
    wander(time) {
        if (!this.sprite.body.blocked.none) {
            const b = this.scene.bounds;
            const toCenter = Phaser.Math.Angle.Between(this.x, this.y, b.x + b.w / 2, b.y + b.h / 2);
            this.wanderAngle = toCenter + Phaser.Math.FloatBetween(-0.6, 0.6);
            this.nextWander = time + Phaser.Math.Between(700, 1300);
        } else if (time >= this.nextWander) {
            this.nextWander = time + Phaser.Math.Between(900, 1700);
            this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        }
        const s = this.def.speed * 0.85;
        this.sprite.body.setVelocity(Math.cos(this.wanderAngle) * s, Math.sin(this.wanderAngle) * s);
        if (this.sprite.body.velocity.x !== 0) {
            this.sprite.setFlipX(this.sprite.body.velocity.x < 0);
        }
    }

    // Pula (hop visual, sem física) e ao aterrissar solta 4 bolas nas diagonais.
    slamAttack() {
        this.jumping = true;
        const gx = this.sprite.x;
        const gy = this.sprite.y;
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.enable = false;      // solta do physics para o hop.

        this.scene.tweens.add({
            targets: this.sprite,
            y: gy - 44,
            duration: 280,
            yoyo: true,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.jumping = false;
                if (this.disabled || !this.sprite.body) {
                    return;
                }
                this.sprite.body.enable = true;
                this.sprite.body.reset(gx, gy);
                this.scene.cameras.main.shake(200, 0.006);
                const d = Math.PI / 4;
                [d, 3 * d, 5 * d, 7 * d].forEach((a) => this.scene.spawnEnergyBall?.(gx, gy, a));
            }
        });
    }

    // Mantém a arma colada no robô (mesma posição/escala/flip).
    syncWeapon() {
        if (!this.weapon) {
            return;
        }
        this.weapon.setPosition(this.sprite.x, this.sprite.y)
            .setFlipX(this.sprite.flipX)
            .setDepth(this.sprite.depth + 1)
            .setVisible(this.sprite.visible);
    }

    shoot(player) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        if (this.weapon) {
            this.weapon.play(this.def.weaponKey, true).once("animationcomplete", () => {
                if (this.weapon && !this.disabled) this.weapon.setFrame(0);
            });
        }
        const mx = this.x + Math.cos(angle) * MUZZLE_OFFSET;
        const my = this.y + Math.sin(angle) * MUZZLE_OFFSET;
        const pellets = this.def.pellets ?? 1;

        if (pellets <= 1) {
            this.scene.spawnEnemyBullet?.(mx, my, angle);
            return;
        }
        // Rajada em leque (escopeta): `pellets` balas espalhadas em `spread` rad.
        const spread = this.def.spread ?? 0.5;
        for (let i = 0; i < pellets; i += 1) {
            const a = angle + (i / (pellets - 1) - 0.5) * spread;
            this.scene.spawnEnemyBullet?.(mx, my, a);
        }
    }

    // Golpe de melee ([F]): reduz o HP e, ao zerar, quebra (fica disabled).
    takeMeleeHit() {
        if (this.disabled) {
            return;
        }
        this.meleeHp -= 1;
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (!this.disabled) this.sprite.clearTint();
        });
        if (this.meleeHp <= 0) {
            this.disable();
        }
    }

    // Neutralizado (reprogramação ou melee): para e mostra o estado disabled.
    disable() {
        if (this.disabled) {
            return;
        }
        this.disabled = true;
        this.sprite.clearTint();
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.enable = false;
        this.sprite.play(this.def.disabledKey);
        this.weapon?.destroy();
        this.weapon = null;
    }

    reprogramPuzzle() {
        const p = this.def.disablePuzzle;
        return {
            title: `${this.def.name} // NÚCLEO`,
            briefing: [
                "Você invadiu o sistema do robô.",
                "Monte a instrução que o desliga antes",
                "que ele revide."
            ],
            successMessage: "ROBÔ DESATIVADO",
            ...p
        };
    }

    destroy() {
        this.weapon?.destroy();
        this.sprite?.destroy();
    }
}
