import Phaser from "phaser";
import PlayerCharacter from "../characters/PlayerCharacter";
import CosmoCompanion from "../characters/CosmoCompanion";
import ProgrammingConsole from "../ui/ProgrammingConsole";

const WIDTH = 1280;
const HEIGHT = 720;

const GENERATOR = { x: 1040, y: 320, w: 84, h: 132 };
const INTERACT_RADIUS = 130;

const GENERATOR_PUZZLE = {
    title: "GERADOR // NÚCLEO",
    briefing: [
        "O gerador está sem carga.",
        "Declare a variável de energia e atribua",
        "o valor exigido para reativá-lo: 100."
    ],
    hint: "dica:  nome = valor   (ex: energia = 100)",
    variable: "energia",
    expected: 100,
    successMessage: "GERADOR ATIVADO",
    wrongValueMessage: "carga insuficiente"
};

export default class SpritTestScene extends Phaser.Scene {
    constructor() {
        super("sprit-test-scene");
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
    }

    create() {
        this.generatorActive = false;
        this.playerInRange = false;

        this.drawTestRoom();
        this.createGenerator();
        this.player = new PlayerCharacter(this, WIDTH / 2, HEIGHT / 2);
        this.cosmo = new CosmoCompanion(this, this.player);

        this.console = new ProgrammingConsole(this, GENERATOR_PUZZLE, {
            onSolved: () => this.activateGenerator(),
            onClose: () => this.player.setEnabled(true)
        });

        this.input.keyboard.on("keydown-E", () => this.tryInteract());
        this.input.keyboard.on("keydown-ESC", () => {
            if (this.console.isOpen) {
                return;
            }
            this.scene.start("game-scene");
        });
    }

    update(time, delta) {
        this.player.update();
        this.cosmo.update(time, delta);
        this.updateInteractionPrompt();
    }

    tryInteract() {
        if (this.console.isOpen || !this.playerInRange) {
            return;
        }

        this.player.setEnabled(false);
        this.console.open();
    }

    updateInteractionPrompt() {
        const distance = Phaser.Math.Distance.Between(
            this.player.sprite.x,
            this.player.sprite.y,
            GENERATOR.x,
            GENERATOR.y
        );

        this.playerInRange = distance <= INTERACT_RADIUS;
        this.interactPrompt.setVisible(this.playerInRange && !this.console.isOpen && !this.generatorActive);
    }

    // --- Gerador ---
    createGenerator() {
        const { x, y, w, h } = GENERATOR;
        const left = x - w / 2;
        const top = y - h / 2;

        const body = this.add.graphics();
        body.fillStyle(0x14161f, 1);
        body.fillRect(left, top, w, h);
        body.lineStyle(2, 0x3a3f55, 1);
        body.strokeRect(left, top, w, h);
        // Painéis/ranhuras.
        body.lineStyle(1, 0x2a2f45, 0.9);
        for (let py = top + 18; py < top + h - 16; py += 18) {
            body.lineBetween(left + 8, py, left + w - 8, py);
        }
        // Base.
        body.fillStyle(0x0c0d14, 1);
        body.fillRect(left - 8, top + h, w + 16, 10);

        // Luz indicadora (vermelha = desligado).
        this.indicator = this.add.graphics();
        this.drawIndicator(0xff4545);

        this.add.text(x, top - 16, "GERADOR", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#7a8099"
        }).setOrigin(0.5);

        this.interactPrompt = this.add.text(x, top - 44, "[E] PROGRAMAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setVisible(false);

        this.tweens.add({
            targets: this.interactPrompt,
            y: top - 50,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    drawIndicator(color) {
        const cx = GENERATOR.x;
        const cy = GENERATOR.y - GENERATOR.h / 2 + 14;
        this.indicator.clear();
        this.indicator.fillStyle(color, 0.25);
        this.indicator.fillCircle(cx, cy, 11);
        this.indicator.fillStyle(color, 1);
        this.indicator.fillCircle(cx, cy, 6);
    }

    activateGenerator() {
        this.generatorActive = true;
        this.drawIndicator(0x51e36b);

        // Brilho de ativação.
        const glow = this.add.graphics();
        glow.fillStyle(0x51e36b, 0.18);
        glow.fillRect(GENERATOR.x - GENERATOR.w, GENERATOR.y - GENERATOR.h, GENERATOR.w * 2, GENERATOR.h * 2);
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 0 },
            duration: 700,
            onComplete: () => glow.destroy()
        });

        this.statusText.setText("> GERADOR ATIVADO").setColor("#51e36b");
    }

    drawTestRoom() {
        this.cameras.main.setBackgroundColor("#050505");
        this.physics.world.setBounds(48, 96, WIDTH - 96, HEIGHT - 144);

        const background = this.add.graphics();
        background.setDepth(-10);
        background.fillStyle(0x050505, 1);
        background.fillRect(0, 0, WIDTH, HEIGHT);

        background.lineStyle(2, 0xf7f7f7, 0.42);
        background.strokeRect(48, 96, WIDTH - 96, HEIGHT - 144);

        background.lineStyle(1, 0x2a2a2a, 0.82);
        for (let y = 96; y <= HEIGHT - 48; y += 30) {
            background.lineBetween(48, y, WIDTH - 48, y);
        }

        for (let x = 48; x <= WIDTH - 48; x += 30) {
            background.lineBetween(x, 96, x, HEIGHT - 48);
        }

        this.add.text(WIDTH / 2, 44, "- TESTE DE SPRITE -", {
            fontFamily: "VCR",
            fontSize: "34px",
            color: "#f7f7f7",
            align: "center"
        }).setOrigin(0.5);

        this.statusText = this.add.text(WIDTH / 2, 78, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#7a8099",
            align: "center"
        }).setOrigin(0.5);

        this.add.text(WIDTH / 2, HEIGHT - 28, "WASD MOVE  |  E INTERAGE  |  ESC VOLTA AO MENU", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#d9d9d9",
            align: "center"
        }).setOrigin(0.5);
    }
}
