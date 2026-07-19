// Caixa de diálogo reutilizável com efeito máquina de escrever (mesma estética da
// IntroScene). Cada passo do roteiro: { speaker, text, color?, onEnter? }.

const WIDTH = 1280;
const HEIGHT = 720;

// Pulo de diálogo para TESTES (a tecla P fecha o roteiro inteiro, executando
// os onEnter restantes e o onComplete). Ativo só no dev server (`npm run dev`);
// não entra no build. Para liberar aos jogadores, troque por `true`.
const SKIP_ENABLED = import.meta.env.DEV;

const BOX_X = 140;
const BOX_Y = 596;
const BOX_W = WIDTH - 280;
const BOX_H = 96;

const TYPE_DELAY = 32;
const DEFAULT_DEPTH = 900;
const DEFAULT_SPEAKER_COLOR = "#4ad6ff";

export default class DialogueBox {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.depth = options.depth ?? DEFAULT_DEPTH;
        this.typeDelay = options.typeDelay ?? TYPE_DELAY;
        this.isOpen = false;

        scene.events.once("shutdown", () => this.teardown());
    }

    play(script, onComplete) {
        if (this.isOpen || !script?.length) {
            return;
        }

        this.isOpen = true;
        this.script = script;
        this.stepIndex = -1;
        this.onComplete = onComplete;
        this.typing = false;

        this.build();

        this.advanceHandler = () => this.handleAdvanceKey();
        this.scene.input.keyboard.on("keydown-SPACE", this.advanceHandler);
        this.scene.input.keyboard.on("keydown-ENTER", this.advanceHandler);
        this.scene.input.on("pointerdown", this.advanceHandler);

        if (SKIP_ENABLED) {
            // Listener genérico + event.code (mesmo padrão do BattleMenu e do
            // PlayerCharacter, que funcionam em todas as cenas).
            this.skipHandler = (event) => {
                if (event.code === "KeyP") {
                    this.skipAll();
                }
            };
            this.scene.input.keyboard.on("keydown", this.skipHandler);
        }

        this.advance();
    }

    build() {
        this.container = this.scene.add.container(0, 0).setDepth(this.depth);

        const box = this.scene.add.graphics();
        box.fillStyle(0x05060a, 0.92);
        box.fillRect(BOX_X, BOX_Y, BOX_W, BOX_H);
        box.lineStyle(2, 0x4ad6ff, 0.8);
        box.strokeRect(BOX_X, BOX_Y, BOX_W, BOX_H);

        this.speakerText = this.scene.add.text(BOX_X + 22, BOX_Y - 36, "", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: DEFAULT_SPEAKER_COLOR
        });

        this.bodyText = this.scene.add.text(BOX_X + 22, BOX_Y + 24, "", {
            fontFamily: "VCR",
            fontSize: "22px",
            color: "#e7e9f2",
            wordWrap: { width: BOX_W - 44 }
        });

        this.hintText = this.scene.add.text(BOX_X + BOX_W - 22, BOX_Y + BOX_H - 12, SKIP_ENABLED ? "[ESPAÇO]   [P] pular" : "[ESPAÇO]", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#5b6178"
        }).setOrigin(1, 1).setVisible(false);

        this.hintTween = this.scene.tweens.add({
            targets: this.hintText,
            alpha: { from: 1, to: 0.25 },
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.container.add([box, this.speakerText, this.bodyText, this.hintText]);
    }

    handleAdvanceKey() {
        if (!this.isOpen) {
            return;
        }

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

        if (this.stepIndex >= this.script.length) {
            this.finish();
            return;
        }

        const step = this.script[this.stepIndex];
        step.onEnter?.();
        this.speakerText.setText(step.speaker).setColor(step.color ?? DEFAULT_SPEAKER_COLOR);
        this.typeLine(step.text);
    }

    typeLine(line) {
        this.currentLine = line;
        this.bodyText.setText("");
        this.typing = true;
        this.hintText.setVisible(false);

        let i = 0;
        this.typewriter = this.scene.time.addEvent({
            delay: this.typeDelay,
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

    // Pula o roteiro inteiro (tecla P, modo dev): executa os onEnter das falas
    // restantes para preservar os efeitos e encerra com o onComplete normal.
    skipAll() {
        if (!this.isOpen) {
            return;
        }
        for (let i = this.stepIndex + 1; i < this.script.length; i += 1) {
            this.script[i].onEnter?.();
        }
        this.finish();
    }

    finish() {
        const onComplete = this.onComplete;
        this.teardown();
        onComplete?.();
    }

    teardown() {
        if (!this.isOpen) {
            return;
        }

        this.isOpen = false;

        if (this.advanceHandler) {
            this.scene.input.keyboard.off("keydown-SPACE", this.advanceHandler);
            this.scene.input.keyboard.off("keydown-ENTER", this.advanceHandler);
            this.scene.input.off("pointerdown", this.advanceHandler);
            this.advanceHandler = null;
        }

        if (this.skipHandler) {
            this.scene.input.keyboard.off("keydown", this.skipHandler);
            this.skipHandler = null;
        }

        this.typewriter?.remove();
        this.typewriter = null;
        this.hintTween?.remove();
        this.hintTween = null;
        this.container?.destroy();
        this.container = null;
        this.onComplete = null;
    }
}
