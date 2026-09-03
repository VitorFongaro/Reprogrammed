import Phaser from "phaser";
import { ownedItems, removeItem } from "../state/inventory.js";
import { CATEGORIES } from "../data/items.js";
import slotUrl from "../assets/ui/inv_slot.png";
import slotSelUrl from "../assets/ui/inv_slot_sel.png";
import selectUrl from "../assets/ui/inv_select.png";
import Sfx from "../ui/Sfx";

// INVENTÁRIO (overlay) no Complete UI Essential Pack (cyan): painel escuro do
// jogo, grade de slots do pack centralizada e duas ABAS no topo — INVENTÁRIO
// (itens usáveis) e MELHORIAS (upgrades fixos que a Artemis ganha de itens
// específicos nas fases). Escolher um item (clique ou [E]) abre uma JANELA de
// detalhe com a descrição e as ações (USAR / DESCARTAR / VOLTAR). Aberto pela
// sala ([I]) ou batalha (ITENS) via scene.launch("inventory", { config }) +
// pause; devolve com scene.resume.
//
// Assets de item ainda são placeholder procedural (o pack não traz ícones de
// item). config: { returnScene, status[], battle, useItem(item)->{ok,message} }.

const WIDTH = 1280;
const HEIGHT = 720;
const PANEL = { x: 180, y: 116, w: 920, h: 500 };

const TAB_W = 220;
const TAB_H = 44;

const COLS = 5;
const ROWS = 4;
const SLOT = 78;
const GAP = 14;
// Grade centralizada no painel: a descrição e as ações do item migraram para
// uma janela de detalhe (abre ao escolher o item), então a grade ocupa o painel.
const GRID_W = COLS * SLOT + (COLS - 1) * GAP;
const GRID_H = ROWS * SLOT + (ROWS - 1) * GAP;
const GRID = { x: PANEL.x + Math.round((PANEL.w - GRID_W) / 2), y: PANEL.y + 64 };
const TRAY_PAD = 24;   // moldura recuada em volta da grade.

// Janela de detalhe do item (centralizada na tela).
const POP = { w: 520, h: 400 };
POP.x = Math.round((WIDTH - POP.w) / 2);
POP.y = Math.round((HEIGHT - POP.h) / 2);

// Paleta AZUL CIANO: painel escuro do jogo + acentos ciano, combinando com os
// slots ciano do Complete UI Essential Pack.
const C = {
    backdrop: 0x000000,
    outline: 0x02060c,
    panel: 0x0b1622,
    panelDark: 0x070f18,
    recess: 0x05090f,
    light: 0x4ad6ff,
    lightest: 0x8fe3ff,
    text: "#e7e9f2",
    dim: "#6b8299",
    accent: "#4ad6ff",
    use: "#51e36b",
    discard: "#ff6b6b"
};

// Vite resolve o glob no build; a chave vira o nome do arquivo sem extensão.
const ICON_URLS = Object.fromEntries(
    Object.entries(import.meta.glob("../assets/sprites/itens/*.png", { eager: true, query: "?url", import: "default" }))
        .map(([caminho, url]) => [caminho.split("/").pop().replace(".png", ""), url])
);

export default class InventoryScene extends Phaser.Scene {
    constructor() {
        super("inventory");
    }

    init(data) {
        this.config = data?.config ?? {};
        this.tab = "inventario";
        this.index = 0;
        this.mode = "grid";   // "grid" | "detail" | "busy" (janela concluindo uma ação)
    }

    preload() {
        // Um ícone POR ITEM (32x32). O glob é resolvido pelo Vite no build, então
        // item novo em data/items.js só precisa do PNG na pasta.
        Object.entries(ICON_URLS).forEach(([nome, url]) => {
            const key = `inv-item-${nome}`;
            if (!this.textures.exists(key)) this.load.image(key, url);
        });

        if (!this.textures.exists("inv-slot")) this.load.image("inv-slot", slotUrl);
        if (!this.textures.exists("inv-slot-sel")) this.load.image("inv-slot-sel", slotSelUrl);
        if (!this.textures.exists("inv-select")) {
            this.load.spritesheet("inv-select", selectUrl, { frameWidth: 32, frameHeight: 32 });
        }
        Sfx.preload(this);   // sons de abrir/fechar o inventário
    }

