import { CHAPTERS } from "../data/chapters";

// SELEÇÃO DE CAPÍTULOS do menu (aberta pelo card CAPÍTULOS da GameScene).
//
// Um capítulo pode ser escolhido quando já foi CONCLUÍDO, e o capítulo logo
// depois do último concluído também (é onde o jogador chegou: depois de um
// ZERAR PROGRESSO, dá para voltar direto para ele). Os outros aparecem
// trancados, sem o nome.
//
// Escolher um capítulo SUBSTITUI o save (decisão de design: é um "novo jogo a
// partir daqui"), então, havendo save, a tela pede confirmação antes. Quem
// abre decide o que fazer com o capítulo em `onChoose(chapter)`.
//
// Teclado: W/S ou setas, E/Enter escolhe, ESC volta. Mouse: passar seleciona,
// clique escolhe.

const WIDTH = 1280;
const PANEL = { x: 640, y: 330, w: 760, h: 430 };
const ROW_H = 74;
const COLOR = {
    panel: 0x05060a,
    border: 0x4ad6ff,
    amber: "#ffb347",
    text: "#f7f7f7",
    dim: "#5b6178",
    done: "#51e36b",
    danger: "#ff4545"
};

export default class ChapterSelect {
    // `completed`: números dos capítulos concluídos. `hasSave`: pede confirmação.
    constructor(scene, { completed, hasSave, onChoose, onClose }) {
        this.scene = scene;
        this.hasSave = hasSave;
        this.onChoose = onChoose;
        this.onClose = onClose;
        const last = Math.max(0, ...completed);
        this.rows = CHAPTERS.map((chapter) => ({
            chapter,
            done: completed.includes(chapter.number),
            open: completed.includes(chapter.number) || chapter.number === last + 1
        }));
        this.index = Math.max(0, this.rows.findIndex((r) => r.open));
        this.confirming = false;
        this.build();
        this.keyHandler = (event) => this.handleKey(event);
        // Próximo tick: a tecla que abriu não pode já escolher.
        scene.time.delayedCall(0, () => scene.input.keyboard.on("keydown", this.keyHandler));
    }

    build() {
        const s = this.scene;
        this.container = s.add.container(0, 0).setDepth(1000);
        const shade = s.add.rectangle(WIDTH / 2, 360, WIDTH, 720, 0x050505, 0.86).setInteractive();
        const g = s.add.graphics();
        g.fillStyle(COLOR.panel, 0.96).fillRect(PANEL.x - PANEL.w / 2, PANEL.y - PANEL.h / 2, PANEL.w, PANEL.h);
        g.lineStyle(2, COLOR.border, 0.8).strokeRect(PANEL.x - PANEL.w / 2, PANEL.y - PANEL.h / 2, PANEL.w, PANEL.h);
        const title = s.add.text(PANEL.x, PANEL.y - PANEL.h / 2 + 34, "SELEÇÃO DE CAPÍTULOS", {
            fontFamily: "VCR", fontSize: "28px", color: COLOR.text
        }).setOrigin(0.5);
        this.container.add([shade, g, title]);

        const top = PANEL.y - PANEL.h / 2 + 96;
        this.rowViews = this.rows.map((row, i) => {
            const y = top + i * ROW_H;
            const box = s.add.graphics();
            const name = row.open
                ? `CAPÍTULO ${row.chapter.number} :: ${row.chapter.title}`
                : `CAPÍTULO ${row.chapter.number} :: ???`;
            const label = s.add.text(PANEL.x - PANEL.w / 2 + 44, y, name, {
                fontFamily: "VCR", fontSize: "24px", color: row.open ? COLOR.text : COLOR.dim
            }).setOrigin(0, 0.5);
            const topic = s.add.text(PANEL.x - PANEL.w / 2 + 44, y + 22, row.open ? row.chapter.topic : "", {
                fontFamily: "VCR", fontSize: "15px", color: COLOR.dim
            }).setOrigin(0, 0.5);
            const state = s.add.text(PANEL.x + PANEL.w / 2 - 44, y, row.done ? "CONCLUÍDO" : row.open ? "EM ANDAMENTO" : "BLOQUEADO", {
                fontFamily: "VCR", fontSize: "18px", color: row.done ? COLOR.done : row.open ? COLOR.amber : COLOR.dim
            }).setOrigin(1, 0.5);
            const hit = s.add.rectangle(PANEL.x, y + 8, PANEL.w - 40, ROW_H - 10, 0xffffff, 0.001);
            if (row.open) {
                hit.setInteractive({ useHandCursor: true });
                hit.on("pointerover", () => { if (!this.confirming) { this.index = i; this.render(); } });
                hit.on("pointerdown", () => { if (!this.confirming) { this.index = i; this.choose(); } });
            }
            this.container.add([box, label, topic, state, hit]);
            return { box, y };
        });

        this.footer = s.add.text(PANEL.x, PANEL.y + PANEL.h / 2 - 30, "", {
            fontFamily: "VCR", fontSize: "16px", color: COLOR.dim, align: "center"
        }).setOrigin(0.5);
        this.container.add(this.footer);
        this.render();
    }

    render() {
        this.rowViews.forEach((view, i) => {
            const selected = i === this.index && this.rows[i].open;
            view.box.clear();
            if (selected) {
                view.box.fillStyle(COLOR.border, 0.12).fillRect(PANEL.x - PANEL.w / 2 + 20, view.y - 26, PANEL.w - 40, ROW_H - 10);
                view.box.lineStyle(2, COLOR.border, 0.9).strokeRect(PANEL.x - PANEL.w / 2 + 20, view.y - 26, PANEL.w - 40, ROW_H - 10);
            }
        });
        if (this.confirming) {
            const chapter = this.rows[this.index].chapter;
            this.footer.setColor(COLOR.danger).setText(
                `COMEÇAR O CAPÍTULO ${chapter.number} SUBSTITUI O SEU SAVE ATUAL.\n[E] CONFIRMAR    [ESC] CANCELAR`);
        } else {
            this.footer.setColor(COLOR.dim).setText(
                "o capítulo começa do início, só com as melhorias já conquistadas\n[W]/[S] escolher    [E] começar    [ESC] voltar");
        }
    }

    handleKey(event) {
        if (event.code === "Escape") {
            if (this.confirming) {
                this.confirming = false;
                this.render();
            } else {
                this.close();
            }
            return;
        }
        if (event.code === "KeyE" || event.code === "Enter") {
            this.choose();
            return;
        }
        if (this.confirming) {
            return;
        }
        const step = event.code === "KeyW" || event.code === "ArrowUp" ? -1
            : event.code === "KeyS" || event.code === "ArrowDown" ? 1 : 0;
        if (!step) {
            return;
        }
        // Pula os trancados.
        let next = this.index;
        for (let k = 0; k < this.rows.length; k += 1) {
            next = (next + step + this.rows.length) % this.rows.length;
            if (this.rows[next].open) break;
        }
        this.index = next;
        this.render();
    }

    choose() {
        const row = this.rows[this.index];
        if (!row?.open) {
            return;
        }
        if (this.hasSave && !this.confirming) {
            this.confirming = true;
            this.render();
            return;
        }
        this.destroy();
        this.onChoose?.(row.chapter);
    }

    close() {
        this.destroy();
        this.onClose?.();
    }

    destroy() {
        this.scene.input.keyboard.off("keydown", this.keyHandler);
        this.container?.destroy();
        this.container = null;
    }
}
