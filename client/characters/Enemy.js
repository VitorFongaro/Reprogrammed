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
import msgIdle from "../assets/sprites/enemies/mensageiro/idle.png";
import msgWake from "../assets/sprites/enemies/mensageiro/wake.png";
import msgWalk from "../assets/sprites/enemies/mensageiro/walk.png";
import msgCharge from "../assets/sprites/enemies/mensageiro/charge.png";
import msgShoot from "../assets/sprites/enemies/mensageiro/shoot.png";
import msgDisabled from "../assets/sprites/enemies/mensageiro/disabled.png";
import msgDash from "../assets/sprites/enemies/mensageiro/dash.png";
import varIdle from "../assets/sprites/enemies/varredor/idle.png";
import varScan from "../assets/sprites/enemies/varredor/scan.png";
import varWalkScan from "../assets/sprites/enemies/varredor/walk_scan.png";
import varDeath from "../assets/sprites/enemies/varredor/death.png";
import semWalk from "../assets/sprites/enemies/semeador/walk.png";
import semDrop from "../assets/sprites/enemies/semeador/drop.png";
import semCapsule from "../assets/sprites/enemies/semeador/capsule.png";
import semDisabled from "../assets/sprites/enemies/semeador/disabled.png";
import Sfx from "../ui/Sfx";
import Juice from "../ui/Juice";
import { ENEMY_DISABLE, resolvePuzzle } from "../data/puzzleVariants";

// Inimigos dos capítulos 1 e 2 (packs SteamRobotsPack + biped_robot, quadros 32×32).
// Cada inimigo anda/persegue a Artemis e ataca (contato ou tiro), tirando HP da
// sala. Os robôs à distância EMPUNHAM uma arma (pistola/escopeta, folha própria
// sobreposta 1:1 no robô, mira e dispara). Neutraliza-se de dois modos:
//   • REPROGRAMAR ([R] mira com o mouse → batalha de reprogramação);
//   • MELEE ([F] perto dele — placeholder até a animação de ataque da Artemis).
// Ao ser neutralizado toca `disabled` e para. Colisão/tiro/dano são geridos pela
// cena (BaseRoomScene).

const FRAME = 32;
const RECOIL_PX = 8;          // tranco ao levar um [F]

// [chave] -> { url, quadros, fw?/fh? (tamanho do quadro, default 32),
//              repeat? (default -1), fps? }.
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
    "enemy-car-broken": { url: carBroken, frames: 4, repeat: 0 },
    // MENSAGEIRO (cap. 2): pack "Bot Wheel", quadros de 36x32 (ver
    // tools/mensageiro_sheets.py — o pack vem em tira vertical de 117x26).
    "enemy-mensageiro-idle": { url: msgIdle, frames: 1, fw: 36 },
    "enemy-mensageiro-wake": { url: msgWake, frames: 5, fw: 36, repeat: 0, fps: 10 },
    "enemy-mensageiro-walk": { url: msgWalk, frames: 8, fw: 36, fps: 12 },
    "enemy-mensageiro-charge": { url: msgCharge, frames: 4, fw: 36, repeat: 0, fps: 8 },
    "enemy-mensageiro-shoot": { url: msgShoot, frames: 4, fw: 36, repeat: 0 },
    "enemy-mensageiro-disabled": { url: msgDisabled, frames: 6, fw: 36, repeat: 0, fps: 10 },
    // Rastro da investida a gás: quadro LARGO (117), desenhado como sprite
    // separado atrás do robô — ver DASH_ANCHOR_X e showDashTrail.
    "enemy-mensageiro-dash": { url: msgDash, frames: 6, fw: 117, repeat: 0, fps: 12 },
    // DRONES do cap. 3 (Free Drones Pack, CraftPix; tools/drones_sheets.py),
    // quadros de 48x48 e vistos de lado: voam, então funcionam na sala vista de cima.
    "enemy-varredor-idle": { url: varIdle, frames: 4, fw: 48, fh: 48 },
    "enemy-varredor-scan": { url: varScan, frames: 8, fw: 48, fh: 48, fps: 12 },
    "enemy-varredor-walk": { url: varWalkScan, frames: 8, fw: 48, fh: 48, fps: 10 },
    "enemy-varredor-death": { url: varDeath, frames: 6, fw: 48, fh: 48, repeat: 0, fps: 10 },
    "enemy-semeador-walk": { url: semWalk, frames: 4, fw: 48, fh: 48 },
    "enemy-semeador-drop": { url: semDrop, frames: 6, fw: 48, fh: 48, repeat: 0, fps: 12 },
    "enemy-semeador-capsule": { url: semCapsule, frames: 6, fw: 48, fh: 48, repeat: 0, fps: 12 },
    "enemy-semeador-disabled": { url: semDisabled, frames: 1, fw: 48, fh: 48 }
};

