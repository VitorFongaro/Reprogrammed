import Phaser from "phaser";
import BlockProgrammingConsole from "./BlockProgrammingConsole";
import Sfx from "./Sfx";
import { parseTemplateLine, runTests, formatValue } from "../utils/condicional";

// Console de CONDICIONAIS (capítulo 2): o mesmo arrastar-e-encaixar do
// BlockProgrammingConsole (herda arraste, flutuação, timer, [DICA], [ESC] e
// telemetria), mas com um programa de VÁRIAS LINHAS e, em vez de comparar com
// uma resposta fixa, EXECUTA o que o jogador montou contra casos de teste
// (utils/condicional.js). Qualquer programa que se comporte certo passa.
//
// Formato do puzzle (reconhecido pela presença de `lines`):
//   {
//     title, briefing[], hint, successMessage?,
//     lines: [                         // 4 espaços = 1 nível de recuo
//       "se [nome] [op] [valor] :",    // [categoria] = encaixe; o resto é fixo
//       "    porta = [valor]"
//     ],
//     blocks: { nome: [], op: [], valor: [] },   // TODAS as peças (certas + iscas);
//                                                // repita o rótulo para ter duas cópias
//     defaults: { porta: false },      // estado antes do programa rodar
//     tests: [{ given: { cracha: 1 }, expect: { porta: false } }, ...]
//   }
//
// Use `createConsole` (abaixo) para abrir o console certo a partir do puzzle.

const WIDTH = 1280;
const HEIGHT = 720;

const PANEL_W = 1140;
const PANEL_H = 640;
const PANEL_X = (WIDTH - PANEL_W) / 2;
const PANEL_Y = (HEIGHT - PANEL_H) / 2;
const PAD = 26;

// Blocos menores que no console de variável: o programa tem várias linhas.
const BLOCK_SCALE = 0.8;
const BLOCK_W = 152 * BLOCK_SCALE;
const BLOCK_H = 48 * BLOCK_SCALE;
const FRAME = { nome: 0, op: 1, valor: 2 };

const CODE_X = PANEL_X + PAD + 34;        // depois do número da linha.
const CODE_Y = PANEL_Y + 142;             // centro da 1ª linha.
const LINE_H = 50;
const INDENT_W = 44;
const TOKEN_GAP = 10;

const TESTS_W = 330;
const TESTS_X = PANEL_X + PANEL_W - PAD - TESTS_W;
const TESTS_Y = PANEL_Y + 104;

const TRAY_Y = PANEL_Y + 498;
const TRAY_SPACING_X = 132;
const TRAY_SPACING_Y = 48;
const TRAY_PER_ROW = 8;

const REVEAL_MS = 170;                    // ritmo da execução linha a linha dos testes.

const COLOR = {
    panel: 0x05060a,
    border: 0x4ad6ff,
    slot: 0x3a3f55,
    text: "#e7e9f2",
    dim: "#5b6178",
    accent: "#4ad6ff",
    keyword: "#ff7ad9",
    fixedName: "#8fe3ff",
    error: "#ff4545",
    success: "#51e36b"
};
// Contorno do encaixe na cor da categoria: dica visual de que peça vai ali.
const SLOT_TINT = { nome: 0x4ad6ff, op: 0xffb347, valor: 0x6f8cff };
const KEYWORDS = ["se", "senão", "e", "ou", "não"];

export function createConsole(scene, puzzle, options) {
    return puzzle?.lines
        ? new ConditionalConsole(scene, puzzle, options)
        : new BlockProgrammingConsole(scene, puzzle, options);
}

export default class ConditionalConsole extends BlockProgrammingConsole {
    buildModel() {
        this.template = this.puzzle.lines.map(parseTemplateLine);
        this.slots = [];
        this.fixedTokens = [];

        this.template.forEach((line, row) => {
            let x = CODE_X + line.indent * INDENT_W;
            const y = CODE_Y + row * LINE_H;
            line.tokens.forEach((token, col) => {
                if (typeof token === "string") {
                    const w = token.length * 13;   // VCR 22px ≈ 13px por caractere.
                    this.fixedTokens.push({ text: token, x, y });
                    x += w + TOKEN_GAP;
                } else {
                    this.slots.push({
                        row, col,
                        category: token.category,
                        x: x + BLOCK_W / 2,
                        y,
                        piece: null
                    });
                    x += BLOCK_W + TOKEN_GAP;
                }
            });
        });

        const pieces = [];
        let id = 0;
        Object.entries(this.puzzle.blocks ?? {}).forEach(([category, labels]) => {
            labels.forEach((label) => pieces.push({ id: id++, category, label }));
        });
        Phaser.Utils.Array.Shuffle(pieces);
        const center = PANEL_X + PANEL_W / 2;
        pieces.forEach((piece, i) => {
            const col = i % TRAY_PER_ROW;
            const row = Math.floor(i / TRAY_PER_ROW);
            const rowCount = Math.min(pieces.length - row * TRAY_PER_ROW, TRAY_PER_ROW);
            piece.homeX = center - ((rowCount - 1) * TRAY_SPACING_X) / 2 + col * TRAY_SPACING_X;
            piece.homeY = TRAY_Y + row * TRAY_SPACING_Y;
            piece.floatX = Phaser.Math.Between(-4, 4);
            piece.floatY = Phaser.Math.Between(-4, 4);
            piece.floatDelay = Phaser.Math.Between(0, 700);
            piece.slot = null;
        });
        this.pieces = pieces;
    }

