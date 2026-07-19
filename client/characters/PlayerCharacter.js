import Phaser from "phaser";

const DEFAULT_SPEED = 220;
// Corrida (segurando Shift): mais velocidade e a mesma animação de passos
// acelerada via timeScale. Se um dia houver um ciclo de corrida dedicado,
// basta trocar a animação em playMoveAnimation.
const DEFAULT_RUN_SPEED = 330;
const RUN_ANIM_TIMESCALE = 1.6;
const DEFAULT_SCALE = 3;

// A arte da personagem ocupa só o miolo do quadro 60x60 (pés em y≈44..47,
// largura x=20..41; o resto é transparente). O corpo físico — só os pés, padrão
// top-down — ancora nos PÉS DA ARTE (ART_FEET_Y), não no fundo do quadro;
// ancorar no quadro deixava a colisão flutuando ~40px abaixo dos pés visíveis.
const ART_FEET_Y = 47;
const BODY_WIDTH = 18;
const BODY_HEIGHT = 12;
const SPRITE_FILES = import.meta.glob("../assets/sprites/A_cute_android_maid_with/**/*.png", {
    eager: true,
    query: "?url",
    import: "default"
});

const ROTATION_DIRECTIONS = [
    "south",
    "south-east",
    "east",
    "north-east",
    "north",
    "north-west",
    "west",
    "south-west"
];

const RUN_DIRECTIONS = ["south", "east", "west", "north"];
const RUN_FRAME_COUNT = 6;
const IDLE_FRAME_COUNT = 4;
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
        ROTATION_DIRECTIONS.forEach((direction) => {
            scene.load.image(this.rotationKey(direction), this.spriteAsset(`rotations/${direction}.png`));
        });

        RUN_DIRECTIONS.forEach((direction) => {
            for (let index = 0; index < RUN_FRAME_COUNT; index += 1) {
                const frame = String(index).padStart(3, "0");
                scene.load.image(
                    this.runFrameKey(direction, index),
                    this.spriteAsset(`animations/Running-26e3f48a/${direction}/frame_${frame}.png`)
                );
            }
        });

        for (let index = 0; index < IDLE_FRAME_COUNT; index += 1) {
            const frame = String(index).padStart(3, "0");
            scene.load.image(
                this.idleFrameKey(index),
                this.spriteAsset(`animations/Breathing_Idle-ed9c21b4/south/frame_${frame}.png`)
            );
        }
    }

    static createAnimations(scene) {
        RUN_DIRECTIONS.forEach((direction) => {
            const key = `maid-run-${direction}`;

            if (scene.anims.exists(key)) {
                return;
            }

            scene.anims.create({
                key,
                frames: Array.from({ length: RUN_FRAME_COUNT }, (_, index) => ({
                    key: this.runFrameKey(direction, index)
                })),
                frameRate: 10,
                repeat: -1
            });
        });

        if (scene.anims.exists("maid-idle-south")) {
            return;
        }

        scene.anims.create({
            key: "maid-idle-south",
            frames: Array.from({ length: IDLE_FRAME_COUNT }, (_, index) => ({
                key: this.idleFrameKey(index)
            })),
            frameRate: 5,
            repeat: -1
        });
    }

    static rotationKey(direction) {
        return `maid-rotation-${direction}`;
    }

    static runFrameKey(direction, index) {
        return `maid-run-${direction}-${index}`;
    }

    static idleFrameKey(index) {
        return `maid-idle-south-${index}`;
    }

    static spriteAsset(path) {
        return SPRITE_FILES[`../assets/sprites/A_cute_android_maid_with/${path}`];
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

        this.sprite = scene.physics.add.sprite(x, y, PlayerCharacter.rotationKey("south"));
        this.sprite.setScale(options.scale ?? DEFAULT_SCALE);
        this.sprite.setCollideWorldBounds(options.collideWorldBounds ?? true);
        this.sprite.play("maid-idle-south");

        // Hitbox só nos pés da arte (ver ART_FEET_Y no topo do arquivo).
        const bodyW = options.bodyWidth ?? BODY_WIDTH;
        const bodyH = options.bodyHeight ?? BODY_HEIGHT;
        this.sprite.body.setSize(bodyW, bodyH);
        this.sprite.body.setOffset((this.sprite.width - bodyW) / 2, ART_FEET_Y - bodyH);

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

    playIdleAnimation() {
        this.sprite.anims.timeScale = this.timeCompensation;

        if (this.lastDirection === "south") {
            this.sprite.play("maid-idle-south", true);
            return;
        }

        this.sprite.stop();
        this.sprite.setTexture(PlayerCharacter.rotationKey(this.lastDirection));
    }

    playMoveAnimation(direction) {
        if (RUN_DIRECTIONS.includes(direction)) {
            this.sprite.play(`maid-run-${direction}`, true);
            return;
        }

        this.sprite.stop();
        this.sprite.setTexture(PlayerCharacter.rotationKey(direction));
    }

    destroy() {
        this.scene.input.keyboard.off("keydown", this.keydownHandler);
        this.scene.input.keyboard.off("keyup", this.keyupHandler);
    }
}
