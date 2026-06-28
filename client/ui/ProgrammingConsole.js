import Phaser from "phaser";

// Terminal de programação pixelado (overlay). Por enquanto o puzzle é de VARIÁVEL:
// o jogador declara `nome = valor` e o console valida contra o esperado.

const WIDTH = 1280;
const HEIGHT = 720;

const PANEL_W = 860;
const PANEL_H = 540;
const PANEL_X = (WIDTH - PANEL_W) / 2;
const PANEL_Y = (HEIGHT - PANEL_H) / 2;
const PAD = 28;

const COLOR = {
    backdrop: 0x000000,
    panel: 0x05060a,
    border: 0x4ad6ff,
    text: "#e7e9f2",
    dim: "#5b6178",
    accent: "#4ad6ff",
    error: "#ff4545",
    success: "#51e36b"
};

const MAX_INPUT = 40;
const INPUT_REGEX = /^[A-Za-z0-9_= ]$/;
const ASSIGN_REGEX = /^\s*([A-Za-z_]\w*)\s*=\s*(-?\d+)\s*$/;

export default class ProgrammingConsole {
    constructor(scene, puzzle, options = {}) {
        this.scene = scene;
        this.puzzle = puzzle;
        this.onSolved = options.onSolved;
        this.onClose = options.onClose;

        this.isOpen = false;
        this.solved = false;
        this.input = "";
        this.caretVisible = true;
        this.output = { text: this.puzzle.hint ?? "", color: COLOR.dim };
    }

    open() {
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        this.input = "";
        if (!this.solved) {
            this.output = { text: this.puzzle.hint ?? "", color: COLOR.dim };
        }

        this.build();

        // Registra entrada no próximo tick para não capturar a própria tecla [E] que abriu.
        this.scene.time.delayedCall(0, () => {
            if (!this.isOpen) {
                return;
            }
            this.keyHandler = (event) => this.handleKey(event);
            this.scene.input.keyboard.on("keydown", this.keyHandler);
            this.caretTimer = this.scene.time.addEvent({
                delay: 450,
                loop: true,
                callback: () => {
                    this.caretVisible = !this.caretVisible;
                    this.renderInput();
                }
            });
        });
    }

    close() {
        if (!this.isOpen) {
            return;
        }

        this.isOpen = false;

        if (this.keyHandler) {
            this.scene.input.keyboard.off("keydown", this.keyHandler);
            this.keyHandler = null;
        }
        this.caretTimer?.remove();
        this.caretTimer = null;
        this.container?.destroy();
        this.container = null;

        this.onClose?.();
    }

    handleKey(event) {
        if (!this.isOpen) {
            return;
        }

        switch (event.key) {
            case "Escape":
                this.close();
                return;
            case "Enter":
                this.runInput();
                return;
            case "Backspace":
                this.input = this.input.slice(0, -1);
                this.renderInput();
                return;
            default:
                if (event.key.length === 1 && INPUT_REGEX.test(event.key) && this.input.length < MAX_INPUT) {
                    this.input += event.key;
                    this.renderInput();
                }
        }
    }

    runInput() {
        const raw = this.input.trim();

        if (raw === "") {
            return;
        }

        const match = raw.match(ASSIGN_REGEX);

        if (!match) {
            this.setOutput("erro de sintaxe  -  use: nome = valor", COLOR.error);
            return;
        }

        const [, name, valueStr] = match;
        const value = parseInt(valueStr, 10);

        if (name !== this.puzzle.variable) {
            this.setOutput(`variável desconhecida: ${name}`, COLOR.error);
            return;
        }

        if (value !== this.puzzle.expected) {
            this.setOutput(`${name} = ${value}  //  carga insuficiente`, COLOR.error);
            return;
        }

        this.solved = true;
        this.setOutput(`${name} = ${value}  //  GERADOR ATIVADO`, COLOR.success);
        this.onSolved?.();
        this.scene.time.delayedCall(900, () => this.close());
    }

    setOutput(text, color) {
        this.output = { text, color };
        this.outputText?.setText(text).setColor(color);
    }

    // --- Renderização ---
    build() {
        this.container = this.scene.add.container(0, 0).setDepth(1000);

        const backdrop = this.scene.add.graphics();
        backdrop.fillStyle(COLOR.backdrop, 0.78);
        backdrop.fillRect(0, 0, WIDTH, HEIGHT);

        const panel = this.scene.add.graphics();
        panel.fillStyle(COLOR.panel, 0.98);
        panel.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
        panel.lineStyle(2, COLOR.border, 0.85);
        panel.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
        // Barra de título.
        panel.fillStyle(COLOR.border, 0.12);
        panel.fillRect(PANEL_X, PANEL_Y, PANEL_W, 46);
        panel.lineBetween(PANEL_X, PANEL_Y + 46, PANEL_X + PANEL_W, PANEL_Y + 46);
        // Linha acima do input.
        const inputY = PANEL_Y + PANEL_H - 96;
        panel.lineStyle(1, COLOR.border, 0.4);
        panel.lineBetween(PANEL_X + PAD, inputY - 14, PANEL_X + PANEL_W - PAD, inputY - 14);
        // Scanlines sobre o painel.
        panel.lineStyle(1, 0x000000, 0.28);
        for (let y = PANEL_Y + 47; y < PANEL_Y + PANEL_H; y += 4) {
            panel.lineBetween(PANEL_X + 1, y, PANEL_X + PANEL_W - 1, y);
        }

        const title = this.scene.add.text(PANEL_X + PAD, PANEL_Y + 14, `TERMINAL :: ${this.puzzle.title}`, {
            fontFamily: "VCR",
            fontSize: "20px",
            color: COLOR.accent
        });

        const escHint = this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + 14, "[ESC] SAIR", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: COLOR.dim
        }).setOrigin(1, 0);

        const briefing = this.scene.add.text(
            PANEL_X + PAD,
            PANEL_Y + 76,
            this.puzzle.briefing.join("\n"),
            {
                fontFamily: "VCR",
                fontSize: "20px",
                color: COLOR.text,
                lineSpacing: 8
            }
        );

        this.outputText = this.scene.add.text(PANEL_X + PAD, inputY - 56, this.output.text, {
            fontFamily: "VCR",
            fontSize: "18px",
            color: this.output.color,
            wordWrap: { width: PANEL_W - PAD * 2 }
        });

        this.inputText = this.scene.add.text(PANEL_X + PAD, inputY + 10, "", {
            fontFamily: "VCR",
            fontSize: "22px",
            color: COLOR.text
        });

        const footer = this.scene.add.text(
            PANEL_X + PANEL_W - PAD,
            PANEL_Y + PANEL_H - 24,
            "[ENTER] EXECUTAR",
            {
                fontFamily: "VCR",
                fontSize: "16px",
                color: COLOR.dim
            }
        ).setOrigin(1, 1);

        this.container.add([backdrop, panel, title, escHint, briefing, this.outputText, this.inputText, footer]);
        this.renderInput();
    }

    renderInput() {
        if (!this.inputText) {
            return;
        }

        const caret = this.caretVisible ? "_" : " ";
        this.inputText.setText(`> ${this.input}${caret}`);
    }
}