    build() {
        const s = this.scene;
        this.container = s.add.container(0, 0).setDepth(1000);

        const backdrop = s.add.graphics();
        backdrop.fillStyle(0x000000, 0.8);
        backdrop.fillRect(0, 0, WIDTH, HEIGHT);

        const panel = s.add.graphics();
        panel.fillStyle(COLOR.panel, 0.98);
        panel.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
        panel.lineStyle(2, COLOR.border, 0.85);
        panel.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
        panel.fillStyle(COLOR.border, 0.12);
        panel.fillRect(PANEL_X, PANEL_Y, PANEL_W, 44);
        panel.lineBetween(PANEL_X, PANEL_Y + 44, PANEL_X + PANEL_W, PANEL_Y + 44);
        // Separa código | testes e código | prateleira.
        panel.lineStyle(1, COLOR.border, 0.35);
        panel.lineBetween(TESTS_X - 16, PANEL_Y + 96, TESTS_X - 16, TRAY_Y - 40);
        panel.lineBetween(PANEL_X + PAD, TRAY_Y - 34, PANEL_X + PANEL_W - PAD, TRAY_Y - 34);
        panel.lineStyle(1, 0x000000, 0.15);
        for (let y = PANEL_Y + 45; y < PANEL_Y + PANEL_H; y += 4) {
            panel.lineBetween(PANEL_X + 1, y, PANEL_X + PANEL_W - 1, y);
        }

        const title = s.add.text(PANEL_X + PAD, PANEL_Y + 12, `MONTAR :: ${this.puzzle.title}`, {
            fontFamily: "VCR", fontSize: "20px", color: COLOR.accent
        });
        const escHint = s.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + 12, "[ESC] SAIR", {
            fontFamily: "VCR", fontSize: "16px", color: COLOR.dim
        }).setOrigin(1, 0);
        const briefing = s.add.text(PANEL_X + PAD, PANEL_Y + 56, this.puzzle.briefing.join("\n"), {
            fontFamily: "VCR", fontSize: "19px", color: "#f4f6fb", lineSpacing: 6,
            wordWrap: { width: TESTS_X - PANEL_X - PAD - 30 }
        });
        briefing.setShadow(0, 2, "#000000", 4, false, true);

        this.container.add([backdrop, panel, title, escHint, briefing]);

        // Números de linha + texto fixo do programa (palavras-chave em destaque).
        this.template.forEach((_, row) => {
            this.container.add(s.add.text(PANEL_X + PAD, CODE_Y + row * LINE_H, String(row + 1), {
                fontFamily: "VCR", fontSize: "16px", color: COLOR.dim
            }).setOrigin(0, 0.5));
        });
        this.fixedTokens.forEach((t) => {
            const color = KEYWORDS.includes(t.text) ? COLOR.keyword
                : /^[:=]$/.test(t.text) ? COLOR.text : COLOR.fixedName;
            this.container.add(s.add.text(t.x, t.y, t.text, {
                fontFamily: "VCR", fontSize: "22px", color
            }).setOrigin(0, 0.5));
        });

        this.buildTestsPanel();

        this.outputText = s.add.text(PANEL_X + PAD, TRAY_Y - 58, "", {
            fontFamily: "VCR", fontSize: "17px", color: COLOR.dim,
            wordWrap: { width: TESTS_X - PANEL_X - PAD - 30 }
        }).setOrigin(0, 0.5);

        const footer = s.add.text(PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 12,
            this.singleAttempt
                ? "monte com cuidado: uma única tentativa"
                : "encaixe todos os blocos: o programa roda nos testes sozinho",
            { fontFamily: "VCR", fontSize: "15px", color: COLOR.dim }
        ).setOrigin(0.5, 1);
        this.container.add([this.outputText, footer]);