    create() {
        this.scene.bringToTop();
        Sfx.play(this, "menuIn");   // inventário abriu
        this.createIcons();
        if (!this.anims.exists("inv-select-anim")) {
            this.anims.create({
                key: "inv-select-anim",
                frames: this.anims.generateFrameNumbers("inv-select", { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
        this.drawBackdrop();
        this.drawPanel();
        this.buildTabs();

        this.content = this.add.container(0, 0);
        this.showTab("inventario");

        this.time.delayedCall(0, () => {
            this.keyHandler = (event) => this.handleKey(event);
            this.input.keyboard.on("keydown", this.keyHandler);
        });
    }

    // Ícones procedurais por categoria (placeholder até haver arte de item).
    // Textura do item: o ícone próprio quando existe, senão o procedural da
    // categoria (item novo sem arte ainda não fica invisível).
    iconKey(item) {
        const key = `inv-item-${item.icon ?? item.id}`;
        return this.textures.exists(key) ? key : `inv-icon-${item.category}`;
    }

    createIcons() {
        const make = (key, draw) => {
            if (this.textures.exists(key)) return;
            const g = this.add.graphics();
            draw(g);
            g.generateTexture(key, 40, 40);
            g.destroy();
        };
        make("inv-icon-cura", (g) => { g.fillStyle(0x7fe0a0, 1); g.fillRect(16, 7, 8, 26); g.fillRect(7, 16, 26, 8); });
        make("inv-icon-reprogramacao", (g) => {
            g.lineStyle(5, 0x8fd0ff, 1);
            g.strokePoints([{ x: 18, y: 8 }, { x: 8, y: 20 }, { x: 18, y: 32 }]);
            g.strokePoints([{ x: 22, y: 8 }, { x: 32, y: 20 }, { x: 22, y: 32 }]);
        });
        make("inv-icon-upgrade", (g) => { g.fillStyle(0xffcf6b, 1); g.fillTriangle(20, 7, 7, 23, 33, 23); g.fillRect(16, 22, 8, 11); });
        make("inv-icon-chave", (g) => { g.fillStyle(0xc79bff, 1); g.fillCircle(13, 20, 7); g.fillRect(17, 17, 15, 6); g.fillRect(27, 23, 4, 8); });
    }

    drawBackdrop() {
        this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, C.backdrop, 0.7);
    }

    // Painel com borda em 2 tons (claro no topo/esq., escuro na base/dir.), estilo pack.
    drawPanel() {
        const g = this.add.graphics();
        g.fillStyle(C.outline, 1);
        g.fillRect(PANEL.x - 3, PANEL.y - 3, PANEL.w + 6, PANEL.h + 6);
        g.fillStyle(C.panel, 1);
        g.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
        g.lineStyle(2, C.light, 0.9);
        g.beginPath(); g.moveTo(PANEL.x + 1, PANEL.y + PANEL.h - 1); g.lineTo(PANEL.x + 1, PANEL.y + 1); g.lineTo(PANEL.x + PANEL.w - 1, PANEL.y + 1); g.strokePath();
        g.lineStyle(2, C.panelDark, 1);
        g.beginPath(); g.moveTo(PANEL.x + PANEL.w - 1, PANEL.y + 1); g.lineTo(PANEL.x + PANEL.w - 1, PANEL.y + PANEL.h - 1); g.lineTo(PANEL.x + 1, PANEL.y + PANEL.h - 1); g.strokePath();
    }

    buildTabs() {
        this.tabObjects = [];
        const tabs = [
            { id: "inventario", label: "INVENTÁRIO" },
            { id: "melhorias", label: "MELHORIAS" }
        ];
        tabs.forEach((t, i) => {
            const x = PANEL.x + 18 + i * (TAB_W + 8);
            const y = PANEL.y - TAB_H + 2;
            const g = this.add.graphics();
            const label = this.add.text(x + TAB_W / 2, y + TAB_H / 2 - 2, t.label, {
                fontFamily: "VCR", fontSize: "20px", color: C.dim
            }).setOrigin(0.5);
            const hit = this.add.rectangle(x + TAB_W / 2, y + TAB_H / 2, TAB_W, TAB_H, 0xffffff, 0.001)
                .setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => this.showTab(t.id));
            this.tabObjects.push({ ...t, g, label, x, y });
        });
        this.paintTabs();
    }

    paintTabs() {
        this.tabObjects.forEach((t) => {
            const active = t.id === this.tab;
            t.g.clear();
            t.g.fillStyle(C.outline, 1);
            t.g.fillRect(t.x - 2, t.y - 2, TAB_W + 4, TAB_H + 4);
            t.g.fillStyle(active ? C.panel : C.panelDark, 1);
            t.g.fillRect(t.x, t.y, TAB_W, TAB_H + 4);   // desce +4 pra "colar" no painel.
            if (active) {
                t.g.lineStyle(2, C.light, 0.9);
                t.g.beginPath(); t.g.moveTo(t.x + 1, t.y + TAB_H); t.g.lineTo(t.x + 1, t.y + 1); t.g.lineTo(t.x + TAB_W - 1, t.y + 1); t.g.lineTo(t.x + TAB_W - 1, t.y + TAB_H); t.g.strokePath();
            }
            t.label.setColor(active ? C.text : C.dim);
        });
    }

    showTab(id) {
        if (this.detail) this.closeDetail();
        this.tab = id;
        this.index = 0;
        this.paintTabs();
        this.content.removeAll(true);
        if (id === "inventario") {
            this.buildInventoryView();
        } else {
            this.buildMelhoriasView();
        }
    }

    // --- Aba INVENTÁRIO: grade limpa; escolher um item abre a janela de detalhe ---
    buildInventoryView() {
        this.items = ownedItems().filter((it) => it.category !== "upgrade");

        // Bandeja recuada atrás da grade (a descrição e as ações migraram para a
        // janela de detalhe, então a grade ocupa o painel inteiro, centralizada).
        const tray = this.add.graphics();
        tray.fillStyle(C.recess, 1);
        tray.fillRect(GRID.x - TRAY_PAD, GRID.y - TRAY_PAD, GRID_W + TRAY_PAD * 2, GRID_H + TRAY_PAD * 2);
        tray.lineStyle(1, C.outline, 1);
        tray.strokeRect(GRID.x - TRAY_PAD, GRID.y - TRAY_PAD, GRID_W + TRAY_PAD * 2, GRID_H + TRAY_PAD * 2);
        this.content.add(tray);

        this.cells = [];
        for (let i = 0; i < COLS * ROWS; i += 1) {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const cx = GRID.x + SLOT / 2 + col * (SLOT + GAP);
            const cy = GRID.y + SLOT / 2 + row * (SLOT + GAP);
            const bg = this.add.image(cx, cy, "inv-slot").setDisplaySize(SLOT, SLOT);
            // 64 = 2x de 32: escala inteira, senão o pixel do ícone borra.
            const icon = this.add.image(cx, cy, "inv-icon-cura").setDisplaySize(64, 64).setVisible(false);
            const count = this.add.text(cx + SLOT / 2 - 8, cy + SLOT / 2 - 6, "", {
                fontFamily: "VCR", fontSize: "17px", color: C.text, stroke: "#08111c", strokeThickness: 4
            }).setOrigin(1, 1);
            const hit = this.add.rectangle(cx, cy, SLOT, SLOT, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
            hit.on("pointerover", () => { if (i < this.items.length) this.select(i); });
            hit.on("pointerdown", () => { if (i < this.items.length) { this.select(i); this.openDetail(); } });
            this.content.add([bg, icon, count, hit]);
            this.cells.push({ bg, icon, count, cx, cy });
        }

        // Cursor de seleção ANIMADO (os cantos do pack que pulsam sobre o slot
        // escolhido — UI_FlatAnimated / Select01a).
        this.selectCursor = this.add.sprite(0, 0, "inv-select").setDisplaySize(SLOT, SLOT).setVisible(false);
        this.selectCursor.play("inv-select-anim");
        this.content.add(this.selectCursor);

        const hint = this.add.text(WIDTH / 2, PANEL.y + PANEL.h - 26,
            "[WASD] navegar    [E] abrir    [Q] trocar aba    [ESC] fechar", {
                fontFamily: "VCR", fontSize: "17px", color: "#9db3c9"
            }).setOrigin(0.5);
        this.content.add(hint);

        this.refreshGrid();
        this.refreshAfterChange();
    }

    refreshGrid() {
        this.cells.forEach((cell, i) => {
            const item = this.items[i];
            if (item) {
                cell.icon.setTexture(this.iconKey(item)).setVisible(true);
                cell.count.setText(item.count > 1 ? `x${item.count}` : "");
            } else {
                cell.icon.setVisible(false);
                cell.count.setText("");
            }
        });
    }

    // Move só o cursor animado — a descrição/ações vivem na janela de detalhe.
    select(i) {
        if (this.items.length === 0) return;
        this.index = Phaser.Math.Clamp(i, 0, this.items.length - 1);
        this.cells.forEach((c, k) => c.bg.setTexture(k === this.index ? "inv-slot-sel" : "inv-slot"));
        const cell = this.cells[this.index];
        this.selectCursor.setPosition(cell.cx, cell.cy).setVisible(true);
    }

    // Reaplica o estado da grade após usar/descartar (vazio → sem cursor; senão
    // seleciona o item mais próximo do índice atual).
    refreshAfterChange() {
        if (this.items.length === 0) {
            this.cells.forEach((c) => c.bg.setTexture("inv-slot"));
            this.selectCursor?.setVisible(false);
        } else {
            this.select(Math.min(this.index, this.items.length - 1));
        }
    }

    // --- Janela de detalhe do item (abre ao escolher um item) ---
    openDetail() {
        if (this.mode !== "grid" || this.items.length === 0) return;
        const item = this.items[this.index];
        if (!item) return;
        this.mode = "detail";
        this.detailItem = item;
        this.detailFocus = 0;

        const win = this.add.container(0, 0).setDepth(1100);
        this.detail = win;

        // Escurece tudo atrás e trava cliques na grade/abas.
        win.add(this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.55).setInteractive());

        const g = this.add.graphics();
        g.fillStyle(C.outline, 1); g.fillRect(POP.x - 3, POP.y - 3, POP.w + 6, POP.h + 6);
        g.fillStyle(C.panel, 1); g.fillRect(POP.x, POP.y, POP.w, POP.h);
        g.lineStyle(2, C.light, 0.9); g.strokeRect(POP.x + 1, POP.y + 1, POP.w - 2, POP.h - 2);
        win.add(g);

        const cat = CATEGORIES[item.category];
        win.add(this.add.image(POP.x + 44, POP.y + 40, this.iconKey(item)).setDisplaySize(64, 64).setOrigin(0, 0));
        win.add(this.add.text(POP.x + 128, POP.y + 34, item.name, {
            fontFamily: "VCR", fontSize: "25px", color: C.text, wordWrap: { width: POP.w - 160 }
        }));
        win.add(this.add.text(POP.x + 128, POP.y + 76,
            cat ? `[ ${cat.label} ]${item.count > 1 ? `   x${item.count}` : ""}` : "", {
                fontFamily: "VCR", fontSize: "18px", color: "#9db3c9"
            }));

        const div = this.add.graphics();
        div.lineStyle(1, C.outline, 1);
        div.beginPath(); div.moveTo(POP.x + 24, POP.y + 128); div.lineTo(POP.x + POP.w - 24, POP.y + 128); div.strokePath();
        win.add(div);

        win.add(this.add.text(POP.x + 28, POP.y + 146, item.description, {
            fontFamily: "VCR", fontSize: "18px", color: C.text, lineSpacing: 8, wordWrap: { width: POP.w - 56 }
        }));

        this.detFlash = this.add.text(POP.x + POP.w / 2, POP.y + POP.h - 92, "", {
            fontFamily: "VCR", fontSize: "16px", color: C.use
        }).setOrigin(0.5);
        win.add(this.detFlash);

        // Botões de ação (foco por teclado ou mouse).
        this.detActions = [];
        const defs = [
            { id: "usar", label: "USAR", color: C.use },
            { id: "descartar", label: "DESCARTAR", color: C.discard },
            { id: "voltar", label: "VOLTAR", color: C.accent }
        ];
        const bw = Math.round((POP.w - 56 - 2 * 16) / 3);
        const by = POP.y + POP.h - 66;
        defs.forEach((a, i) => {
            const bx = POP.x + 28 + i * (bw + 16);
            const bg = this.add.graphics();
            const label = this.add.text(bx + bw / 2, by + 24, a.label, {
                fontFamily: "VCR", fontSize: "19px", color: a.color
            }).setOrigin(0.5);
            const hit = this.add.rectangle(bx + bw / 2, by + 24, bw, 48, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
            hit.on("pointerover", () => { this.detailFocus = i; this.paintDetail(); });
            hit.on("pointerdown", () => this.confirmDetail(a.id));
            win.add([bg, label, hit]);
            this.detActions.push({ ...a, g: bg, label, x: bx, y: by, w: bw });
        });
        this.paintDetail();
    }

    paintDetail() {
        if (!this.detActions) return;
        const usableOk = this.itemUsable(this.detailItem);
        this.detActions.forEach((a, i) => {
            const enabled = a.id !== "usar" || usableOk;
            const focused = i === this.detailFocus;
            a.g.clear();
            a.g.fillStyle(C.outline, 1); a.g.fillRect(a.x - 1, a.y - 1, a.w + 2, 50);
            a.g.fillStyle(focused ? C.panelDark : C.recess, 1); a.g.fillRect(a.x, a.y, a.w, 48);
            a.g.lineStyle(2, focused ? C.light : C.outline, focused ? 1 : 0.8);
            a.g.strokeRect(a.x, a.y, a.w, 48);
            a.label.setColor(enabled ? a.color : "#4a5570").setAlpha(enabled ? 1 : 0.7);
        });
    }

    closeDetail() {
        this.detail?.destroy(true);
        this.detail = null;
        this.detActions = null;
        this.detFlash = null;
        this.detailItem = null;
        this.mode = "grid";
    }

    confirmDetail(id) {
        if (this.mode !== "detail") return;   // ignora enquanto a janela conclui (busy)
        if (id === "voltar") { this.closeDetail(); return; }
        if (id === "usar") { this.use(); return; }
        if (id === "descartar") { this.discard(); return; }
    }

    itemUsable(item) {
        if (!item || !this.config.useItem) return false;
        return this.config.battle ? item.usableInBattle === true : item.usableInRoom === true;
    }

    use() {
        const item = this.detailItem;
        if (!item) return;
        if (!this.itemUsable(item)) {
            this.detFlash?.setText(this.config.battle ? "não dá para usar em batalha" : "não dá para usar agora").setColor(C.discard);
            return;
        }
        const result = this.config.useItem(item) ?? { ok: false, message: "sem efeito" };
        if (!result.ok) { this.detFlash?.setText(result.message ?? "não deu").setColor(C.discard); return; }
        if (item.consumable) {
            removeItem(item.id, 1);
            this.items = ownedItems().filter((it) => it.category !== "upgrade");
            this.refreshGrid();
        }
        this.detFlash?.setText(result.message ?? "usado").setColor(C.use);
        // Trava a janela e conclui: na batalha, usar PASSA O TURNO (fecha o
        // inventário inteiro); explorando, volta para a grade.
        this.mode = "busy";
        this.time.delayedCall(650, () => {
            if (this.config.battle) { this.close(); return; }
            this.closeDetail();
            this.refreshAfterChange();
        });
    }

    discard() {
        const item = this.detailItem;
        if (!item) return;
        removeItem(item.id, 1);
        this.items = ownedItems().filter((it) => it.category !== "upgrade");
        this.refreshGrid();
        this.detFlash?.setText("descartado").setColor(C.discard);
        this.mode = "busy";
        this.time.delayedCall(500, () => {
            this.closeDetail();
            this.refreshAfterChange();
        });
    }

    // --- Aba MELHORIAS: upgrades permanentes (itens de categoria upgrade) ---
    buildMelhoriasView() {
        const upgrades = ownedItems().filter((it) => it.category === "upgrade");
        const x = GRID.x;
        const w = PANEL.x + PANEL.w - 20 - x;

        const title = this.add.text(x, GRID.y - 4, "MELHORIAS PERMANENTES DA ARTEMIS", {
            fontFamily: "VCR", fontSize: "16px", color: C.dim
        });
        this.content.add(title);

        if (upgrades.length === 0) {
            const empty = this.add.text(x, GRID.y + 40, "Nenhuma melhoria ainda.\nItens específicos de fim de fase liberam melhorias fixas\n(condicionais, loops, funções...).", {
                fontFamily: "VCR", fontSize: "18px", color: C.text, lineSpacing: 8
            });
            this.content.add(empty);
        } else {
            upgrades.forEach((up, i) => {
                const cy = GRID.y + 34 + i * 88;
                const g = this.add.graphics();
                g.fillStyle(C.recess, 1); g.fillRect(x, cy, w, 78);
                g.lineStyle(1, C.outline, 1); g.strokeRect(x, cy, w, 78);
                const icon = this.add.image(x + 42, cy + 39, this.iconKey(up)).setDisplaySize(64, 64);
                const nm = this.add.text(x + 80, cy + 12, up.name, { fontFamily: "VCR", fontSize: "20px", color: "#ffcf6b" });
                const ds = this.add.text(x + 80, cy + 40, up.description, { fontFamily: "VCR", fontSize: "15px", color: C.text, wordWrap: { width: w - 96 } });
                this.content.add([g, icon, nm, ds]);
            });
        }

        const hint2 = this.add.text(WIDTH / 2, PANEL.y + PANEL.h - 26, "[Q] trocar aba    [ESC] fechar", {
            fontFamily: "VCR", fontSize: "17px", color: "#9db3c9"
        }).setOrigin(0.5);
        this.content.add(hint2);
    }

    // --- Entrada ---
    handleKey(event) {
        if (this.mode === "detail") { this.handleDetailKey(event); return; }
        if (this.mode === "busy") return;   // janela concluindo uma ação
        if (event.code === "KeyQ" || event.code === "Tab") {
            event.preventDefault?.();
            this.showTab(this.tab === "inventario" ? "melhorias" : "inventario");
            return;
        }
        if (event.code === "Escape" || event.code === "KeyI") { this.close(); return; }
        if (this.tab !== "inventario") return;
        switch (event.code) {
            case "ArrowLeft": case "KeyA": this.select(this.index - 1); return;
            case "ArrowRight": case "KeyD": this.select(this.index + 1); return;
            case "ArrowUp": case "KeyW": this.select(this.index - COLS); return;
            case "ArrowDown": case "KeyS": this.select(this.index + COLS); return;
            case "Enter": case "KeyE": this.openDetail();
        }
    }

    // Dentro da janela de detalhe: navega entre os botões e confirma; ESC volta
    // para a grade (não fecha o inventário).
    handleDetailKey(event) {
        const n = this.detActions.length;
        switch (event.code) {
            case "Escape": this.closeDetail(); return;
            case "ArrowLeft": case "KeyA": case "ArrowUp": case "KeyW":
                this.detailFocus = (this.detailFocus + n - 1) % n; this.paintDetail(); return;
            case "ArrowRight": case "KeyD": case "ArrowDown": case "KeyS":
                this.detailFocus = (this.detailFocus + 1) % n; this.paintDetail(); return;
            case "Enter": case "KeyE": this.confirmDetail(this.detActions[this.detailFocus].id);
        }
    }

    close() {
        Sfx.play(this, "menuOut");   // inventário fechou (som toca no manager global)
        if (this.keyHandler) {
            this.input.keyboard.off("keydown", this.keyHandler);
            this.keyHandler = null;
        }
        const target = this.config.returnScene;
        this.scene.stop();
        if (target) {
            this.scene.get(target)?.input?.keyboard?.resetKeys?.();
            this.scene.resume(target, { inventoryClosed: true });
        }
    }
}
