import Phaser from "phaser";
import blocksUrl from "../assets/sprites/blocks/blocks.png";

// Console de PROGRAMAÇÃO EM BLOCOS (overlay). Substitui a digitação do
// ProgrammingConsole: em vez de teclar `nome = valor`, o jogador arrasta blocos
// para três encaixes em sequência — [variável] [=] [valor] — no estilo dos cards
// arrastáveis do menu (GameScene): retângulo invisível de arraste, flutuação
// ociosa e retorno com "quicada". Mantém a mesma API (open/close, onSolved,
// onClose) para plugar sem atrito no PuzzleDevice.
//
// A solução é derivada do MESMO objeto `puzzle` do console de texto
// (variable/expected/type). Blocos extras (distratores) podem vir em
// `puzzle.blockDistractors = { nome: [], op: [], valor: [] }`.

const WIDTH = 1280;
const HEIGHT = 720;

const PANEL_W = 860;
const PANEL_H = 540;
const PANEL_X = (WIDTH - PANEL_W) / 2;
const PANEL_Y = (HEIGHT - PANEL_H) / 2;
const PAD = 28;

// Dimensões do quadro do bloco no sheet (blocks.png = 3 quadros de 152x48).
const BLOCK_W = 152;
const BLOCK_H = 48;
const FRAME = { nome: 0, op: 1, valor: 2 };

// Encaixes (linha central) e prateleira (blocos disponíveis embaixo).
const SLOT_Y = PANEL_Y + 236;
const SLOT_SPACING = 156;                 // largura do bloco (152) + respiro.
const SLOT_CENTER_X = WIDTH / 2;
const TRAY_Y = PANEL_Y + 372;
const TRAY_SPACING_X = 160;
const TRAY_SPACING_Y = 60;
const TRAY_PER_ROW = 5;                    // até 10 blocos cabem em 2 fileiras.
const SNAP_RADIUS = 96;

const COLOR = {
    backdrop: 0x000000,
    panel: 0x05060a,
    border: 0x4ad6ff,
    slot: 0x3a3f55,
    text: "#e7e9f2",
    dim: "#5b6178",
    accent: "#4ad6ff",
    error: "#ff4545",
    success: "#51e36b"
};

const SLOT_DEFS = [
    { category: "nome", caption: "variável" },
    { category: "op", caption: "operador" },
    { category: "valor", caption: "valor" }
];

const TYPE_LABELS = {
    int: "número inteiro",
    float: "número decimal",
    string: "texto (string)",
    boolean: "booleano (true/false)"
};

const STRING_REGEX = /^"[^"]*"$|^'[^']*'$/;
const FLOAT_REGEX = /^-?\d+\.\d+$/;
const INT_REGEX = /^-?\d+$/;

function inferType(value) {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "string") return "string";
    return Number.isInteger(value) ? "int" : "float";
}

// Tipo do literal escrito num bloco de valor (para o diagnóstico de erro).
function labelType(label) {
    if (/^(true|false)$/.test(label)) return "boolean";
    if (STRING_REGEX.test(label)) return "string";
    if (FLOAT_REGEX.test(label)) return "float";
    if (INT_REGEX.test(label)) return "int";
    return "string";
}

function typeMatches(expected, actual) {
    if (expected === actual) return true;
    return expected === "float" && actual === "int";
}

// Rótulo do bloco de valor a partir do esperado — preserva a "cara" do literal
// (aspas em string, ponto no float, true/false no boolean) para ensinar o tipo.
function formatExpected(puzzle) {
    const type = puzzle.type ?? inferType(puzzle.expected);
    if (type === "string") return `"${puzzle.expected}"`;
    if (type === "boolean") return puzzle.expected ? "true" : "false";
    return String(puzzle.expected);
}

export default class BlockProgrammingConsole {
    static preload(scene) {
        if (!scene.textures.exists("blocks")) {
            scene.load.spritesheet("blocks", blocksUrl, { frameWidth: BLOCK_W, frameHeight: BLOCK_H });
        }
    }

