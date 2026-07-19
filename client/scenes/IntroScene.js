import Phaser from "phaser";
import PlayerCharacter from "../characters/PlayerCharacter";
import CosmoCompanion from "../characters/CosmoCompanion";
import poraoBg from "../assets/images/porao/porao_bg.png";
import poraoMap from "../assets/maps/porao.json";
import { placeTiledObjects, preloadProps } from "../utils/tiledMap";

const WIDTH = 1280;
const HEIGHT = 720;

// A imagem do mapa (1280x704) fica centralizada no canvas de 720: offset de 8px.
const MAP_OFFSET = { x: 0, y: 8 };

// Posição da androide desativada no depósito (canto esquerdo, junto à prateleira).
const ANDROID_POS = { x: 236, y: 426 };
const POWERED_OFF_TINT = 0x36406a;

// Roteiro da abertura. Cada passo pode disparar um efeito via `onEnter`.
const SCRIPT = [
    { speaker: "COSMO", text: "...você consegue me ouvir?" },
    { speaker: "COSMO", text: "Por favor, acorde. Não temos muito tempo." },
    { speaker: "COSMO", text: "Os sistemas dela ainda estão offline. Vou tentar de novo." },
    { speaker: "SISTEMA", text: "> reiniciando núcleo... [ok]", effect: "boot" },
    { speaker: "SISTEMA", text: "> restaurando consciência... [ok]" },
    { speaker: "COSMO", text: "Isso! Você está voltando. Devagar.", effect: "wake" },
    { speaker: "COSMO", text: "Bem-vinda de volta. Eu sou o Cosmo." }
];

export default class IntroScene extends Phaser.Scene {
    constructor() {
        super("intro-scene");
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
        preloadProps(this);
        this.load.image("porao-bg", poraoBg);
    }

    create() {
        this.stepIndex = -1;
        this.typing = false;
        this.finished = false;

        this.drawBasement();
        this.createAndroid();
        this.createCosmo();
        this.createDialogueBox();
        this.registerInput();

        this.cameras.main.fadeIn(900, 0, 0, 0);
        this.cameras.main.once("camerafadeincomplete", () => this.advance());
    }

    update(time, delta) {
        this.cosmo.update(time, delta);
    }

    // --- Cenário do porão (mapa gerado no Aseprite) ---
    drawBasement() {
        this.cameras.main.setBackgroundColor("#050505");

        this.add.image(WIDTH / 2, HEIGHT / 2, "porao-bg").setDepth(-10);

        // Letreiro da empresa na parede (o emblema faz parte do fundo).
        this.add.text(470, 92, "E L Y S I U M", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#6a7186"
        }).setOrigin(0.5).setDepth(-9);

        // Objetos da sala (mesmos da PoraoScene, via Tiled) com y-sort.
        placeTiledObjects(this, poraoMap, "objetos", MAP_OFFSET);

        // Brilho fraco sobre a androide desativada.
        this.lightCone = this.add.graphics();
        this.lightCone.setDepth(-5);
        this.drawLightCone(0.06);

