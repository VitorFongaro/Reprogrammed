import Phaser from "phaser";
import PlayerCharacter from "../characters/PlayerCharacter";

const WIDTH = 1280;
const HEIGHT = 720;

export default class SpritTestScene extends Phaser.Scene {
    constructor() {
        super("sprit-test-scene");
    }

    preload() {
        PlayerCharacter.preload(this);
    }

    create() {
        this.drawTestRoom();
        this.player = new PlayerCharacter(this, WIDTH / 2, HEIGHT / 2);

        this.input.keyboard.on("keydown-ESC", () => {
            this.scene.start("game-scene");
        });
    }

    update() {
        this.player.update();
    }

    drawTestRoom() {
        this.cameras.main.setBackgroundColor("#13282b");
        this.physics.world.setBounds(48, 96, WIDTH - 96, HEIGHT - 144);

        const background = this.add.graphics();
        background.fillStyle(0x13282b, 1);
        background.fillRect(0, 0, WIDTH, HEIGHT);

        background.lineStyle(2, 0xb8f5e8, 0.42);
        background.strokeRect(48, 96, WIDTH - 96, HEIGHT - 144);

        background.lineStyle(1, 0x0b1b1d, 0.82);
        for (let y = 96; y <= HEIGHT - 48; y += 30) {
            background.lineBetween(48, y, WIDTH - 48, y);
        }

        for (let x = 48; x <= WIDTH - 48; x += 30) {
            background.lineBetween(x, 96, x, HEIGHT - 48);
        }

        this.add.text(WIDTH / 2, 44, "- TESTE DE SPRITE -", {
            fontFamily: "VCR",
            fontSize: "34px",
            color: "#e7ebb2",
            align: "center"
        }).setOrigin(0.5);

        this.add.text(WIDTH / 2, HEIGHT - 28, "WASD MOVE  |  ESC VOLTA AO MENU", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#9edfd2",
            align: "center"
        }).setOrigin(0.5);
    }
}