    constructor(scene, puzzle, options = {}) {
        this.scene = scene;
        this.puzzle = puzzle;
        this.onSolved = options.onSolved;
        this.onClose = options.onClose;

        this.isOpen = false;
        this.solved = false;

        this.buildModel();
    }

    // Monta a solução (3 encaixes) e a lista de blocos disponíveis (solução +
    // distratores), embaralhada para posicionar na prateleira.
    buildModel() {
        const solutionLabels = {
            nome: this.puzzle.variable,
            op: "=",
            valor: formatExpected(this.puzzle)
        };

        this.slots = SLOT_DEFS.map((def, index) => ({
            index,
            category: def.category,
            caption: def.caption,
            expected: solutionLabels[def.category],
            x: SLOT_CENTER_X + (index - 1) * SLOT_SPACING,
            y: SLOT_Y,
            piece: null
        }));

        const distractors = this.puzzle.blockDistractors ?? {};
        const pieces = [];
        let id = 0;

        SLOT_DEFS.forEach((def) => {
            pieces.push({ id: id++, category: def.category, label: solutionLabels[def.category] });
            (distractors[def.category] ?? []).forEach((label) => {
                pieces.push({ id: id++, category: def.category, label });
            });
        });

        Phaser.Utils.Array.Shuffle(pieces);
        pieces.forEach((piece, i) => {
            const col = i % TRAY_PER_ROW;
            const row = Math.floor(i / TRAY_PER_ROW);
            const rowCount = Math.min(pieces.length - row * TRAY_PER_ROW, TRAY_PER_ROW);
            const rowWidth = (rowCount - 1) * TRAY_SPACING_X;
            piece.homeX = SLOT_CENTER_X - rowWidth / 2 + col * TRAY_SPACING_X;
            piece.homeY = TRAY_Y + row * TRAY_SPACING_Y;
            piece.floatX = Phaser.Math.Between(-6, 6);
            piece.floatY = Phaser.Math.Between(-6, 6);
            piece.floatDelay = Phaser.Math.Between(0, 700);
            piece.slot = null;
        });

        this.pieces = pieces;
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.build();

        // Registra o ESC no próximo tick (não captura a tecla [E] que abriu).
        this.scene.time.delayedCall(0, () => {
            if (!this.isOpen) return;
            this.escHandler = (event) => {
                if (event.key === "Escape") this.close();
            };
            this.scene.input.keyboard.on("keydown", this.escHandler);
        });
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.escHandler) {
            this.scene.input.keyboard.off("keydown", this.escHandler);
            this.escHandler = null;
        }
        this.pieces.forEach((piece) => this.stopFloat(piece));
        this.container?.destroy();
        this.container = null;

        this.onClose?.();
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
        panel.fillStyle(COLOR.border, 0.12);
        panel.fillRect(PANEL_X, PANEL_Y, PANEL_W, 46);
        panel.lineBetween(PANEL_X, PANEL_Y + 46, PANEL_X + PANEL_W, PANEL_Y + 46);
        // Linha divisória acima da prateleira.
        panel.lineStyle(1, COLOR.border, 0.4);
        panel.lineBetween(PANEL_X + PAD, TRAY_Y - 44, PANEL_X + PANEL_W - PAD, TRAY_Y - 44);
        // Scanlines.
        panel.lineStyle(1, 0x000000, 0.28);
        for (let y = PANEL_Y + 47; y < PANEL_Y + PANEL_H; y += 4) {
            panel.lineBetween(PANEL_X + 1, y, PANEL_X + PANEL_W - 1, y);
        }

        const title = this.scene.add.text(PANEL_X + PAD, PANEL_Y + 14, `MONTAR :: ${this.puzzle.title}`, {
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
            { fontFamily: "VCR", fontSize: "20px", color: COLOR.text, lineSpacing: 8 }
        );

        this.outputText = this.scene.add.text(SLOT_CENTER_X, SLOT_Y + 64, this.puzzle.hint ?? "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: COLOR.dim,
            align: "center",
            wordWrap: { width: PANEL_W - PAD * 2 }
        }).setOrigin(0.5, 0);

