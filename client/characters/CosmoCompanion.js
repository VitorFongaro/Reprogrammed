import Phaser from "phaser";

// Placeholder do Cosmo enquanto não há sprite/asset definitivo.
const SIZE = 24;
const FILL_COLOR = 0x4ad6ff;
const BORDER_COLOR = 0xf7f7f7;

// Posição do Cosmo na altura do ombro da protagonista (ao lado e acima).
const SHOULDER_OFFSET_X = 40;
const SHOULDER_OFFSET_Y = -56;
const FOLLOW_SMOOTHING = 0.12;

// Amplitude e velocidade do balanço de flutuação (sobe e desce).
const BOB_AMPLITUDE = 6;
const BOB_SPEED = 0.004;

export default class CosmoCompanion {
    static createTexture(scene) {
        if (scene.textures.exists("cosmo-placeholder")) {
            return;
        }

        const graphics = scene.make.graphics({ add: false });
        graphics.fillStyle(FILL_COLOR, 1);
        graphics.fillRect(0, 0, SIZE, SIZE);
        graphics.lineStyle(2, BORDER_COLOR, 1);
        graphics.strokeRect(1, 1, SIZE - 2, SIZE - 2);
        graphics.generateTexture("cosmo-placeholder", SIZE, SIZE);
        graphics.destroy();
    }

    constructor(scene, target, options = {}) {
        this.scene = scene;
        this.target = target;
        this.shoulderX = options.shoulderX ?? SHOULDER_OFFSET_X;
        this.shoulderY = options.shoulderY ?? SHOULDER_OFFSET_Y;
        this.smoothing = options.smoothing ?? FOLLOW_SMOOTHING;
        this.bobAmplitude = options.bobAmplitude ?? BOB_AMPLITUDE;
        this.elapsed = 0;

        CosmoCompanion.createTexture(scene);

        const { x, y } = this.getDesiredPosition();
        this.sprite = scene.add.image(x, y, "cosmo-placeholder");
        this.sprite.setDepth((target.sprite?.depth ?? 0) - 1);

        scene.events.once("shutdown", () => this.destroy());
    }

    getDesiredPosition() {
        const targetSprite = this.target.sprite;

        return {
            x: targetSprite.x + this.shoulderX,
            y: targetSprite.y + this.shoulderY
        };
    }

    update(_, delta = 16) {
        this.elapsed += delta;

        const desired = this.getDesiredPosition();
        const bob = Math.sin(this.elapsed * BOB_SPEED) * this.bobAmplitude;

        this.sprite.x = Phaser.Math.Linear(this.sprite.x, desired.x, this.smoothing);
        this.sprite.y = Phaser.Math.Linear(this.sprite.y, desired.y + bob, this.smoothing);
    }

    destroy() {
        this.sprite?.destroy();
    }
}