// No desenho do rastro, o robô está em x=100 de 117 (o resto é o gás saindo
// para trás). Usar isso como origem do sprite recompõe o quadro do pack em
// cima do robô, onde quer que ele esteja.
const DASH_FRAME = { w: 117, h: 32, anchor: 100 };
const DASH_ANCHOR_X = DASH_FRAME.anchor / DASH_FRAME.w;

const TYPES = {
    exploding: {
        name: "ROBÔ EXPLOSIVO",
        walkKey: "enemy-exploding-walk",
        disabledKey: "enemy-exploding-disabled",
        scale: 3.3, speed: 130, meleeHp: 2, ranged: false, contactDamage: 5,
        dodge: ["fallExplode"],        // bullet hell: balas que caem e explodem.
        disablePuzzle: ENEMY_DISABLE.exploding
    },
    pistol: {
        name: "ROBÔ PISTOLEIRO",
        walkKey: "enemy-pistol-walk",
        disabledKey: "enemy-pistol-disabled",
        weaponKey: "enemy-pistol-weapon",
        scale: 3.3, speed: 100, meleeHp: 2, ranged: true, fireMs: 1800, contactDamage: 3,
        dodge: ["bigDropHoming"],      // bullet hell: bala grande que deixa perseguidoras.
        disablePuzzle: ENEMY_DISABLE.pistol
    },
    shotgun: {
        name: "ROBÔ ESCOPETA",
        walkKey: "enemy-shotgun-walk",
        disabledKey: "enemy-shotgun-disabled",
        weaponKey: "enemy-shotgun-weapon",
        scale: 3.3, speed: 90, meleeHp: 3, ranged: true, fireMs: 2500, contactDamage: 4,
        pellets: 5, spread: 0.6,       // rajada de 5 balas em leque.
        dodge: ["fan"],                // bullet hell: leque de balas.
        disablePuzzle: ENEMY_DISABLE.shotgun
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
        disablePuzzle: ENEMY_DISABLE.biped
    },
    car: {
        name: "CARRO DE ATAQUE",
        walkKey: "enemy-car-move",
        disabledKey: "enemy-car-broken",
        scale: 3.3, speed: 95, meleeHp: 3, ranged: true, contactDamage: 3,
        // Carro (cap. 3): dirige pelo mapa; ao avistar a Artemis ATIVA a arma
        // (torreta sobe) e passa a manter distância (kite). Atira em RAJADA: a
        // mesma bala `burst` vezes seguidas e depois recarrega por `fireMs` - a
        // repetição que o jogador lê olhando, e a recarga é a janela para chegar
        // perto. Máquina de estados em updateCar.
        car: true, fireMs: 2600, burst: 3, burstGapMs: 170,
        detectRange: 360, fireRange: 400, kiteMin: 190, kiteMax: 320,
        activateKey: "enemy-car-activate",
        shootKey: "enemy-car-shoot",
        dodge: ["fan", "bigDropHoming"],   // bullet hell da reprogramação.
        disablePuzzle: ENEMY_DISABLE.car
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
        disablePuzzle: ENEMY_DISABLE.vigia
    },

    // FAXINEIRO: robô de limpeza (a LEO, pré-boss do capítulo, é a governanta deles).
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
        disablePuzzle: ENEMY_DISABLE.faxineiro
    },

    // MENSAGEIRO: robô de entregas de uma roda só. Único do cap. 2 com ARTE
    // PRÓPRIA (pack "Bot Wheel"), então não leva tint.
    // Fica DORMENTE num canto (sprite fechado, sem a roda e sem o braço): não
    // anda, não atira e dá para reprogramar à vontade. Se a Artemis passar
    // dentro de `wakeRange`, ele desdobra e acorda — a condicional mais literal
    // do capítulo: enquanto a condição é falsa, nada acontece.
    // Acordado, ele MANTÉM DISTÂNCIA e ataca com um tiro CARREGADO: para,
    // acende o braço (telegrafo) e só então dispara, na mira travada em onde ela
    // estava. Ficar parada é o que mata aqui - o oposto exato da vigia.
    // E de vez em quando ele vem por cima: a INVESTIDA A GÁS (`startDash` ->
    // `launchDash`) trava, pisca branco e sai em disparada EM CIMA DELA, no
    // ângulo travado no aviso - dá para sair da frente. O rastro do pack fica
    // no chão cobrindo o trajeto, e ele chega OFEGANTE do outro lado (parado,
    // sem atirar): é a janela para golpear ou reprogramar.
    mensageiro: {
        name: "MENSAGEIRO",
        walkKey: "enemy-mensageiro-walk",
        disabledKey: "enemy-mensageiro-disabled",
        idleKey: "enemy-mensageiro-idle",
        wakeKey: "enemy-mensageiro-wake",
        chargeKey: "enemy-mensageiro-charge",
        shootKey: "enemy-mensageiro-shoot",
        dashKey: "enemy-mensageiro-dash",
        scale: 3, speed: 150, meleeHp: 3, ranged: true, contactDamage: 3,
        courier: true,
        wakeRange: 250, fireMs: 2000, fireRange: 430, muzzle: 34,
        kiteMin: 200, kiteMax: 340,
        // Investida: alcance útil ~224px (speed * durationMs), então a faixa de
        // disparo é calibrada para ela às vezes passar por dentro da Artemis.
        gasDash: {
            rangeMin: 150, rangeMax: 340, windupMs: 380,
            speed: 560, durationMs: 400, windedMs: 750, cooldownMs: 3400
        },
        dodge: ["laserLane", "fan"],    // bullet hell: laser na faixa avisada + leque.
        disablePuzzle: ENEMY_DISABLE.mensageiro
    },

    // === Capítulo 3 (repetições) ==============================================
    // Cada comportamento é um LAÇO que o jogador lê olhando: a rajada do carro
    // (a mesma bala N vezes), o varredor (atira ENQUANTO enxerga), o semeador
    // (uma cápsula PARA CADA ponto da rota) e o mech que pula em sequência
    // (biped com `slamRepeat`, configurado na sala). O puzzle de desligar é um
    // laço de verdade (ConditionalConsole).

    // VARREDOR: drone com um cone de varredura que gira devagar. Enquanto a
    // Artemis estiver DENTRO do cone, ele para e atira sem parar, virando o cone
    // atrás dela mais devagar do que ela corre: sair de lado é a saída. Fora do
    // cone, nada acontece. O cone fica desenhado no chão (updateScanner).
    varredor: {
        name: "VARREDOR",
        walkKey: "enemy-varredor-walk",
        disabledKey: "enemy-varredor-death",
        scanKey: "enemy-varredor-scan",
        scale: 2, speed: 45, meleeHp: 3, ranged: true, contactDamage: 3,
        wander: true,
        scanner: { range: 300, halfAngle: 0.32, turnSpeed: 0.9, trackSpeed: 1.1, fireMs: 300 },
        body: { w: 24, h: 16, ox: 12, oy: 18 },
        portraitScale: 0.67,
        dodge: ["laserSweep", "bigDropHoming"],
        disablePuzzle: ENEMY_DISABLE.varredor
    },

    // SEMEADOR: drone que percorre uma ROTA fixa (`route`, passada pela sala) e,
    // para cada ponto dela, larga uma cápsula. A cápsula arma com um anel
    // crescendo no chão e explode na área do anel. Não persegue ninguém: o
    // perigo é o caminho, que se repete.
    semeador: {
        name: "SEMEADOR",
        walkKey: "enemy-semeador-walk",
        disabledKey: "enemy-semeador-disabled",
        dropKey: "enemy-semeador-drop",
        capsuleKey: "enemy-semeador-capsule",
        scale: 2, speed: 120, meleeHp: 2, ranged: false, contactDamage: 3,
        seeder: { armMs: 1500, radius: 70, damage: 4 },
        body: { w: 22, h: 16, ox: 13, oy: 16 },
        portraitScale: 0.67,
        dodge: ["fallExplode", "fan"],
        disablePuzzle: ENEMY_DISABLE.semeador
    }
};