        if (this.timeLimitMs) {
            this.timerText = s.add.text(TESTS_X + TESTS_W, PANEL_Y + 60, "", {
                fontFamily: "VCR", fontSize: "20px", color: "#ffb347"
            }).setOrigin(1, 0);
            this.container.add(this.timerText);
        }

        const hintButton = s.add.text(PANEL_X + PAD, PANEL_Y + PANEL_H - 12, "[ DICA ]", {
            fontFamily: "VCR", fontSize: "16px", color: COLOR.accent
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
        hintButton.on("pointerover", () => hintButton.setColor("#ffffff"));
        hintButton.on("pointerout", () => hintButton.setColor(COLOR.accent));
        hintButton.on("pointerdown", () => this.showHint());
        this.container.add(hintButton);

        this.slotGraphics = s.add.graphics();
        this.container.add(this.slotGraphics);
        this.drawSlots();

        this.pieces.forEach((piece) => this.createPiece(piece));
    }

    // Coluna da direita: estado inicial e um cartão por caso de teste. A
    // execução pinta cada cartão de verde/vermelho, um de cada vez.
    buildTestsPanel() {
        const s = this.scene;
        const header = s.add.text(TESTS_X, TESTS_Y, "TESTES", {
            fontFamily: "VCR", fontSize: "18px", color: COLOR.accent
        });
        this.container.add(header);

        let y = TESTS_Y + 28;
        const defaults = this.puzzle.defaults ?? {};
        if (Object.keys(defaults).length) {
            this.container.add(s.add.text(TESTS_X, y, `início: ${describe(defaults)}`, {
                fontFamily: "VCR", fontSize: "15px", color: COLOR.dim,
                wordWrap: { width: TESTS_W }
            }));
            y += 26;
        }

        // Até 4 casos cabem confortavelmente na coluna.
        const cardH = Math.min(78, Math.floor((TRAY_Y - 44 - y) / this.puzzle.tests.length) - 6);
        this.testCards = this.puzzle.tests.map((test, i) => {
            const top = y + i * (cardH + 6);
            const box = s.add.graphics();
            const given = s.add.text(TESTS_X + 10, top + 8, `se ${describe(test.given)}`, {
                fontFamily: "VCR", fontSize: "16px", color: COLOR.text
            });
            const expect = s.add.text(TESTS_X + 10, top + 30, `espera ${describe(test.expect)}`, {
                fontFamily: "VCR", fontSize: "15px", color: COLOR.dim, wordWrap: { width: TESTS_W - 20 }
            });
            const mark = s.add.text(TESTS_X + TESTS_W - 10, top + 8, "", {
                fontFamily: "VCR", fontSize: "16px", color: COLOR.dim
            }).setOrigin(1, 0);
            this.container.add([box, given, expect, mark]);
            const card = { box, expect, mark, top, h: cardH, test };
            this.paintCard(card, null);
            return card;
        });
    }

    paintCard(card, result) {
        const color = result === null ? COLOR.slot : result.pass ? 0x51e36b : 0xff4545;
        card.box.clear();
        card.box.fillStyle(color, result === null ? 0.05 : 0.12);
        card.box.fillRect(TESTS_X, card.top, TESTS_W, card.h);
        card.box.lineStyle(1, color, result === null ? 0.7 : 0.9);
        card.box.strokeRect(TESTS_X, card.top, TESTS_W, card.h);

        if (result === null) {
            card.mark.setText("");
            card.expect.setText(`espera ${describe(card.test.expect)}`).setColor(COLOR.dim);
            return;
        }
        card.mark.setText(result.pass ? "OK" : "FALHOU").setColor(result.pass ? COLOR.success : COLOR.error);
        if (!result.pass) {
            card.expect.setText(result.error
                ? `erro: ${result.error}`
                : `deu ${describe(result.got)}`).setColor(COLOR.error);
        }
    }

    resetCards() {
        this.revealTimer?.remove();
        this.revealTimer = null;
        this.testCards?.forEach((card) => this.paintCard(card, null));
    }

    drawSlots(highlight = null) {
        this.slotGraphics.clear();
        this.slots.forEach((slot) => {
            const filled = !!slot.piece;
            const armed = slot === highlight;
            const left = slot.x - BLOCK_W / 2;
            const top = slot.y - BLOCK_H / 2;
            const tint = SLOT_TINT[slot.category] ?? COLOR.border;
            this.slotGraphics.lineStyle(armed ? 3 : 2, armed ? 0xf7f7f7 : tint, armed ? 1 : filled ? 0.5 : 0.8);
            this.slotGraphics.strokeRoundedRect(left, top, BLOCK_W, BLOCK_H, 8);
            if (!filled) {
                this.slotGraphics.fillStyle(armed ? 0xf7f7f7 : tint, armed ? 0.14 : 0.06);
                this.slotGraphics.fillRoundedRect(left, top, BLOCK_W, BLOCK_H, 8);
            }
        });
    }

    createPiece(piece) {
        const s = this.scene;
        const container = s.add.container(piece.homeX, piece.homeY);
        container.setSize(BLOCK_W, BLOCK_H);
        const image = s.add.image(0, 0, "blocks", FRAME[piece.category]).setScale(BLOCK_SCALE);
        const label = s.add.text(0, -1, piece.label, {
            fontFamily: "VCR", fontSize: "19px", color: "#ffffff",
            stroke: "#0a0d16", strokeThickness: 4
        }).setOrigin(0.5);
        const dragArea = s.add.rectangle(0, 0, BLOCK_W, BLOCK_H, 0xffffff, 0.001);
        container.add([image, label, dragArea]);

        dragArea.setInteractive({ useHandCursor: true });
        s.input.setDraggable(dragArea);
        dragArea.on("dragstart", () => this.onDragStart(piece));
        dragArea.on("drag", (pointer) => this.onDrag(piece, pointer));
        dragArea.on("dragend", () => this.onDragEnd(piece));

        piece.container = container;
        piece.dragArea = dragArea;
        this.container.add(container);
        this.startFloat(piece);
    }

    // Tirou uma peça do programa: os resultados antigos deixam de valer.
    onDragStart(piece) {
        if (this.solved || this.running) return;
        this.resetCards();
        super.onDragStart(piece);
    }

    // Peça arrastada enquanto os testes rodam volta para a prateleira: o
    // programa em execução não muda no meio.
    onDragEnd(piece) {
        if (this.running) {
            piece.container.setScale(1).setAlpha(1);
            if (piece.slot) {
                this.scene.tweens.add({ targets: piece.container, x: piece.slot.x, y: piece.slot.y, duration: 140 });
            } else {
                this.returnHome(piece);
            }
            return;
        }
        super.onDragEnd(piece);
    }

    // Programa com o encaixe preenchido pelo jogador.
    programLines() {
        return this.template.map((line, row) => ({
            indent: line.indent,
            tokens: line.tokens.map((token, col) => {
                if (typeof token === "string") return token;
                return this.slots.find((sl) => sl.row === row && sl.col === col).piece.label;
            })
        }));
    }

    checkSolution() {
        if (this.running || this.slots.some((slot) => !slot.piece)) return;
        this.attempted = true;

        const results = runTests(this.programLines(), this.puzzle.tests, this.puzzle.defaults);
        const allPass = results.every((r) => r.pass);

        // Executa caso a caso (o jogador VÊ o programa rodando em cada entrada).
        this.running = true;
        this.setOutput("> executando...", COLOR.dim);
        let i = 0;
        this.revealTimer = this.scene.time.addEvent({
            delay: REVEAL_MS,
            repeat: results.length - 1,
            callback: () => {
                this.paintCard(this.testCards[i], results[i]);
                i += 1;
                if (i < results.length) return;
                this.revealTimer = null;
                this.running = false;
                if (allPass) {
                    this.handleSuccess();
                } else {
                    this.handleTestFailure(results);
                }
            }
        });
    }

    // Diferente do console de variável, NÃO devolve peças: o jogador lê qual
    // caso falhou e ajusta o que achar que está errado (é depuração, não chute).
    handleTestFailure(results) {
        this.countError();
        Sfx.play(this.scene, "error");
        const failed = results.filter((r) => !r.pass).length;
        const error = results.find((r) => r.error)?.error;
        this.setOutput(error
            ? `o programa não roda: ${error}`
            : `${failed} de ${results.length} testes falharam. Veja qual caso deu errado`, COLOR.error);

        if (this.singleAttempt) {
            this.timerEvent?.remove();
            this.timerEvent = null;
            this.pieces.forEach((piece) => {
                this.stopFloat(piece);
                piece.dragArea.disableInteractive();
            });
            this.scene.time.delayedCall(1600, () => this.close());
        }
    }

    close(viaEsc = false) {
        this.revealTimer?.remove();
        this.revealTimer = null;
        this.running = false;
        super.close(viaEsc);
    }
}

// { porta: false, cracha: 3 } -> "porta = false, cracha = 3"
function describe(values) {
    return Object.entries(values).map(([k, v]) => `${k} = ${formatValue(v)}`).join(", ");
}
