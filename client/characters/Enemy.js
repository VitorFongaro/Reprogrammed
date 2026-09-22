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
import carMove from "../assets/sprites/enemies/car/move.png";
import carActivate from "../assets/sprites/enemies/car/activate.png";
import carShoot from "../assets/sprites/enemies/car/shoot.png";
import carBroken from "../assets/sprites/enemies/car/broken.png";
import carProjectile from "../assets/sprites/enemies/car/projectile.png";
import Sfx from "../ui/Sfx";

// Inimigos dos capítulos 1 e 2 (packs SteamRobotsPack + biped_robot, quadros 32×32).
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
    "enemy-biped-disabled": { url: bipedDisabled, frames: 2 },
    "enemy-car-move": { url: carMove, frames: 4 },
    "enemy-car-activate": { url: carActivate, frames: 6, repeat: 0 },
    "enemy-car-shoot": { url: carShoot, frames: 5, repeat: 0 },
    "enemy-car-broken": { url: carBroken, frames: 4, repeat: 0 }
};

const TYPES = {
    exploding: {
        name: "ROBÔ EXPLOSIVO",
        walkKey: "enemy-exploding-walk",
        disabledKey: "enemy-exploding-disabled",
        scale: 3.3, speed: 130, meleeHp: 2, ranged: false, contactDamage: 5,
        dodge: ["fallExplode"],        // bullet hell: balas que caem e explodem.
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
        dodge: ["bigDropHoming"],      // bullet hell: bala grande que deixa perseguidoras.
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
        dodge: ["fan"],                // bullet hell: leque de balas.
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
        dodge: ["laserSweep"],         // bullet hell: rastro laser deixando balas.
        disablePuzzle: { variable: "sistema", expected: false,
            hint: "monte:  sistema = false", wrongValueMessage: "sistema ainda ativo",
            blockDistractors: { nome: ["motor", "servo"], op: ["=="], valor: ["true", '"false"'] } }
    },
    car: {
        name: "CARRO DE ATAQUE",
        walkKey: "enemy-car-move",
        disabledKey: "enemy-car-broken",
        scale: 3.3, speed: 95, meleeHp: 3, ranged: true, contactDamage: 3,
        // Carro: dirige pelo mapa; ao avistar a Artemis ATIVA a arma (torreta sobe)
        // e passa a ATIRAR mantendo distância (kite). Máquina de estados em updateCar.
        car: true, fireMs: 1500,
        detectRange: 360, fireRange: 400, kiteMin: 190, kiteMax: 320,
        activateKey: "enemy-car-activate",
        shootKey: "enemy-car-shoot",
        dodge: ["fan"],                // bullet hell da reprogramação.
        disablePuzzle: { variable: "arma", expected: false,
            hint: "monte:  arma = false", wrongValueMessage: "a arma ainda dispara",
            blockDistractors: { nome: ["torreta", "canhao"], op: ["=="], valor: ["true", '"false"'] } }
    },

    // === Capítulo 2 (condicionais) ============================================
    // Arte provisória: os sprites do cap. 1 com TINT (o SteamRobotsPack é cinza,
    // então girar a matiz não muda nada; o tint multiplica e colore). Trocar por
    // arte própria é só apontar walkKey/disabledKey para as folhas novas.
    // O COMPORTAMENTO de cada um é uma condicional que o jogador consegue ler
    // olhando para ele, e o puzzle de desligar é uma condicional de verdade
    // (ConditionalConsole: o jogo executa o que o jogador montou em testes).

    // VIGIA: não sai do lugar e só atira ENQUANTO a Artemis se mexe
    // ("se ela se move: fogo"). Parada, ela está segura, então dá para chegar
    // perto em pare-e-anda ou reprogramar de longe. Fica vermelha quando alerta.
    vigia: {
        name: "VIGIA",
        walkKey: "enemy-pistol-walk",
        disabledKey: "enemy-pistol-disabled",
        weaponKey: "enemy-pistol-weapon",
        tint: 0xffc04d, alertTint: 0xff5a5a,
        scale: 3.3, speed: 0, meleeHp: 2, ranged: true, fireMs: 650, contactDamage: 3,
        sentry: true,
        dodge: ["watchLight"],         // bullet hell: luz vermelha = não se mexa.
        disablePuzzle: {
            briefing: [
                "A vigia atira em tudo que se mexe.",
                "Faça ela ignorar a Artemis, mas continuar de guarda contra o resto."
            ],
            hint: 'monte:  se alvo == "artemis" :   atirar = false',
            lines: [
                "se [nome] [op] [valor] :",
                "    atirar = [valor]"
            ],
            blocks: { nome: ["alvo"], op: ["==", "!="], valor: ['"artemis"', "false", "true"] },
            defaults: { atirar: true },
            tests: [
                { given: { alvo: "artemis" }, expect: { atirar: false } },
                { given: { alvo: "intruso" }, expect: { atirar: true } }
            ],
            timeLimitMs: 24000
        }
    },

    // FAXINEIRO: robô de limpeza (a LEO, boss do capítulo, é a governanta deles).
    // Anda limpando à toa; se a Artemis chegar perto, trava, TELEGRAFA e dá uma
    // investida em linha reta. Depois fica tonto um instante: é a janela para
    // golpear ou reprogramar.
    faxineiro: {
        name: "FAXINEIRO",
        walkKey: "enemy-exploding-walk",
        disabledKey: "enemy-exploding-disabled",
        tint: 0x7dffb0,
        scale: 3.3, speed: 80, meleeHp: 3, ranged: false, contactDamage: 4,
        wander: true,
        dash: { range: 230, windupMs: 450, speed: 430, durationMs: 420, dizzyMs: 1000, cooldownMs: 2200 },
        dodge: ["fan", "bigDropHoming"],
        disablePuzzle: {
            briefing: [
                "Ele está quase sem bateria e não para de limpar.",
                "Mande-o recarregar quando a bateria estiver ABAIXO de 20."
            ],
            hint: 'monte:  se bateria < 20 :  modo = "recarga"  /  senão :  modo = "limpeza"',
            lines: [
                "se [nome] [op] [valor] :",
                "    modo = [valor]",
                "senão :",
                "    modo = [valor]"
            ],
            blocks: { nome: ["bateria"], op: ["<", ">", "=="], valor: ["20", "50", '"recarga"', '"limpeza"'] },
            tests: [
                { given: { bateria: 12 }, expect: { modo: "recarga" } },
                { given: { bateria: 20 }, expect: { modo: "limpeza" } },
                { given: { bateria: 85 }, expect: { modo: "limpeza" } }
            ],
            timeLimitMs: 30000
        }
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
        // Projétil do carro: sheet 16x8 = 2 quadros de 8x8 (animado).
        if (!scene.textures.exists("car-projectile")) {
            scene.load.spritesheet("car-projectile", carProjectile, { frameWidth: 8, frameHeight: 8 });
        }
        Sfx.preload(scene);   // sons dos inimigos (tiro, laser, bump do slam)
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
        if (scene.textures.exists("car-projectile") && !scene.anims.exists("car-projectile-anim")) {
            scene.anims.create({
                key: "car-projectile-anim",
                frames: scene.anims.generateFrameNumbers("car-projectile", { start: 0, end: 1 }),
                frameRate: 10,
                repeat: -1
            });
        }
    }

    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        Enemy.createAnimations(scene);

        // `options.overrides` ajusta o comportamento por instância sem tocar no
        // TYPES (ex.: um biped parado que só faz o slam, como guardião de sala).
        const base = TYPES[options.type] ?? TYPES.exploding;
        this.def = options.overrides ? { ...base, ...options.overrides } : base;
        this.type = options.type ?? "exploding";
        this.homeX = x;
        this.meleeHp = this.def.meleeHp;
        this.disabled = false;
        this.nextFire = 0;
        this.nextWander = 0;
        this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.nextSlam = 2000;
        this.jumping = false;
        this.carState = "patrol";

        this.sprite = scene.physics.add.sprite(x, y, this.def.walkKey, 0)
            .setScale(this.def.scale);
        this.sprite.play(this.def.walkKey);
        this.dashState = null;       // faxineiro: null | "windup" | "dash" | "dizzy".
        this.nextDash = 1500;
        if (this.def.car) {
            // O carro fica na parte BAIXA do quadro 32x32 (bbox ~x8-23, y23-31):
            // corpo sobre ele, centralizado no eixo x (o flip não desalinha).
            this.sprite.body.setSize(16, 10, false);
            this.sprite.body.setOffset(8, 22);
        } else {
            this.sprite.body.setSize(HITBOX, HITBOX, true);
        }
        this.sprite.setCollideWorldBounds(true);
        this.sprite.enemyRef = this;

        // Arma empunhada (robôs à distância): sobreposta 1:1, mira/dispara junto.
        if (this.def.weaponKey) {
            this.weapon = scene.add.sprite(x, y, this.def.weaponKey, 0).setScale(this.def.scale);
        }
        this.applyBaseTint();

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

        if (this.def.car) {
            this.updateCar(time, player);
            return;
        }
        if (this.def.sentry) {
            this.updateSentry(time, player);
            return;
        }
        if (this.def.dash && this.updateDash(time, player)) {
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

    // Vigia: parada, encara a Artemis e só atira ENQUANTO ela se move (o
    // corpo dela tem velocidade). O tint vermelho mostra quando está alerta.
    updateSentry(time, player) {
        this.sprite.body.setVelocity(0, 0);
        this.sprite.setFlipX(player.x < this.x);
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const moving = (player.body?.speed ?? 0) > 5;
        const alert = moving && dist <= FIRE_RANGE;
        if (alert !== this.alert) {
            this.alert = alert;
            this.applyBaseTint();
        }
        if (alert && time >= this.nextFire) {
            this.nextFire = time + this.def.fireMs;
            this.shoot(player);
        }
    }

    // Faxineiro: investida telegrafada. Devolve true enquanto a investida
    // controla o movimento (o update normal fica de fora).
    updateDash(time, player) {
        const cfg = this.def.dash;
        if (this.dashState === null) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist > cfg.range || time < this.nextDash) {
                return false;
            }
            // Trava e pisca branco: é o aviso. A mira fica presa na posição de AGORA.
            this.dashState = "windup";
            this.dashUntil = time + cfg.windupMs;
            this.dashAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            this.sprite.body.setVelocity(0, 0);
            this.sprite.setFlipX(player.x < this.x);
            this.sprite.setTint(0xffffff);
            return true;
        }
        if (time < this.dashUntil) {
            return true;
        }
        if (this.dashState === "windup") {
            this.dashState = "dash";
            this.dashUntil = time + cfg.durationMs;
            this.applyBaseTint();
            this.sprite.body.setVelocity(Math.cos(this.dashAngle) * cfg.speed, Math.sin(this.dashAngle) * cfg.speed);
        } else if (this.dashState === "dash") {
            this.dashState = "dizzy";
            this.dashUntil = time + cfg.dizzyMs;
            this.sprite.body.setVelocity(0, 0);
            this.sprite.anims.pause();
            this.scene.tweens.add({
                targets: this.sprite, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 3,
                onComplete: () => this.sprite.setAngle(0)
            });
        } else {
            this.dashState = null;
            this.nextDash = time + cfg.cooldownMs;
            this.sprite.anims.resume();
        }
        return true;
    }

    // Cor base do tipo (arte provisória do cap. 2) ou o vermelho de alerta da
    // vigia. Tipo sem tint: limpa.
    applyBaseTint() {
        const tint = this.alert && this.def.alertTint ? this.def.alertTint : this.def.tint;
        if (tint) {
            this.sprite.setTint(tint);
            this.weapon?.setTint(tint);
        } else {
            this.sprite.clearTint();
        }
    }

    // Carro: patrulha até avistar a Artemis; então ATIVA a arma (uma vez) e passa a
    // MANTER DISTÂNCIA (kite) atirando. Vira sempre encarando a Artemis.
    updateCar(time, player) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        this.sprite.setFlipX(player.x < this.x);

        if (this.carState === "activating") {
            this.sprite.body.setVelocity(0, 0);   // travado tocando a ativação.
            return;
        }

        if (this.carState !== "armed") {
            if (dist <= this.def.detectRange) {
                this.carState = "activating";
                this.sprite.body.setVelocity(0, 0);
                this.playOnce(this.def.activateKey, () => {
                    this.carState = "armed";
                    this.nextFire = time + 400;
                    if (!this.disabled) this.sprite.play(this.def.walkKey, true);
                });
                return;
            }
            this.wander(time);
            return;
        }

        // Armado: recua se estiver perto demais, aproxima se longe, para na distância boa.
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const s = this.def.speed;
        if (dist < this.def.kiteMin) {
            this.sprite.body.setVelocity(-Math.cos(angle) * s, -Math.sin(angle) * s);
        } else if (dist > this.def.kiteMax) {
            this.sprite.body.setVelocity(Math.cos(angle) * s * 0.85, Math.sin(angle) * s * 0.85);
        } else {
            this.sprite.body.setVelocity(0, 0);
        }

        if (time >= this.nextFire && dist <= this.def.fireRange) {
            this.nextFire = time + this.def.fireMs;
            this.carShoot(angle);
        }
    }

    carShoot(angle) {
        Sfx.play(this.scene, "laser", 0.7);   // tiro do carro (torreta)
        this.sprite.play(this.def.shootKey);
        this.sprite.once("animationcomplete", () => {
            if (!this.disabled && this.carState === "armed") {
                this.sprite.play(this.def.walkKey, true);
            }
        });
        const mx = this.x + Math.cos(angle) * MUZZLE_OFFSET;
        const my = this.y + Math.sin(angle) * MUZZLE_OFFSET;
        this.scene.spawnEnemyBullet?.(mx, my, angle, "car-projectile", 2.4);
    }

    playOnce(key, cb) {
        this.sprite.play(key);
        this.sprite.once("animationcomplete", cb);
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
                Sfx.play(this.scene, "bump");   // o biped atingiu o chão
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
        Sfx.play(this.scene, "gun", 0.7);   // tiro do inimigo com arma
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
            if (!this.disabled) this.applyBaseTint();
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
        this.alert = false;
        this.sprite.anims.resume();
        this.sprite.setAngle(0);
        this.applyBaseTint();
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
            // Puzzle de condicional (cap. 2) traz briefing/lines/tests próprios.
            ...p
        };
    }

    destroy() {
        this.weapon?.destroy();
        this.sprite?.destroy();
    }
}