        const footer = this.scene.add.text(
            SLOT_CENTER_X,
            PANEL_Y + PANEL_H - 22,
            "arraste os blocos para os encaixes",
            { fontFamily: "VCR", fontSize: "16px", color: COLOR.dim }
        ).setOrigin(0.5, 1);

        this.container.add([backdrop, panel, title, escHint, briefing, this.outputText, footer]);

        this.slotGraphics = this.scene.add.graphics();
        this.container.add(this.slotGraphics);
        this.drawSlots();

        this.slots.forEach((slot) => {
            const caption = this.scene.add.text(slot.x, slot.y + BLOCK_H / 2 + 8, slot.caption, {
                fontFamily: "VCR",
                fontSize: "15px",
                color: COLOR.dim
            }).setOrigin(0.5, 0);
            this.container.add(caption);
        });

        this.pieces.forEach((piece) => this.createPiece(piece));
    }

    drawSlots(highlight = null) {
        this.slotGraphics.clear();
        this.slots.forEach((slot) => {
            const filled = !!slot.piece;
            const armed = slot === highlight;
            const left = slot.x - BLOCK_W / 2;
            const top = slot.y - BLOCK_H / 2;
            const color = armed ? 0xf7f7f7 : filled ? COLOR.border : COLOR.slot;
            this.slotGraphics.lineStyle(armed ? 3 : 2, color, armed ? 1 : filled ? 0.7 : 0.9);
            this.slotGraphics.strokeRoundedRect(left, top, BLOCK_W, BLOCK_H, 10);
            if (!filled) {
                this.slotGraphics.fillStyle(armed ? 0xf7f7f7 : COLOR.border, armed ? 0.14 : 0.04);
                this.slotGraphics.fillRoundedRect(left, top, BLOCK_W, BLOCK_H, 10);
            }
        });
    }

    createPiece(piece) {
        const container = this.scene.add.container(piece.homeX, piece.homeY);
        container.setSize(BLOCK_W, BLOCK_H);

        const image = this.scene.add.image(0, 0, "blocks", FRAME[piece.category]).setOrigin(0.5);
        const label = this.scene.add.text(0, -1, piece.label, {
            fontFamily: "VCR",
            fontSize: "22px",
            color: "#ffffff"
        }).setOrigin(0.5);

        // Área de arraste: retângulo invisível cobrindo o bloco inteiro (mesmo
        // padrão dos cards do menu — arrasta pegando em qualquer ponto).
        const dragArea = this.scene.add.rectangle(0, 0, BLOCK_W, BLOCK_H, 0xffffff, 0.001).setOrigin(0.5);
        container.add([image, label, dragArea]);

        dragArea.setInteractive({ useHandCursor: true });
        this.scene.input.setDraggable(dragArea);
        dragArea.on("dragstart", () => this.onDragStart(piece));
        dragArea.on("drag", (pointer) => this.onDrag(piece, pointer));
        dragArea.on("dragend", () => this.onDragEnd(piece));

        piece.container = container;
        piece.dragArea = dragArea;
        this.container.add(container);
        this.startFloat(piece);
    }

    // --- Flutuação ociosa (igual aos cards do menu) ---
    startFloat(piece) {
        this.stopFloat(piece);
        piece.floatTween = this.scene.tweens.add({
            targets: piece.container,
            x: piece.homeX + piece.floatX,
            y: piece.homeY + piece.floatY,
            duration: Phaser.Math.Between(1200, 1700),
            delay: piece.floatDelay,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1
        });
    }

    stopFloat(piece) {
        piece.floatTween?.stop();
        piece.floatTween = null;
    }

    onDragStart(piece) {
        if (this.solved) return;
        this.stopFloat(piece);
        this.container.bringToTop(piece.container);
        piece.container.setScale(1.06);
        piece.container.setAlpha(0.94);
        // Libera o encaixe anterior, se estava em um.
        if (piece.slot) {
            piece.slot.piece = null;
            piece.slot = null;
        }
        this.drawSlots();
    }

    onDrag(piece, pointer) {
        const parent = piece.container.parentContainer;
        const local = parent ? parent.getLocalPoint(pointer.x, pointer.y) : pointer;
        piece.container.x = local.x;
        piece.container.y = local.y;
        this.drawSlots(this.nearestFreeSlot(piece));
    }

    onDragEnd(piece) {
        piece.container.setScale(1);
        piece.container.setAlpha(1);
        if (this.solved) return;

        const slot = this.nearestFreeSlot(piece);
        if (slot) {
            this.placeInSlot(piece, slot);
        } else {
            this.returnHome(piece);
        }
    }

    nearestFreeSlot(piece) {
        let best = null;
        let bestDistance = SNAP_RADIUS;
        this.slots.forEach((slot) => {
            if (slot.piece) return;
            const distance = Phaser.Math.Distance.Between(
                piece.container.x, piece.container.y, slot.x, slot.y
            );
            if (distance < bestDistance) {
                best = slot;
                bestDistance = distance;
            }
        });
        return best;
    }

    placeInSlot(piece, slot) {
        slot.piece = piece;
        piece.slot = slot;
        this.drawSlots();
        this.scene.tweens.add({
            targets: piece.container,
            x: slot.x,
            y: slot.y,
            duration: 140,
            ease: "Back.easeOut",
            onComplete: () => this.checkSolution()
        });
    }

    returnHome(piece) {
        this.scene.tweens.add({
            targets: piece.container,
            x: piece.homeX,
            y: piece.homeY,
            duration: 220,
            ease: "Back.easeOut",
            onComplete: () => {
                if (!this.solved && !piece.slot) this.startFloat(piece);
            }
        });
    }

    checkSolution() {
        if (this.slots.some((slot) => !slot.piece)) return;

        const wrongSlots = this.slots.filter((slot) => slot.piece.label !== slot.expected);

        if (wrongSlots.length === 0) {
            this.handleSuccess();
        } else {
            this.handleFailure(wrongSlots);
        }
    }

    // Mensagem específica para o PRIMEIRO encaixe errado (na ordem nome→op→valor),
    // em vez de um aviso genérico: nome errado, operador errado, tipo errado ou
    // valor errado.
    diagnose(wrongSlots) {
        const slot = this.slots.find((s) => wrongSlots.includes(s));
        const got = slot.piece.label;

        if (slot.category === "nome") {
            return `nome de variável incorreto: "${got}" não é o pedido`;
        }
        if (slot.category === "op") {
            return "operador incorreto: a atribuição usa  =";
        }

        const expectedType = this.puzzle.type ?? inferType(this.puzzle.expected);
        const gotType = labelType(got);
        if (!typeMatches(expectedType, gotType)) {
            return `tipo errado: ${this.puzzle.variable} guarda ${TYPE_LABELS[expectedType]}`;
        }
        return this.puzzle.wrongValueMessage ?? "valor incorreto";
    }

    handleSuccess() {
        this.solved = true;
        this.setOutput(this.puzzle.successMessage ?? "OK", COLOR.success);
        this.pieces.forEach((piece) => {
            this.stopFloat(piece);
            piece.dragArea.disableInteractive();
        });

        // Pulso verde na linha montada.
        this.slots.forEach((slot) => {
            this.scene.tweens.add({
                targets: slot.piece.container,
                scale: { from: 1, to: 1.08 },
                duration: 150,
                yoyo: true
            });
        });

        this.onSolved?.();
        this.scene.time.delayedCall(1000, () => this.close());
    }

    handleFailure(wrongSlots) {
        this.setOutput(this.diagnose(wrongSlots), COLOR.error);
        wrongSlots.forEach((slot) => {
            const piece = slot.piece;
            slot.piece = null;
            piece.slot = null;
            this.scene.tweens.add({
                targets: piece.container,
                x: piece.homeX,
                y: piece.homeY,
                duration: 260,
                ease: "Back.easeOut",
                onComplete: () => {
                    if (!piece.slot) this.startFloat(piece);
                }
            });
        });
        this.drawSlots();
    }

    setOutput(text, color) {
        this.outputText?.setText(text).setColor(color);
    }
}
