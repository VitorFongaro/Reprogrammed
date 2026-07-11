import Phaser from "phaser";
import cosmoSheet from "../assets/sprites/cosmo/cosmo.png";

// Sprite do Cosmo: sheet 128x32 com quatro quadros de 32x32, um por direção.
const FRAME = 32;
const DIRECTION_FRAMES = {
    south: 0, // frente
    north: 1, // costas
    west: 2,  // esquerda
    east: 3   // direita
};
const FRONT_FRAME = DIRECTION_FRAMES.south;
const DEFAULT_SCALE = 1.4;

// Fallback (placeholder) caso a textura não tenha sido pré-carregada.
const PLACEHOLDER_SIZE = 24;
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
    static preload(scene) {
        if (scene.textures.exists("cosmo")) {
            return;
        }
        scene.load.spritesheet("cosmo", cosmoSheet, { frameWidth: FRAME, frameHeight: FRAME });
    }

    static createPlaceholder(scene) {
        if (scene.textures.exists("cosmo-placeholder")) {
            return;
        }

        const graphics = scene.make.graphics({ add: false });
        graphics.fillStyle(FILL_COLOR, 1);
        graphics.fillRect(0, 0, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
        graphics.lineStyle(2, BORDER_COLOR, 1);
        graphics.strokeRect(1, 1, PLACEHOLDER_SIZE - 2, PLACEHOLDER_SIZE - 2);
        graphics.generateTexture("cosmo-placeholder", PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
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

        const { x, y } = this.getDesiredPosition();

        if (scene.textures.exists("cosmo")) {
            this.sprite = scene.add.sprite(x, y, "cosmo", FRONT_FRAME);
            this.sprite.setScale(options.scale ?? DEFAULT_SCALE);
            this.directional = true;
        } else {
            CosmoCompanion.createPlaceholder(scene);
            this.sprite = scene.add.image(x, y, "cosmo-placeholder");
            this.directional = false;
        }

        // Flutua sobre os objetos da sala (y-sort chega a ~700), abaixo do diálogo (900).
        this.sprite.setDepth(options.depth ?? 750);

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

        this.faceTargetDirection();
    }

    // Alinha o Cosmo à direção da protagonista (frente/costas/lados).
    faceTargetDirection() {
        if (!this.directional) {
            return;
        }

        const frame = DIRECTION_FRAMES[this.target.lastDirection];
        if (frame !== undefined && frame !== this.sprite.frame.name) {
            this.sprite.setFrame(frame);
        }
    }

    destroy() {
        this.sprite?.destroy();
    }
}
