import Phaser from "phaser";
import walkSouthUrl from "../assets/sprites/artemis/walk-south.png";
import walkEastUrl from "../assets/sprites/artemis/walk-east.png";
import walkNorthUrl from "../assets/sprites/artemis/walk-north.png";

const DEFAULT_SPEED = 220;
// Corrida (segurando Shift): mais velocidade e a mesma animação de passos
// acelerada via timeScale (até haver um ciclo de corrida dedicado do template).
const DEFAULT_RUN_SPEED = 330;
const RUN_ANIM_TIMESCALE = 1.6;
const DEFAULT_SCALE = 3;

// Sprite da Artemis (template Eris Esra 16x32): quadros de 32x32 com a arte
// ocupando o miolo e os pés no fundo do quadro (y≈31). O oeste é o leste
// espelhado em runtime (flipX). Direções pintadas: sul, leste, norte.
const FRAME_W = 32;
const FRAME_H = 32;
const WALK_FPS = 10;              // 100ms/quadro (timing do template).
const ART_FEET_Y = 31;           // linha dos pés no quadro (para hitbox e y-sort).
const BODY_WIDTH = 14;
const BODY_HEIGHT = 8;

const SHEETS = {
    "maid-walk-south": walkSouthUrl,
    "maid-walk-east": walkEastUrl,
    "maid-walk-north": walkNorthUrl
};

// Direção -> textura/animação + espelhamento horizontal.
const DIR = {
    south: { key: "maid-walk-south", flip: false },
    north: { key: "maid-walk-north", flip: false },
    east: { key: "maid-walk-east", flip: false },
    west: { key: "maid-walk-east", flip: true }
};

const DIRECTION_KEYS = {
    KeyW: "north",
    KeyA: "west",
    KeyS: "south",
    KeyD: "east"
};

const DIRECTION_VELOCITY = {
    north: { x: 0, y: -1 },
    west: { x: -1, y: 0 },
    south: { x: 0, y: 1 },
    east: { x: 1, y: 0 }
};

export default class PlayerCharacter {
    static preload(scene) {
        Object.entries(SHEETS).forEach(([key, url]) => {
            if (!scene.textures.exists(key)) {
                scene.load.spritesheet(key, url, { frameWidth: FRAME_W, frameHeight: FRAME_H });
            }
        });
    }

    static createAnimations(scene) {
        Object.values(DIR).forEach(({ key }) => {
            if (scene.anims.exists(key)) {
                return;
            }
            scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers(key),
                frameRate: WALK_FPS,
                repeat: -1
            });
        });
    }

    // Textura de repouso de uma direção (quadro 0) — usada por cutscenes que
    // mostram a androide parada (IntroScene, SaguaoScene).
    static idleTexture(direction = "south") {
        return DIR[direction]?.key ?? DIR.south.key;
    }

    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        this.speed = options.speed ?? DEFAULT_SPEED;
        this.runSpeed = options.runSpeed ?? DEFAULT_RUN_SPEED;
        this.timeCompensation = 1;
        this.lastDirection = "south";
        this.directionQueue = [];
        this.enabled = true;

        PlayerCharacter.createAnimations(scene);

        this.sprite = scene.physics.add.sprite(x, y, DIR.south.key, 0);
        this.sprite.setScale(options.scale ?? DEFAULT_SCALE);
        this.sprite.setCollideWorldBounds(options.collideWorldBounds ?? true);

        // Hitbox só nos pés da arte (ver ART_FEET_Y no topo do arquivo).
        const bodyW = options.bodyWidth ?? BODY_WIDTH;
        const bodyH = options.bodyHeight ?? BODY_HEIGHT;
        this.sprite.body.setSize(bodyW, bodyH);
        this.sprite.body.setOffset((this.sprite.width - bodyW) / 2, ART_FEET_Y - bodyH);

        this.playIdleAnimation();

        this.keys = scene.input.keyboard.addKeys({
            north: Phaser.Input.Keyboard.KeyCodes.W,
            west: Phaser.Input.Keyboard.KeyCodes.A,
            south: Phaser.Input.Keyboard.KeyCodes.S,
            east: Phaser.Input.Keyboard.KeyCodes.D,
            run: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });

        this.keydownHandler = (event) => this.trackPressedDirection(event.code);
        this.keyupHandler = (event) => this.releasePressedDirection(event.code);
        scene.input.keyboard.on("keydown", this.keydownHandler);
        scene.input.keyboard.on("keyup", this.keyupHandler);
        scene.events.once("shutdown", () => this.destroy());
    }

    // Posição y dos pés visíveis, em coordenadas de mundo (para o y-sort da sala
    // usar a mesma referência da colisão, e não o fundo transparente do quadro).
    get feetY() {
        return this.sprite.y + (ART_FEET_Y - this.sprite.height / 2) * this.sprite.scaleY;
    }

    // Compensação de dilatação temporal (modo de reprogramação remota): com o
    // mundo em câmara lenta, multiplica a velocidade e o ritmo da animação para
    // a Artemis continuar se movendo em tempo normal (estilo Luna Nights).
    setTimeCompensation(factor) {
        this.timeCompensation = factor;
    }

    setEnabled(value) {
        this.enabled = value;

        if (!value) {
            this.directionQueue = [];
            this.sprite.setVelocity(0, 0);
            this.playIdleAnimation();
        }
    }

    update() {
        if (!this.enabled) {
            this.sprite.setVelocity(0, 0);
            return;
        }

        const direction = this.getActiveDirection();

        if (!direction) {
            this.sprite.setVelocity(0, 0);
            this.playIdleAnimation();
            return;
        }

        const velocity = DIRECTION_VELOCITY[direction];
        const running = this.keys.run.isDown;
        const speed = (running ? this.runSpeed : this.speed) * this.timeCompensation;

        this.lastDirection = direction;
        this.sprite.anims.timeScale = (running ? RUN_ANIM_TIMESCALE : 1) * this.timeCompensation;
        this.sprite.setVelocity(velocity.x * speed, velocity.y * speed);
        this.playMoveAnimation(direction);
    }

    trackPressedDirection(code) {
        if (!this.enabled) {
            return;
        }

        const direction = DIRECTION_KEYS[code];

        if (!direction || this.directionQueue.includes(direction)) {
            return;
        }

        this.directionQueue.push(direction);
    }

    releasePressedDirection(code) {
        const direction = DIRECTION_KEYS[code];

        if (!direction) {
            return;
        }

        this.directionQueue = this.directionQueue.filter((queuedDirection) => queuedDirection !== direction);
    }

    getActiveDirection() {
        this.directionQueue = this.directionQueue.filter((direction) => this.keys[direction].isDown);
        return this.directionQueue[this.directionQueue.length - 1] ?? null;
    }

    // Parada: primeiro quadro da caminhada da direção atual (até haver um ciclo
    // de idle dedicado do template).
    playIdleAnimation() {
        this.sprite.anims.timeScale = this.timeCompensation;
        const dir = DIR[this.lastDirection] ?? DIR.south;
        this.sprite.setFlipX(dir.flip);
        this.sprite.stop();
        this.sprite.setTexture(dir.key, 0);
    }

    playMoveAnimation(direction) {
        const dir = DIR[direction] ?? DIR.south;
        this.sprite.setFlipX(dir.flip);
        this.sprite.play(dir.key, true);
    }

    destroy() {
        this.scene.input.keyboard.off("keydown", this.keydownHandler);
        this.scene.input.keyboard.off("keyup", this.keyupHandler);
    }
}
