import bossSheet from "../assets/sprites/boss/boss.png";

// Boss do capítulo 1 (sala de segurança): a unidade-sentinela do ENIAC. Sprite
// animado do dev (sheet horizontal, 6 quadros de 60x60) em idle contínuo. Reage
// a cada estágio de puzzle resolvido (flash + tremida) e "desliga" ao ser vencido.

const FRAME_W = 60;
const FRAME_H = 60;
const FRAME_COUNT = 6;
const DEFAULT_SCALE = 3;
const IDLE_KEY = "eniac-boss-idle";

export default class EniacBoss {
    static preload(scene) {
        if (!scene.textures.exists("eniac-boss")) {
            scene.load.spritesheet("eniac-boss", bossSheet, { frameWidth: FRAME_W, frameHeight: FRAME_H });
        }
    }

    static createAnimations(scene) {
        if (scene.anims.exists(IDLE_KEY)) {
            return;
        }
        scene.anims.create({
            key: IDLE_KEY,
            frames: scene.anims.generateFrameNumbers("eniac-boss", { start: 0, end: FRAME_COUNT - 1 }),
            frameRate: 8,
            repeat: -1
        });
    }

    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        EniacBoss.createAnimations(scene);

        this.baseX = x;
        this.defeated = false;

        this.sprite = scene.add.sprite(x, y, "eniac-boss", 0)
            .setScale(options.scale ?? DEFAULT_SCALE)
            .setDepth(options.depth ?? 1);
        this.sprite.play(IDLE_KEY);

        scene.events.once("shutdown", () => this.destroy());
    }

    // Reação ao perder um estágio: flash vermelho + tremida horizontal.
    hit() {
        if (this.defeated) {
            return;
        }
        this.sprite.setTintFill(0xff4545);
        this.scene.time.delayedCall(100, () => {
            if (!this.defeated) {
                this.sprite.clearTint();
            }
        });
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.baseX + 8,
            duration: 45,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                this.sprite.x = this.baseX;
            }
        });
    }

    // Telegrafa o ataque do turno do boss: investida curta + flash âmbar.
    attackAnim(onComplete) {
        if (this.defeated) {
            onComplete?.();
            return;
        }
        this.sprite.setTintFill(0xffb347);
        this.scene.time.delayedCall(140, () => {
            if (!this.defeated) {
                this.sprite.clearTint();
            }
        });
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y + 14,
            duration: 170,
            yoyo: true,
            ease: "Quad.easeOut",
            onComplete: () => onComplete?.()
        });
    }

    // Derrota: para a animação, escurece e "desliga" (afunda um pouco).
    powerDown() {
        this.defeated = true;
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.x = this.baseX;
        this.sprite.stop();
        this.sprite.setFrame(0);
        this.sprite.setTint(0x4a4a4a);
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.55,
            y: this.sprite.y + 6,
            duration: 700,
            ease: "Quad.easeIn"
        });
    }

    destroy() {
        this.scene.tweens.killTweensOf(this.sprite);
    }
}