const CHASE_RANGE = 340;        // distância para começar a perseguir.
const FIRE_RANGE = 400;         // alcance de tiro (ranged).
const MUZZLE_OFFSET = 26;       // saída da bala, à frente do robô.
const HITBOX = 20;

export default class Enemy {
    // Folha de andar e tint de um tipo, para quem mostra o robô fora da sala
    // (o retrato da ReprogramScene). Montar a chave pelo nome do tipo não serve:
    // vigia e faxineiro reusam folhas de outros tipos, e o carro "anda" na move.
    static look(type) {
        const def = TYPES[type] ?? TYPES.exploding;
        // Folha maior que 32 (os drones, 48) encolhe o retrato na mesma proporção.
        return { walkKey: def.walkKey, tint: def.tint, portraitScale: def.portraitScale ?? 1 };
    }

    static preload(scene) {
        Object.entries(SHEETS).forEach(([key, def]) => {
            if (!scene.textures.exists(key)) {
                scene.load.spritesheet(key, def.url, {
                    frameWidth: def.fw ?? FRAME,
                    frameHeight: def.fh ?? FRAME
                });
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
                frameRate: def.fps ?? (def.frames > 1 ? (def.repeat === 0 ? 16 : 8) : 1),
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
        this.nextGasDash = 0;        // mensageiro: recarga da investida a gás.
        // mensageiro: "asleep" | "waking" | "active" | "charging" | "revving" |
        // "dashing" | "winded" (ver updateCourier). Dormente ele
        // fica no sprite fechado, com um respiro de alpha para não virar só mais
        // um vulto no chão escuro (e para dar a entender que ainda está ligado).
        this.courierState = this.def.courier ? "asleep" : null;
        if (this.courierState) {
            this.sprite.play(this.def.idleKey);
            this.standbyTween = scene.tweens.add({
                targets: this.sprite, alpha: 0.7, duration: 1100, yoyo: true, repeat: -1
            });
        }
        if (this.def.car) {
            // O carro fica na parte BAIXA do quadro 32x32 (bbox ~x8-23, y23-31):
            // corpo sobre ele, centralizado no eixo x (o flip não desalinha).
            this.sprite.body.setSize(16, 10, false);
            this.sprite.body.setOffset(8, 22);
        } else if (this.def.body) {
            // Folha de 48 (drones): corpo sobre o desenho, não no quadro inteiro.
            const b = this.def.body;
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.ox, b.oy);
        } else {
            this.sprite.body.setSize(HITBOX, HITBOX, true);
        }
        if (this.def.scanner) {
            this.scanAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            this.scanCone = scene.add.graphics().setDepth(2);
        }
        if (this.def.seeder) {
            this.routeIndex = 0;
            this.capsules = [];
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
            // Pelo tamanho REAL do sprite: nem toda folha é 32x32 (o mensageiro
            // é 36 de largura).
            w: this.sprite.displayWidth * 0.7,
            h: this.sprite.displayHeight * 0.7,
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
        if (this.def.courier) {
            this.updateCourier(time, player);
            return;
        }
        if (this.def.scanner) {
            this.updateScanner(time, player);
            return;
        }
        if (this.def.seeder) {
            this.updateSeeder();
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

    // Mensageiro: dorme até alguém passar perto; acordado, mantém distância e
    // ataca com tiro carregado. Cada estado trava o movimento por conta própria,
    // então o update normal não roda para ele.
    updateCourier(time, player) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (this.courierState === "asleep") {
            this.sprite.body.setVelocity(0, 0);
            if (dist <= this.def.wakeRange) {
                this.sprite.setFlipX(player.x < this.x);   // acorda encarando quem chegou.
                this.wakeCourier(time);
            }
            return;
        }

        // Engasgando antes de sair: parado, mira travada (ver startDash).
        if (this.courierState === "revving") {
            if (time < this.courierUntil) {
                return;
            }
            this.launchDash(time);
            return;
        }
        // Em disparada: a velocidade já está posta, só o relógio manda. No fim
        // ele chega ofegante (parado, sem atirar) - a janela do jogador.
        if (this.courierState === "dashing") {
            if (time < this.courierUntil) {
                this.revealTrail((this.courierUntil - time) / this.def.gasDash.durationMs);
                return;
            }
            this.trail?.setCrop();      // chegou: o rastro inteiro fica à mostra.
            this.courierState = "winded";
            this.courierUntil = time + this.def.gasDash.windedMs;
            this.sprite.body.setVelocity(0, 0);
            this.sprite.anims.pause();
            return;
        }
        if (this.courierState === "winded") {
            if (time < this.courierUntil) {
                return;
            }
            this.courierState = "active";
            this.nextGasDash = time + this.def.gasDash.cooldownMs;
            this.sprite.anims.resume();
            return;
        }
        // Acordando ou carregando: parado, esperando a animação terminar.
        if (this.courierState !== "active") {
            this.sprite.body.setVelocity(0, 0);
            return;
        }

        this.sprite.setFlipX(player.x < this.x);

        // INVESTIDA: vem em cima dela. Só a certa distância (perto demais não dá
        // tempo de ler o aviso, longe demais ele nem alcança) e com recarga,
        // senão o kite nunca acontece e vira atropelamento em looping.
        const gd = this.def.gasDash;
        if (time >= this.nextGasDash && dist >= gd.rangeMin && dist <= gd.rangeMax) {
            this.startDash(time, player);
            return;
        }

        // Recua se ela chega perto, aproxima se ela foge, para no meio-termo.
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const s = this.def.speed;
        if (dist < this.def.kiteMin) {
            this.sprite.body.setVelocity(-Math.cos(angle) * s, -Math.sin(angle) * s);
        } else if (dist > this.def.kiteMax) {
            this.sprite.body.setVelocity(Math.cos(angle) * s * 0.8, Math.sin(angle) * s * 0.8);
        } else {
            this.sprite.body.setVelocity(0, 0);
        }

        if (time >= this.nextFire && dist <= this.def.fireRange) {
            this.chargedShot(angle);
        }
    }

    wakeCourier(time) {
        this.courierState = "waking";
        this.standbyTween?.remove();
        this.standbyTween = null;
        this.sprite.setAlpha(1);
        this.nextFire = time + 900;      // um respiro antes do primeiro tiro.
        this.playOnce(this.def.wakeKey, () => {
            if (this.disabled) {
                return;
            }
            this.courierState = "active";
            this.sprite.play(this.def.walkKey, true);
        });
    }

    // Investida a gás, parte 1: ele TRAVA, encara a Artemis e pisca branco. A
    // mira fica presa na posição de agora — sem este aviso, um atropelamento a
    // 560px/s seria só dano sem resposta.
    startDash(time, player) {
        this.courierState = "revving";
        this.courierUntil = time + this.def.gasDash.windupMs;
        this.dashAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.sprite.body.setVelocity(0, 0);
        this.sprite.setFlipX(Math.cos(this.dashAngle) < 0);
        this.sprite.setTint(0xffffff);
    }

    // Parte 2: sai em cima dela, no ângulo travado. Bater numa parede no meio do
    // caminho não atrapalha — quem encerra a investida é o relógio, não a
    // distância percorrida.
    launchDash(time) {
        const cfg = this.def.gasDash;
        const a = this.dashAngle;
        this.courierState = "dashing";
        this.courierUntil = time + cfg.durationMs;
        this.applyBaseTint();
        this.sprite.body.setVelocity(Math.cos(a) * cfg.speed, Math.sin(a) * cfg.speed);
        this.sprite.play(this.def.walkKey, true);
        Sfx.play(this.scene, "bump", 0.5);

        // O rastro fica no MUNDO, cobrindo o caminho que ele vai percorrer, e
        // dissipa ali sozinho — gás não anda junto com quem o soltou. Por isso a
        // âncora é o ponto de CHEGADA: o desenho do pack tem o robô na ponta do
        // risco, então ancorar no fim faz o rastro cair exatamente sobre o
        // trajeto (e o quadro original se recompor quando ele chega).
        const b = this.scene.bounds;
        const reach = (cfg.speed * cfg.durationMs) / 1000;
        this.showDashTrail(
            Phaser.Math.Clamp(this.x + Math.cos(a) * reach, b.x, b.x + b.w),
            Phaser.Math.Clamp(this.y + Math.sin(a) * reach, b.y, b.y + b.h),
            a
        );
    }

    // O rastro é um sprite à parte, com a origem no ponto em que o artista
    // desenhou o robô. Gira com a investida; nos ângulos para a esquerda a
    // rotação jogaria o gás para cima, e o flipY devolve ele para baixo.
    showDashTrail(x, y, angle) {
        if (!this.trail) {
            this.trail = this.scene.add.sprite(x, y, this.def.dashKey, 0)
                .setOrigin(DASH_ANCHOR_X, 0.5)
                .setScale(this.def.scale);
            this.trail.on("animationcomplete", () => this.trail?.setVisible(false));
        }
        this.trail.setPosition(x, y)
            .setRotation(angle)
            .setFlipY(Math.cos(angle) < 0)
            .setDepth(y + 39)
            .setVisible(true);
        this.revealTrail(1);          // nasce recortado: nada de gás antes da largada.
        this.trail.play(this.def.dashKey);
    }

    // O gás só existe onde ele JÁ passou. Como a âncora do rastro é o ponto de
    // CHEGADA, o risco inteiro apareceria de saída, antes de o robô sair do
    // lugar — então ele nasce recortado e vai sendo revelado conforme a
    // investida avança. `remaining` é a fração que ainda falta percorrer.
    revealTrail(remaining) {
        if (!this.trail?.visible) {
            return;
        }
        const cfg = this.def.gasDash;
        const reachTex = (cfg.speed * cfg.durationMs) / 1000 / this.def.scale;
        const w = Phaser.Math.Clamp(DASH_FRAME.anchor - reachTex * remaining, 0, DASH_FRAME.w);
        this.trail.setCrop(0, 0, w, DASH_FRAME.h);
    }

    // Tiro CARREGADO: para, acende o braço e só então dispara. A mira fica
    // TRAVADA no ângulo do começo da carga — quem continuar andando escapa.
    chargedShot(angle) {
        this.courierState = "charging";
        this.sprite.body.setVelocity(0, 0);
        this.playOnce(this.def.chargeKey, () => {
            if (this.disabled) {
                return;
            }
            Sfx.play(this.scene, "laser", 0.7);
            const d = this.def.muzzle ?? MUZZLE_OFFSET;
            this.scene.spawnEnemyBullet?.(
                this.x + Math.cos(angle) * d, this.y + Math.sin(angle) * d, angle
            );
            this.playOnce(this.def.shootKey, () => {
                if (this.disabled) {
                    return;
                }
                this.courierState = "active";
                this.nextFire = this.scene.time.now + this.def.fireMs;
                this.sprite.play(this.def.walkKey, true);
            });
        });
    }

    // Cor base do tipo (arte provisória do cap. 2) ou o vermelho de alerta da
    // vigia. Tipo sem tint: limpa.
    applyBaseTint() {
        const tint = this.alert && this.def.alertTint ? this.def.alertTint : this.def.tint;
        if (tint) {
            this.sprite.setTint(tint).setTintMode(Phaser.TintModes.MULTIPLY);
            this.weapon?.setTint(tint);
        } else {
            this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
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
            this.carBurst();
        }
    }

    // A mesma bala `burst` vezes, mirando de novo em cada uma.
    carBurst() {
        const shots = this.def.burst ?? 1;
        for (let k = 0; k < shots; k += 1) {
            this.scene.time.delayedCall(k * (this.def.burstGapMs ?? 160), () => {
                const player = this.scene.player?.sprite;
                if (this.disabled || this.carState !== "armed" || !player) {
                    return;
                }
                this.carShoot(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y));
            });
        }
    }

    // VARREDOR: o cone gira; com a Artemis dentro, ele para, segue ela devagar e
    // atira sem parar (enquanto a vê). `dt` sai do relógio do próprio update.
    updateScanner(time, player) {
        const cfg = this.def.scanner;
        const dt = Math.min(0.1, (time - (this.lastScan ?? time)) / 1000);
        this.lastScan = time;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const diff = Phaser.Math.Angle.Wrap(toPlayer - this.scanAngle);
        const seen = dist <= cfg.range && Math.abs(diff) <= cfg.halfAngle;

        if (seen) {
            const step = cfg.trackSpeed * dt;
            this.scanAngle += Phaser.Math.Clamp(diff, -step, step);
            this.sprite.body.setVelocity(0, 0);
            if (time >= this.nextFire) {
                this.nextFire = time + cfg.fireMs;
                Sfx.play(this.scene, "laser", 0.4);
                this.scene.spawnEnemyBullet?.(
                    this.x + Math.cos(toPlayer) * 22, this.y + Math.sin(toPlayer) * 22, toPlayer
                );
            }
        } else {
            this.scanAngle += cfg.turnSpeed * dt;
            this.wander(time);
        }
        if (seen !== this.locked) {
            this.locked = seen;
            this.sprite.play(seen ? this.def.scanKey : this.def.walkKey, true);
            // O primeiro tiro sai um instante depois de travar: dá para ver o
            // cone acender antes de levar.
            if (seen) this.nextFire = time + 250;
        }
        this.drawScanCone();
    }

    drawScanCone() {
        const g = this.scanCone;
        if (!g) return;
        const cfg = this.def.scanner;
        g.clear();
        if (this.disabled) return;
        const steps = 10;
        const points = [{ x: this.x, y: this.y }];
        for (let k = 0; k <= steps; k += 1) {
            const a = this.scanAngle - cfg.halfAngle + (2 * cfg.halfAngle * k) / steps;
            points.push({ x: this.x + Math.cos(a) * cfg.range, y: this.y + Math.sin(a) * cfg.range });
        }
        g.fillStyle(0xff4545, this.locked ? 0.26 : 0.1);
        g.fillPoints(points, true);
        g.lineStyle(2, 0xff4545, this.locked ? 0.8 : 0.35);
        g.strokePoints(points, true);
    }

    // SEMEADOR: vai de ponto em ponto da rota; em cada um para, toca a soltura
    // e larga uma cápsula. Depois do último, recomeça do primeiro.
    updateSeeder() {
        const route = this.def.route;
        if (!route?.length) {
            this.wander(this.scene.time.now);
            return;
        }
        if (this.seeding) {
            this.sprite.body.setVelocity(0, 0);
            return;
        }
        const target = route[this.routeIndex % route.length];
        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        // Preso atrás de alguma coisa (a Artemis no caminho, um colisor): larga a
        // cápsula onde está em vez de ficar empurrando para sempre.
        const now = this.scene.time.now;
        if (this.routeTarget !== this.routeIndex) {
            this.routeTarget = this.routeIndex;
            this.routeDeadline = now + 6000;
        }
        if (dist < 10 || now > this.routeDeadline) {
            this.seeding = true;
            this.sprite.body.setVelocity(0, 0);
            this.playOnce(this.def.dropKey, () => {
                if (this.disabled) return;
                this.dropCapsule(this.x, this.y + 26);
                this.routeIndex += 1;
                this.seeding = false;
                this.sprite.play(this.def.walkKey, true);
            });
            return;
        }
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const s = Math.min(this.def.speed, dist * 6);
        this.sprite.body.setVelocity(Math.cos(angle) * s, Math.sin(angle) * s);
        if (Math.abs(this.sprite.body.velocity.x) > 1) {
            this.sprite.setFlipX(this.sprite.body.velocity.x < 0);
        }
    }

    // Cápsula: anel crescendo no chão (o aviso de onde vai doer), abre no fim e
    // explode na área do anel. Desligar o semeador desarma as que sobraram.
    dropCapsule(x, y) {
        const s = this.scene;
        const cfg = this.def.seeder;
        const capsule = s.add.sprite(x, y, this.def.capsuleKey, 0)
            .setScale(this.def.scale * 0.75).setOrigin(0.5, 0.85).setDepth(y);
        const ring = s.add.circle(x, y, cfg.radius, 0xff4545, 0.08)
            .setStrokeStyle(2, 0xff4545, 0.7).setDepth(3).setScale(0.15);
        const grow = s.tweens.add({ targets: ring, scale: 1, duration: cfg.armMs, ease: "Sine.easeIn" });
        const entry = { capsule, ring };
        this.capsules.push(entry);
        const openAt = s.time.delayedCall(Math.max(0, cfg.armMs - 500), () => capsule.play(this.def.capsuleKey));
        const boom = s.time.delayedCall(cfg.armMs, () => {
            this.capsules = this.capsules.filter((c) => c !== entry);
            capsule.destroy();
            ring.destroy();
            Juice.impact(s, x, y - 6, { color: 0xff6a3d, size: 2.2 });
            Sfx.play(s, "bump", 0.6);
            s.cameras.main.shake(120, 0.003);
            const p = s.player?.sprite;
            if (p && Phaser.Math.Distance.Between(x, y, p.x, p.y) <= cfg.radius) {
                s.damagePlayer?.(cfg.damage);
            }
        });
        entry.defuse = () => {
            grow.remove();
            openAt.remove();
            boom.remove();
            s.tweens.add({
                targets: [capsule, ring], alpha: 0, duration: 300,
                onComplete: () => { capsule.destroy(); ring.destroy(); }
            });
        };
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
    // Com `slamRepeat` (o mech do cap. 3), repete o pulo em sequência, cada um
    // com as bolas giradas 22,5 graus: a brecha de um pulo é onde cai o próximo.
    slamAttack(hop = 0) {
        if (this.disabled || !this.sprite.body) {
            this.jumping = false;
            return;
        }
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
                if (this.disabled || !this.sprite.body) {
                    this.jumping = false;
                    return;
                }
                this.sprite.body.enable = true;
                this.sprite.body.reset(gx, gy);
                Sfx.play(this.scene, "bump");   // o biped atingiu o chão
                this.scene.cameras.main.shake(200, 0.006);
                const d = Math.PI / 4;
                const turn = hop * (Math.PI / 8);
                [d, 3 * d, 5 * d, 7 * d].forEach((a) => this.scene.spawnEnergyBall?.(gx, gy, a + turn));
                // Ainda tem pulo na sequência: continua "pulando" (o update fica de fora).
                if (hop + 1 < (this.def.slamRepeat ?? 1)) {
                    this.scene.time.delayedCall(this.def.slamGapMs ?? 240, () => this.slamAttack(hop + 1));
                } else {
                    this.jumping = false;
                }
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
    // Devolve se o golpe CONECTOU (a sala só toca o impacto quando conecta).
    takeMeleeHit() {
        if (this.disabled) {
            return false;
        }
        this.meleeHp -= 1;
        // Bater num mensageiro dormindo ACORDA ele: senão dava para desmontá-lo
        // de graça, e o gatilho dele deixaria de ser um gatilho.
        if (this.courierState === "asleep") {
            this.wakeCourier(this.scene.time.now);
        }
        this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        this.scene.time.delayedCall(80, () => {
            if (!this.disabled) this.applyBaseTint();
        });
        this.recoil();
        if (this.meleeHp <= 0) {
            this.disable();
        }
        return true;
    }

    // Tranco para trás ao levar o golpe (vai e volta, então não empurra o robô
    // para dentro de parede nenhuma).
    recoil() {
        const player = this.scene.player?.sprite;
        if (!player) return;
        const angle = Phaser.Math.Angle.Between(player.x, player.y, this.sprite.x, this.sprite.y);
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + Math.cos(angle) * RECOIL_PX,
            y: this.sprite.y + Math.sin(angle) * RECOIL_PX,
            duration: 70, yoyo: true, ease: "Quad.easeOut"
        });
    }

    // Neutralizado (reprogramação ou melee): para e mostra o estado disabled.
    disable() {
        if (this.disabled) {
            return;
        }
        this.disabled = true;
        this.alert = false;
        this.courierState = null;
        this.standbyTween?.remove();
        this.standbyTween = null;
        this.trail?.setVisible(false);
        this.sprite.setAlpha(1);
        this.sprite.anims.resume();
        this.sprite.setAngle(0);
        this.applyBaseTint();
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.enable = false;
        this.sprite.play(this.def.disabledKey);
        this.weapon?.destroy();
        this.weapon = null;
        this.scanCone?.clear();
        this.capsules?.forEach((c) => c.defuse());
        this.capsules = [];
        this.scene.onEnemyDisabled?.(this);
    }

    reprogramPuzzle() {
        // Sorteia a variação a cada abertura (data/puzzleVariants.js).
        const p = resolvePuzzle(this.def.disablePuzzle);
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
        this.standbyTween?.remove();
        this.scanCone?.destroy();
        this.trail?.destroy();
        this.weapon?.destroy();
        this.sprite?.destroy();
    }
}