        // Scanlines.
        const g = this.add.graphics();
        g.setDepth(-4);
        g.lineStyle(1, 0x000000, 0.35);
        for (let y = 0; y < HEIGHT; y += 4) {
            g.lineBetween(0, y, WIDTH, y);
        }

    }

    drawLightCone(alpha) {
        this.lightCone.clear();
        this.lightCone.fillStyle(0x9fb0ff, alpha);
        this.lightCone.fillEllipse(ANDROID_POS.x, ANDROID_POS.y + 34, 200, 80);
    }

    createAndroid() {
        PlayerCharacter.createAnimations(this);

        this.android = this.add.sprite(ANDROID_POS.x, ANDROID_POS.y, PlayerCharacter.rotationKey("south"));
        this.android.setScale(3);
        this.android.setTint(POWERED_OFF_TINT);
        // Mesma profundidade (base = pés) usada pelo y-sort dos objetos.
        this.android.setDepth(this.android.y + this.android.displayHeight / 2);
    }

    createCosmo() {
        // Alvo leve para o Cosmo seguir (a androide ainda não é um PlayerCharacter).
        this.cosmo = new CosmoCompanion(this, { sprite: this.android, lastDirection: "south" });
    }

    // --- Caixa de diálogo com efeito de máquina de escrever ---
    createDialogueBox() {
        const boxX = 140;
        const boxY = 596;
        const boxW = WIDTH - 280;
        const boxH = 96;

        const box = this.add.graphics();
        box.setDepth(20);
        box.fillStyle(0x05060a, 0.92);
        box.fillRect(boxX, boxY, boxW, boxH);
        box.lineStyle(2, 0x4ad6ff, 0.8);
        box.strokeRect(boxX, boxY, boxW, boxH);

        this.speakerText = this.add.text(boxX + 22, boxY - 36, "", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#4ad6ff"
        }).setDepth(21);

        this.bodyText = this.add.text(boxX + 22, boxY + 24, "", {
            fontFamily: "VCR",
            fontSize: "22px",
            color: "#e7e9f2",
            wordWrap: { width: boxW - 44 }
        }).setDepth(21);

        this.hintText = this.add.text(
            boxX + boxW - 22,
            boxY + boxH - 12,
            import.meta.env.DEV ? "[ESPAÇO]   [P] pular" : "[ESPAÇO]",
            {
                fontFamily: "VCR",
                fontSize: "16px",
                color: "#5b6178"
            }
        ).setOrigin(1, 1).setDepth(21).setVisible(false);

        this.tweens.add({
            targets: this.hintText,
            alpha: { from: 1, to: 0.25 },
            duration: 700,
            yoyo: true,
            repeat: -1
        });
    }

    registerInput() {
        const onAdvance = () => this.handleAdvanceKey();
        this.input.keyboard.on("keydown-SPACE", onAdvance);
        this.input.keyboard.on("keydown-ENTER", onAdvance);
        this.input.on("pointerdown", onAdvance);

        this.input.keyboard.on("keydown-ESC", () => this.scene.start("game-scene"));

        // Pulo da intro para testes (P, modo dev) — mesmo atalho do DialogueBox.
        if (import.meta.env.DEV) {
            this.input.keyboard.on("keydown", (event) => {
                if (event.code === "KeyP") {
                    this.finish();
                }
            });
        }
    }

    handleAdvanceKey() {
        if (this.typewriter) {
            // Pula a digitação e mostra a linha completa.
            this.typewriter.remove();
            this.typewriter = null;
            this.bodyText.setText(this.currentLine);
            this.typing = false;
            this.hintText.setVisible(true);
            return;
        }

        this.advance();
    }

    advance() {
        if (this.typing) {
            return;
        }

        this.stepIndex += 1;

        if (this.stepIndex >= SCRIPT.length) {
            this.finish();
            return;
        }

        const step = SCRIPT[this.stepIndex];
        this.applyEffect(step.effect);
        this.speakerText.setText(step.speaker);
        this.typeLine(step.text);
    }

    typeLine(line) {
        this.currentLine = line;
        this.bodyText.setText("");
        this.typing = true;
        this.hintText.setVisible(false);

        let i = 0;
        this.typewriter = this.time.addEvent({
            delay: 32,
            repeat: line.length - 1,
            callback: () => {
                i += 1;
                this.bodyText.setText(line.slice(0, i));
                if (i >= line.length) {
                    this.typewriter = null;
                    this.typing = false;
                    this.hintText.setVisible(true);
                }
            }
        });
    }

    applyEffect(effect) {
        if (effect === "boot") {
            this.flicker(this.android);
            this.tweens.add({ targets: this.lightCone, alpha: { from: 0.4, to: 1 }, duration: 120, yoyo: true, repeat: 3 });
        }

        if (effect === "wake") {
            this.flicker(this.android, () => {
                this.android.clearTint();
                this.android.play("maid-idle-south");
            });
            this.drawLightCone(0.12);
        }
    }

    flicker(target, onComplete) {
        this.tweens.add({
            targets: target,
            alpha: { from: 1, to: 0.2 },
            duration: 80,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                target.setAlpha(1);
                onComplete?.();
            }
        });
    }

    finish() {
        if (this.finished) {
            return;
        }
        this.finished = true;

        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("cap1-porao");
        });
    }
}
