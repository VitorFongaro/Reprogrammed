import Phaser from "phaser";

const DEFAULT_SPEED = 220;
const DEFAULT_SCALE = 3;
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
        this.lastDirection = "south";

        PlayerCharacter.createAnimations(scene);

        this.sprite = scene.physics.add.sprite(x, y, PlayerCharacter.rotationKey("south"));
        this.sprite.setScale(options.scale ?? DEFAULT_SCALE);
        this.sprite.setCollideWorldBounds(options.collideWorldBounds ?? true);
        this.sprite.play("maid-idle-south");

        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    update() {
        const axisX = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
        const axisY = Number(this.keys.down.isDown) - Number(this.keys.up.isDown);
        const isMoving = axisX !== 0 || axisY !== 0;

        if (!isMoving) {
            this.sprite.setVelocity(0, 0);
            this.playIdleAnimation();
            return;
        }

        const direction = this.getDirection(axisX, axisY);
        const velocity = new Phaser.Math.Vector2(axisX, axisY).normalize().scale(this.speed);

        this.lastDirection = direction;
        this.sprite.setVelocity(velocity.x, velocity.y);
        this.playMoveAnimation(direction);
    }

    playIdleAnimation() {
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

    getDirection(axisX, axisY) {
        if (axisX > 0 && axisY > 0) {
            return "south-east";
        }

        if (axisX > 0 && axisY < 0) {
            return "north-east";
        }

        if (axisX < 0 && axisY > 0) {
            return "south-west";
        }

        if (axisX < 0 && axisY < 0) {
            return "north-west";
        }

        if (axisX > 0) {
            return "east";
        }

        if (axisX < 0) {
            return "west";
        }

        if (axisY < 0) {
            return "north";
        }

        return "south";
    }
}
