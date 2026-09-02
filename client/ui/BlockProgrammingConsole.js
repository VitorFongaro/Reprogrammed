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
//
// Sequências customizadas (ex.: forca = forca * 2, com 5 encaixes) vêm em
// `puzzle.blockSequence = [{ category, label }]`; sem ela, a sequência padrão
// [variável] [=] [valor] é derivada de variable/expected. `options.singleAttempt`
// congela e fecha o console no primeiro erro (modo combate: errar consome o turno).
// `options.timeLimitMs` adiciona contagem regressiva; estourar o tempo = falha.
// O briefing descreve só o OBJETIVO; a estrutura do código sai no botão [DICA]
// (texto de `puzzle.hint`, na voz do Cosmo, sob demanda).

import { recordAttempt } from "../state/telemetry.js";
import Sfx from "./Sfx";

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

const SLOT_CAPTIONS = { nome: "variável", op: "operador", valor: "valor" };

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
        Sfx.preload(scene);
    }

    constructor(scene, puzzle, options = {}) {
        this.scene = scene;
        this.puzzle = puzzle;
        this.onSolved = options.onSolved;
        this.onClose = options.onClose;
        // Sair pelo [ESC] ANTES de completar uma tentativa é um CANCELAMENTO: se o
        // chamador passar onCancel, ele é chamado em vez de onClose e a saída não
        // conta como tentativa (no combate: volta ao menu sem perder o turno).
        this.onCancel = options.onCancel;
        // Slug do puzzle: sem ele a tentativa não é medida.
        this.puzzleId = options.puzzleId ?? null;
        this.singleAttempt = options.singleAttempt ?? false;
        this.timeLimitMs = options.timeLimitMs ?? null;

        this.isOpen = false;
        this.solved = false;
        this.attempted = false;   // virou true quando o tabuleiro cheio foi avaliado

        this.buildModel();
    }

    // Monta a solução (encaixes em sequência) e a lista de blocos disponíveis
    // (solução + distratores), embaralhada para posicionar na prateleira.
    buildModel() {
        const sequence = this.puzzle.blockSequence ?? [
            { category: "nome", label: this.puzzle.variable },
            { category: "op", label: "=" },
            { category: "valor", label: formatExpected(this.puzzle) }
        ];

        // Espaçamento dinâmico: sequências longas (5 encaixes) ainda cabem no painel.
        const spacing = Math.min(
            SLOT_SPACING,
            Math.floor((PANEL_W - PAD * 2 - BLOCK_W) / Math.max(sequence.length - 1, 1))
        );

        this.slots = sequence.map((entry, index) => ({
            index,
            category: entry.category,
            caption: entry.caption ?? SLOT_CAPTIONS[entry.category],
            expected: entry.label,
            x: SLOT_CENTER_X + (index - (sequence.length - 1) / 2) * spacing,
            y: SLOT_Y,
            piece: null
        }));

        const distractors = this.puzzle.blockDistractors ?? {};
        const pieces = [];
        let id = 0;

        sequence.forEach((entry) => {
            pieces.push({ id: id++, category: entry.category, label: entry.label });
        });
        Object.entries(distractors).forEach(([category, labels]) => {
            labels.forEach((label) => {
                pieces.push({ id: id++, category, label });
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
        this.startAttempt();
        this.build();

        if (this.timeLimitMs) {
            this.deadline = this.scene.time.now + this.timeLimitMs;
            this.timerEvent = this.scene.time.addEvent({
                delay: 100,
                loop: true,
                callback: () => this.updateTimer()
            });
            this.updateTimer();
        }

        // Registra o ESC no próximo tick (não captura a tecla [E] que abriu).
        this.scene.time.delayedCall(0, () => {
            if (!this.isOpen) return;
            this.escHandler = (event) => {
                if (event.key === "Escape") this.close(true);
            };
            this.scene.input.keyboard.on("keydown", this.escHandler);
        });
    }

    close(viaEsc = false) {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.escHandler) {
            this.scene.input.keyboard.off("keydown", this.escHandler);
            this.escHandler = null;
        }
        this.timerEvent?.remove();
        this.timerEvent = null;
        this.pieces.forEach((piece) => this.stopFloat(piece));
        this.container?.destroy();
        this.container = null;

        // Cancelou: saiu pelo [ESC] sem resolver e sem chegar a submeter uma
        // tentativa, e o chamador quer tratar isso (ex.: combate — voltar ao menu
        // sem perder o turno). Não conta como tentativa no perfil de aprendizagem.
        if (viaEsc && !this.solved && !this.attempted && this.onCancel) {
            this.onCancel();
            return;
        }

        this.finishAttempt(this.solved);
        this.onClose?.();
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
        // Scanlines (suaves, para não atrapalhar a leitura do texto).
        panel.lineStyle(1, 0x000000, 0.15);
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
            PANEL_Y + 74,
            this.puzzle.briefing.join("\n"),
            { fontFamily: "VCR", fontSize: "22px", color: "#f4f6fb", lineSpacing: 12 }
        );
        // Sombra escura sutil: destaca a fonte fina do fundo com scanlines.
        briefing.setShadow(0, 2, "#000000", 4, false, true);

        this.outputText = this.scene.add.text(SLOT_CENTER_X, SLOT_Y + 64, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: COLOR.dim,
            align: "center",
            wordWrap: { width: PANEL_W - PAD * 2 }
        }).setOrigin(0.5, 0);

        const footer = this.scene.add.text(
            SLOT_CENTER_X,
            PANEL_Y + PANEL_H - 22,
            this.singleAttempt
                ? "monte com cuidado — uma única tentativa por turno"
                : "arraste os blocos para os encaixes",
            { fontFamily: "VCR", fontSize: "16px", color: COLOR.dim }
        ).setOrigin(0.5, 1);

        this.container.add([backdrop, panel, title, escHint, briefing, this.outputText, footer]);

        if (this.puzzle.gauge) {
            this.buildGauge();
        }

        if (this.timeLimitMs) {
            this.timerText = this.scene.add.text(PANEL_X + PANEL_W - PAD, PANEL_Y + 56, "", {
                fontFamily: "VCR",
                fontSize: "20px",
                color: "#ffb347"
            }).setOrigin(1, 0);
            this.container.add(this.timerText);
        }

        const hintButton = this.scene.add.text(PANEL_X + PAD, PANEL_Y + PANEL_H - 22, "[ DICA ]", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: COLOR.accent
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true });
        hintButton.on("pointerover", () => hintButton.setColor("#ffffff"));
        hintButton.on("pointerout", () => hintButton.setColor(COLOR.accent));
        hintButton.on("pointerdown", () => this.showHint());
        this.container.add(hintButton);

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

    // --- Medidor visual opcional (puzzle.gauge) --------------------------------
    // Dá um VISUAL ao puzzle para o jogador resolver por RACIOCÍNIO, em vez de o
    // texto entregar a resposta. Tipos: "battery" (enche até um máximo),
    // "thermometer" (sobe até um alvo), "sector" (mapa/grade — ache a célula certa)
    // e "toggle" (barreira liga/desliga). Reage AO VIVO ao valor no encaixe; com
    // medidor, um encaixe errado NÃO devolve a peça (ver handleFailure).
    buildGauge() {
        const cfg = this.puzzle.gauge;
        let bw = 150;
        let bh = 74;
        let by = PANEL_Y + 100;
        let rightPad = 14;
        if (cfg.kind === "thermometer") { bw = 60; bh = 150; by = PANEL_Y + 60; }
        else if (cfg.kind === "sector") { bw = 262; bh = 132; by = PANEL_Y + 54; rightPad = 0; }
        const bx = PANEL_X + PANEL_W - PAD - bw - rightPad;
        this.gaugeRect = { x: bx, y: by, w: bw, h: bh };

        // A grade de setor dispensa rótulo em cima (o título da janela já diz
        // "SETOR" e ele colidiria com a barra de título).
        if (cfg.kind !== "sector") {
            this.gaugeLabel = this.scene.add.text(bx + bw / 2, by - 22, cfg.label ?? "STATUS", {
                fontFamily: "VCR", fontSize: "16px", color: COLOR.dim
            }).setOrigin(0.5, 1);
            this.container.add(this.gaugeLabel);
        }
        this.gaugeGraphics = this.scene.add.graphics();
        this.gaugeState = this.scene.add.text(bx + bw / 2, by + bh + 6, "", {
            fontFamily: "VCR", fontSize: "15px", color: COLOR.dim, align: "center"
        }).setOrigin(0.5, 0);

        this.container.add([this.gaugeGraphics, this.gaugeState]);
        if (cfg.kind === "sector") {
            this.buildSectorLabels();
        }
        this.updateGauge();
    }

    // Rótulos fixos dos eixos do mapa de setores (linhas A/B/C, colunas 1/2/3).
    buildSectorLabels() {
        const cfg = this.puzzle.gauge;
        const rows = cfg.rows ?? ["A", "B", "C"];
        const cols = cfg.cols ?? ["1", "2", "3"];
        const b = this.gaugeRect;
        const ox = 24;
        const oy = 20;
        const cw = (b.w - ox) / cols.length;
        const chh = (b.h - oy) / rows.length;
        cols.forEach((c, i) => {
            this.container.add(this.scene.add.text(b.x + ox + cw * (i + 0.5), b.y, c, {
                fontFamily: "VCR", fontSize: "16px", color: COLOR.accent
            }).setOrigin(0.5, 0));
        });
        rows.forEach((r, i) => {
            this.container.add(this.scene.add.text(b.x + 8, b.y + oy + chh * (i + 0.5), r, {
                fontFamily: "VCR", fontSize: "16px", color: COLOR.accent
            }).setOrigin(0.5, 0.5));
        });
    }

    valueSlot() {
        return this.slots.find((slot) => slot.category === "valor") ?? null;
    }

    valueLabel() {
        const slot = this.valueSlot();
        return slot?.piece?.label ?? null;
    }

    // Valor numérico no encaixe (null se vazio ou não-numérico).
    currentValue() {
        const label = this.valueLabel();
        if (label === null) return null;
        if (INT_REGEX.test(label) || FLOAT_REGEX.test(label)) return parseFloat(label);
        return null;
    }

    // O valor no encaixe é exatamente o esperado?
    valueCorrect() {
        const slot = this.valueSlot();
        return !!slot && !!slot.piece && slot.piece.label === slot.expected;
    }

    updateGauge() {
        if (!this.gaugeGraphics) return;
        this.gaugeGraphics.clear();
        const kind = this.puzzle.gauge.kind;
        let result;
        if (kind === "thermometer") result = this.drawThermometer();
        else if (kind === "sector") result = this.drawSector();
        else if (kind === "toggle") result = this.drawToggle();
        else result = this.drawBattery();
        this.gaugeState.setText(result.state).setColor(result.color);
    }

    drawBattery() {
        const b = this.gaugeRect;
        const g = this.gaugeGraphics;
        const max = this.puzzle.gauge.max ?? 100;
        const label = this.valueLabel();
        const num = this.currentValue();
        const valid = num !== null;
        const correct = this.valueCorrect();
        const fill = valid ? Phaser.Math.Clamp(num / max, 0, 1) : 0;

        const frame = correct ? COLOR.success : COLOR.border;
        g.lineStyle(3, frame, 0.9);
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 8);
        g.fillStyle(frame, 0.9);
        g.fillRect(b.x + b.w + 2, b.y + b.h / 2 - 12, 8, 24);
        if (fill > 0) {
            const pad = 6;
            g.fillStyle(correct ? 0x51e36b : 0xffb347, 0.9);
            g.fillRoundedRect(b.x + pad, b.y + pad, (b.w - pad * 2) * fill, b.h - pad * 2, 4);
        }
        if (label === null) return { state: "", color: COLOR.dim };
        if (!valid) return { state: "TIPO INVÁLIDO", color: COLOR.error };
        if (correct) return { state: "CHEIA", color: COLOR.success };
        return { state: "CARREGANDO...", color: "#ffb347" };
    }

    drawThermometer() {
        const b = this.gaugeRect;
        const g = this.gaugeGraphics;
        const cfg = this.puzzle.gauge;
        const min = cfg.min ?? 0;
        const max = cfg.max ?? 40;
        const target = cfg.target ?? this.puzzle.expected;
        const label = this.valueLabel();
        const num = this.currentValue();
        const valid = num !== null;
        const correct = this.valueCorrect();

        const cx = b.x + b.w / 2;
        const tubeW = 14;
        const bulbR = 15;
        const sTop = b.y + 8;
        const bulbCY = b.y + b.h - bulbR;
        const sBot = bulbCY - bulbR + 2;
        const col = correct ? 0x51e36b : 0xffb347;
        const frame = correct ? COLOR.success : COLOR.border;
        const yFor = (v) => Phaser.Math.Linear(sBot, sTop, Phaser.Math.Clamp((v - min) / (max - min), 0, 1));

        g.fillStyle(0x0b0d12, 1);
        g.fillRoundedRect(cx - tubeW / 2, sTop, tubeW, sBot - sTop + bulbR, tubeW / 2);
        g.fillCircle(cx, bulbCY, bulbR);
        g.lineStyle(2, frame, 0.9);
        g.strokeRoundedRect(cx - tubeW / 2, sTop, tubeW, sBot - sTop + bulbR, tubeW / 2);
        g.strokeCircle(cx, bulbCY, bulbR);
        // Marcador do alvo (seta verde apontando o valor seguro).
        const ty = yFor(target);
        g.lineStyle(2, COLOR.success, 0.9);
        g.lineBetween(cx + tubeW / 2 + 3, ty, cx + tubeW / 2 + 16, ty);
        g.fillStyle(COLOR.success, 0.9);
        g.fillTriangle(cx + tubeW / 2 + 16, ty - 5, cx + tubeW / 2 + 16, ty + 5, cx + tubeW / 2 + 8, ty);
        // Mercúrio (bulbo cheio + coluna até o valor).
        g.fillStyle(col, 1);
        g.fillCircle(cx, bulbCY, bulbR - 3);
        if (valid) {
            const my = yFor(num);
            g.fillRect(cx - (tubeW - 6) / 2, my, tubeW - 6, sBot - my + 4);
        }
        if (label === null) return { state: "", color: COLOR.dim };
        if (!valid) return { state: "TIPO INVÁLIDO", color: COLOR.error };
        if (correct) return { state: "NO ALVO", color: COLOR.success };
        return { state: num < target ? "ABAIXO DO ALVO" : "ACIMA DO ALVO", color: "#ffb347" };
    }

    drawSector() {
        const b = this.gaugeRect;
        const g = this.gaugeGraphics;
        const cfg = this.puzzle.gauge;
        const rows = cfg.rows ?? ["A", "B", "C"];
        const cols = cfg.cols ?? ["1", "2", "3"];
        const label = this.valueLabel();
        const sel = label !== null ? label.replace(/["']/g, "") : null;
        const target = String(this.puzzle.expected);
        const correct = this.valueCorrect();
        const isStr = label !== null && STRING_REGEX.test(label);

        const ox = 24;
        const oy = 20;
        const cw = (b.w - ox) / cols.length;
        const chh = (b.h - oy) / rows.length;
        rows.forEach((r, ri) => {
            cols.forEach((c, ci) => {
                const cell = r + c;
                const x = b.x + ox + ci * cw;
                const y = b.y + oy + ri * chh;
                g.lineStyle(1, COLOR.slot, 0.9);
                g.strokeRect(x + 3, y + 3, cw - 6, chh - 6);
                if (cell === sel) {
                    g.fillStyle(correct ? 0x51e36b : 0xffb347, 0.35);
                    g.fillRect(x + 3, y + 3, cw - 6, chh - 6);
                }
                if (cell === target) {
                    const mx = x + cw / 2;
                    const my = y + chh / 2;
                    g.fillStyle(0x4ad6ff, 1);
                    g.fillCircle(mx, my, 7);
                    g.lineStyle(2, 0x4ad6ff, 0.4);
                    g.strokeCircle(mx, my, 12);
                }
            });
        });
        if (label === null) return { state: "você está no setor marcado", color: COLOR.dim };
        if (!isStr) return { state: "TIPO INVÁLIDO", color: COLOR.error };
        if (correct) return { state: "SETOR CERTO", color: COLOR.success };
        return { state: "OUTRO SETOR", color: "#ffb347" };
    }

    drawToggle() {
        const b = this.gaugeRect;
        const g = this.gaugeGraphics;
        const label = this.valueLabel();
        const boolVal = label === "true" ? true : label === "false" ? false : null;
        const correct = this.valueCorrect();
        const barrierOn = boolVal !== false;   // ligada, a menos que seja exatamente false.

        const frame = correct ? COLOR.success : COLOR.border;
        g.fillStyle(0x0b0d12, 1);
        g.fillRoundedRect(b.x, b.y, b.w, b.h, 8);
        g.lineStyle(2, frame, 0.9);
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 8);
        // Emissores nas laterais.
        g.fillStyle(barrierOn ? 0xff4545 : 0x3a3f55, 1);
        g.fillRect(b.x + 6, b.y + 8, 8, b.h - 16);
        g.fillRect(b.x + b.w - 14, b.y + 8, 8, b.h - 16);
        // Feixes.
        const beams = 3;
        for (let i = 0; i < beams; i += 1) {
            const y = b.y + (b.h * (i + 1)) / (beams + 1);
            if (barrierOn) {
                g.lineStyle(8, 0xff4545, 0.18);
                g.lineBetween(b.x + 14, y, b.x + b.w - 14, y);
                g.lineStyle(3, 0xff4545, 1);
                g.lineBetween(b.x + 14, y, b.x + b.w - 14, y);
            } else {
                g.lineStyle(2, 0x3a3f55, 0.8);
                g.lineBetween(b.x + 14, y, b.x + b.w - 14, y);
            }
        }
        if (label === null) return { state: "", color: COLOR.dim };
        if (boolVal === null) return { state: "TIPO INVÁLIDO", color: COLOR.error };
        if (correct) return { state: "BARREIRA DESLIGADA", color: COLOR.success };
        return { state: "BARREIRA LIGADA", color: COLOR.error };
    }

    createPiece(piece) {
        const container = this.scene.add.container(piece.homeX, piece.homeY);
        container.setSize(BLOCK_W, BLOCK_H);

        const image = this.scene.add.image(0, 0, "blocks", FRAME[piece.category]).setOrigin(0.5);
        const label = this.scene.add.text(0, -1, piece.label, {
            fontFamily: "VCR",
            fontSize: "22px",
            color: "#ffffff",
            // Contorno escuro: o texto branco fica legível mesmo nos blocos claros
            // (nome/ciano, operador/âmbar).
            stroke: "#0a0d16",
            strokeThickness: 4
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
        this.updateGauge();
        this.drawSlots();
    }

    onDrag(piece, pointer) {
        const parent = piece.container.parentContainer;
        const local = parent ? parent.getLocalPoint(pointer.x, pointer.y) : pointer;
        piece.container.x = local.x;
        piece.container.y = local.y;
        this.drawSlots(this.nearestSlot(piece));
    }

    onDragEnd(piece) {
        piece.container.setScale(1);
        piece.container.setAlpha(1);
        if (this.solved) return;

        const slot = this.nearestSlot(piece);
        if (slot) {
            // Alvo ocupado por outra peça: ela volta pra prateleira e a nova assume.
            if (slot.piece) {
                this.evict(slot.piece);
            }
            this.placeInSlot(piece, slot);
        } else {
            this.returnHome(piece);
        }
    }

    // Encaixe mais próximo dentro do raio de snap (ocupado ou não). Se o alvo já
    // tiver uma peça, ela é devolvida à prateleira (troca) — ver onDragEnd.
    nearestSlot(piece) {
        let best = null;
        let bestDistance = SNAP_RADIUS;
        this.slots.forEach((slot) => {
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

    // Devolve uma peça que estava num encaixe para a prateleira (com flutuação).
    evict(piece) {
        if (piece.slot) {
            piece.slot.piece = null;
        }
        piece.slot = null;
        this.updateGauge();
        this.scene.tweens.add({
            targets: piece.container,
            x: piece.homeX,
            y: piece.homeY,
            duration: 220,
            ease: "Back.easeOut",
            onComplete: () => {
                if (!piece.slot) this.startFloat(piece);
            }
        });
    }

    placeInSlot(piece, slot) {
        slot.piece = piece;
        piece.slot = slot;
        Sfx.play(this.scene, "select");   // bloco encaixado num espaço
        this.updateGauge();
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

    // Dica sob demanda, na voz do Cosmo (o briefing não entrega a estrutura).
    showHint() {
        if (this.solved || !this.puzzle.hint) {
            return;
        }
        this.setOutput(`COSMO: ${this.puzzle.hint}`, COLOR.accent);
    }

    // Contagem regressiva (defesa no combate): estourar o tempo conta como falha.
    updateTimer() {
        if (!this.isOpen || this.solved) {
            return;
        }

        const remaining = Math.max(0, this.deadline - this.scene.time.now);
        const seconds = remaining / 1000;
        this.timerText?.setText(`TEMPO: ${seconds.toFixed(1)}s`)
            .setColor(seconds <= 5 ? "#ff4545" : "#ffb347");

        if (remaining <= 0) {
            this.timerEvent?.remove();
            this.timerEvent = null;
            this.pieces.forEach((piece) => {
                this.stopFloat(piece);
                piece.dragArea.disableInteractive();
            });
            this.attempted = true;   // estourou o tempo: conta como tentativa
            this.countError();
            Sfx.play(this.scene, "error");   // tempo esgotado = falhou o código
            this.setOutput("TEMPO ESGOTADO", COLOR.error);
            this.scene.time.delayedCall(1200, () => this.close());
        }
    }

    checkSolution() {
        if (this.slots.some((slot) => !slot.piece)) return;
        this.attempted = true;   // tabuleiro cheio avaliado: já não é mais cancelamento

        const wrongSlots = this.slots.filter((slot) => slot.piece.label !== slot.expected);

        if (wrongSlots.length === 0) {
            this.handleSuccess();
        } else {
            this.handleFailure(wrongSlots);
        }
    }

    // Mensagem específica para o PRIMEIRO encaixe errado (na ordem da sequência),
    // em vez de um aviso genérico: variável errada, operador errado, tipo errado
    // ou valor errado.
    diagnose(wrongSlots) {
        const slot = this.slots.find((s) => wrongSlots.includes(s));
        const got = slot.piece.label;

        if (slot.category === "nome") {
            return `variável incorreta: "${got}" não é a pedida aqui`;
        }
        if (slot.category === "op") {
            return `operador incorreto: aqui vai  ${slot.expected}`;
        }

        const expectedType = labelType(slot.expected);
        if (!typeMatches(expectedType, labelType(got))) {
            return `tipo errado: aqui vai ${TYPE_LABELS[expectedType]}`;
        }
        return this.puzzle.wrongValueMessage ?? "valor incorreto";
    }

    // Mensagem guiada pelo medidor: foca na bateria quando o VALOR está errado;
    // senão, cai no diagnóstico normal (variável/operador).
    gaugeFailMessage(wrongSlots) {
        const vs = this.valueSlot();
        if (vs && wrongSlots.includes(vs)) {
            return this.currentValue() === null
                ? "esse valor não carrega a bateria — confira o tipo"
                : "a bateria ainda não está cheia";
        }
        return this.diagnose(wrongSlots);
    }

    handleSuccess() {
        this.solved = true;
        Sfx.play(this.scene, "confirm");   // código do jogador correto
        this.timerEvent?.remove();
        this.timerEvent = null;
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
        this.countError();
        Sfx.play(this.scene, "error");   // combinação de código errada
        this.setOutput(
            this.puzzle.gauge ? this.gaugeFailMessage(wrongSlots) : this.diagnose(wrongSlots),
            COLOR.error
        );

        // Modo combate (tentativa única): o erro consome o turno — congela os
        // blocos, deixa o diagnóstico na tela e fecha sem resolver.
        if (this.singleAttempt) {
            this.timerEvent?.remove();
            this.timerEvent = null;
            this.pieces.forEach((piece) => {
                this.stopFloat(piece);
                piece.dragArea.disableInteractive();
            });
            this.scene.time.delayedCall(1400, () => this.close());
            return;
        }

        // Puzzles com medidor: NÃO devolve as peças — o jogador ajusta o valor
        // olhando a bateria (raciocínio), sem punição por encaixe "errado".
        if (this.puzzle.gauge) {
            return;
        }

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
