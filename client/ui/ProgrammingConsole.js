import Phaser from "phaser";

// Terminal de programação pixelado (overlay). O puzzle é de VARIÁVEL: o jogador
// declara `nome = valor` e o console valida nome, tipo e valor contra o esperado.
// Tipos suportados: int, float (ponto decimal), string (entre aspas) e boolean
// (true/false). O tipo esperado é inferido de `puzzle.expected`.

import { recordAttempt } from "../state/telemetry.js";

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
const INPUT_REGEX = /^[A-Za-z0-9_="'.,\- ]$/;
const ASSIGN_REGEX = /^\s*([A-Za-z_]\w*)\s*=\s*(.+?)\s*$/;

const STRING_REGEX = /^"([^"]*)"$|^'([^']*)'$/;
const FLOAT_REGEX = /^-?\d+\.\d+$/;
const INT_REGEX = /^-?\d+$/;
const COMMA_DECIMAL_REGEX = /^-?\d+,\d+$/;
const BARE_WORD_REGEX = /^[A-Za-z_]\w*$/;

const TYPE_LABELS = {
    int: "número inteiro",
    float: "número decimal",
    string: "texto (string)",
    boolean: "booleano (true/false)"
};

function inferType(value) {
    if (typeof value === "boolean") {
        return "boolean";
    }
    if (typeof value === "string") {
        return "string";
    }
    return Number.isInteger(value) ? "int" : "float";
}

// Converte o token digitado em { type, value } ou { error } com mensagem didática.
function parseValue(raw) {
    if (/^(true|false)$/i.test(raw)) {
        if (raw !== raw.toLowerCase()) {
            return { error: "booleanos são minúsculos: true ou false" };
        }
        return { type: "boolean", value: raw === "true" };
    }

    const stringMatch = raw.match(STRING_REGEX);
    if (stringMatch) {
        return { type: "string", value: stringMatch[1] ?? stringMatch[2] };
    }

    if (COMMA_DECIMAL_REGEX.test(raw)) {
        return { error: "decimais usam ponto, não vírgula  -  ex: 21.5" };
    }

    if (FLOAT_REGEX.test(raw)) {
        return { type: "float", value: parseFloat(raw) };
    }

    if (INT_REGEX.test(raw)) {
        return { type: "int", value: parseInt(raw, 10) };
    }

    // Texto (string): aceito com aspas ou sem — o teclado ABNT2 trata " e ' como
    // teclas mortas, então exigir aspas travaria a digitação em muitos teclados.
    if (BARE_WORD_REGEX.test(raw)) {
        return { type: "string", value: raw };
    }

    return { error: "valor inválido  -  use número, texto, true ou false" };
}

export default class ProgrammingConsole {
    constructor(scene, puzzle, options = {}) {
        this.scene = scene;
        this.puzzle = puzzle;
        this.onSolved = options.onSolved;
        this.onClose = options.onClose;
        // Slug do puzzle: sem ele a tentativa não é medida.
        this.puzzleId = options.puzzleId ?? null;

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
        this.startAttempt();
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

        this.finishAttempt(this.solved);
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
            this.countError();
            this.setOutput("erro de sintaxe  -  use: nome = valor", COLOR.error);
            return;
        }

        const [, name, valueToken] = match;
        const parsed = parseValue(valueToken);

        if (parsed.error) {
            this.countError();
            this.setOutput(parsed.error, COLOR.error);
            return;
        }

        if (name !== this.puzzle.variable) {
            this.countError();
            this.setOutput(`variável desconhecida: ${name}`, COLOR.error);
            return;
        }

        const expectedType = this.puzzle.type ?? inferType(this.puzzle.expected);

        if (!this.typeMatches(expectedType, parsed.type)) {
            this.countError();
            this.setOutput(`tipo errado: ${name} guarda ${TYPE_LABELS[expectedType]}`, COLOR.error);
            return;
        }

        if (!this.valueMatches(parsed.value)) {
            const message = this.puzzle.wrongValueMessage ?? "valor incorreto";
            this.countError();
            this.setOutput(`${name} = ${valueToken}  //  ${message}`, COLOR.error);
            return;
        }

        this.solved = true;
        const success = this.puzzle.successMessage ?? "OK";
        this.setOutput(`${name} = ${valueToken}  //  ${success}`, COLOR.success);
        this.onSolved?.();
        this.scene.time.delayedCall(900, () => this.close());
    }

    // --- Telemetria: uma tentativa = uma abertura do console ---
    startAttempt() {
        this.attemptErrors = 0;
        this.attemptStartedAt = Date.now();
    }

    countError() {
        this.attemptErrors = (this.attemptErrors ?? 0) + 1;
    }

    finishAttempt(correct) {
        if (!this.attemptStartedAt) {
            return;
        }

        const seconds = Math.round((Date.now() - this.attemptStartedAt) / 1000);
        this.attemptStartedAt = null;
        recordAttempt(this.puzzleId, { correct, errors: this.attemptErrors ?? 0, seconds });
    }

    typeMatches(expected, actual) {
        if (expected === actual) {
            return true;
        }
        // Um inteiro é aceito onde se espera decimal (21 é um número válido; se o
        // valor não bater, o erro será de valor, não de tipo).
        return expected === "float" && actual === "int";
    }

    valueMatches(value) {
        const expected = this.puzzle.expected;

        if (typeof expected === "string" && typeof value === "string") {
            return expected.toLowerCase() === value.toLowerCase();
        }

        return value === expected;
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
