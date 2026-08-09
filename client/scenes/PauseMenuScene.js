import Phaser from "phaser";

// Menu de PAUSA (tecla ESC nas salas): overlay lançado por cima da sala, que
// fica congelada por baixo (a BaseRoomScene chama scene.pause ao abrir).
// Opções: CONTINUAR, CONFIGURAÇÕES e SAIR — navegáveis pelo teclado (W/S ou
// setas + ENTER) ou pelo mouse. SAIR pede confirmação, porque o jogo não salva
// progresso e voltar ao início perde a sessão inteira.
//
// Quem decide QUANDO a pausa pode abrir é a sala (ver canPause na
// BaseRoomScene): só com a Artemis andando — nunca em combate, com um console
// de puzzle aberto, em diálogo ou durante a transição de sala.

const WIDTH = 1280;
const HEIGHT = 720;

const PANEL_W = 470;
const TITLE_H = 46;

const BUTTON_W = 330;
const BUTTON_H = 54;
const BUTTON_GAP = 14;

const COLOR = {
    backdrop: 0x000000,
    panel: 0x05060a,
    border: 0x4ad6ff,
    danger: 0xff4545,
    text: "#e7e9f2",
    dim: "#5b6178",
    selected: "#ffffff",
    selectedDanger: "#ff8f8f"
};

export default class PauseMenuScene extends Phaser.Scene {
    constructor() {
        super("pause-menu");
    }

    init(data) {
        // A sala que ficou pausada por baixo (para retomar no CONTINUAR).
        this.roomKey = data?.roomScene ?? null;
        this.view = "menu";
        this.index = 0;
        this.options = [];
    }

    create() {
        // As salas ficam depois desta cena na lista do main.js; sem isto o mapa
        // congelado renderizaria por cima do menu.
        this.scene.bringToTop();

        this.drawBackdrop();
        this.content = this.add.container(0, 0);
        this.showMenu();

        // Teclado só no próximo tique: senão o mesmo ESC que abriu a pausa já
        // dispararia o CONTINUAR aqui (mesmo cuidado dos consoles de puzzle).
        this.time.delayedCall(0, () => {
            this.input.keyboard.on("keydown", (event) => this.handleKey(event));
        });
    }

    drawBackdrop() {
        this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, COLOR.backdrop, 0.72);

        // Scanlines sobre a cena congelada (mesma estética dos consoles).
        const scan = this.add.graphics();
        scan.lineStyle(1, 0x000000, 0.3);
        for (let y = 0; y < HEIGHT; y += 4) {
            scan.lineBetween(0, y, WIDTH, y);
        }
    }

    // --- Telas ---
    showMenu() {
        this.view = "menu";
        this.content.removeAll(true);

        const height = 322;
        const top = this.drawPanel(height);

        this.addTitle(top, "- PAUSA -");
        this.buildOptions(top + 108, [
            { label: "CONTINUAR", onSelect: () => this.resumeGame() },
            { label: "CONFIGURAÇÕES", onSelect: () => this.openSettings() },
            { label: "SAIR", danger: true, onSelect: () => this.showExitConfirm() }
        ]);
        this.addHint(top + height - 24, "[W]/[S] navegar    [ENTER] confirmar    [ESC] continuar");
    }

    showExitConfirm() {
        this.view = "confirm";
        this.content.removeAll(true);

        const height = 322;
        const top = this.drawPanel(height);

        this.addTitle(top, "- SAIR DO JOGO? -");

        this.addCenteredText(top + 84, "O jogo não salva progresso.", "18px", COLOR.text);
        this.addCenteredText(top + 112, "Você vai perder tudo desta sessão.", "18px", "#ff8f8f");

        this.buildOptions(top + 176, [
            { label: "VOLTAR", onSelect: () => this.showMenu() },
            { label: "SAIR MESMO ASSIM", danger: true, onSelect: () => this.exitGame() }
        ]);
        this.addHint(top + height - 24, "[ESC] voltar");
    }

    // --- Blocos de UI ---
    drawPanel(height) {
        const x = (WIDTH - PANEL_W) / 2;
        const y = (HEIGHT - height) / 2;

        const panel = this.add.graphics();
        panel.fillStyle(COLOR.panel, 0.98);
        panel.fillRect(x, y, PANEL_W, height);
        panel.lineStyle(2, COLOR.border, 0.85);
        panel.strokeRect(x, y, PANEL_W, height);
        // Barra de título.
        panel.fillStyle(COLOR.border, 0.12);
        panel.fillRect(x, y, PANEL_W, TITLE_H);
        panel.lineBetween(x, y + TITLE_H, x + PANEL_W, y + TITLE_H);

        this.content.add(panel);
        return y;
    }

    addTitle(panelTop, text) {
        this.content.add(this.add.text(WIDTH / 2, panelTop + TITLE_H / 2, text, {
            fontFamily: "VCR",
            fontSize: "26px",
            color: COLOR.text
        }).setOrigin(0.5));
    }

    addCenteredText(y, text, fontSize, color) {
        this.content.add(this.add.text(WIDTH / 2, y, text, {
            fontFamily: "VCR",
            fontSize,
            color
        }).setOrigin(0.5));
    }

    addHint(y, text) {
        this.addCenteredText(y, text, "14px", COLOR.dim);
    }

    buildOptions(startY, options) {
        this.index = 0;

        this.options = options.map((option, index) => {
            const y = startY + index * (BUTTON_H + BUTTON_GAP);

            const box = this.add.graphics();
            const label = this.add.text(WIDTH / 2, y, option.label, {
                fontFamily: "VCR",
                fontSize: "22px",
                color: COLOR.dim
            }).setOrigin(0.5);
            const hit = this.add.rectangle(WIDTH / 2, y, BUTTON_W, BUTTON_H, 0xffffff, 0.001)
                .setInteractive({ useHandCursor: true });

            hit.on("pointerover", () => {
                this.index = index;
                this.paintOptions();
            });
            hit.on("pointerdown", () => this.confirm(index));

            this.content.add([box, label, hit]);
            return { ...option, box, label, y };
        });

        this.paintOptions();
    }

    paintOptions() {
        const left = (WIDTH - BUTTON_W) / 2;

        this.options.forEach((option, index) => {
            const selected = index === this.index;
            const accent = option.danger ? COLOR.danger : COLOR.border;
            const top = option.y - BUTTON_H / 2;

            option.box.clear();
            option.box.fillStyle(accent, selected ? 0.16 : 0.05);
            option.box.fillRect(left, top, BUTTON_W, BUTTON_H);
            option.box.lineStyle(selected ? 3 : 2, accent, selected ? 1 : 0.5);
            option.box.strokeRect(left, top, BUTTON_W, BUTTON_H);

            if (selected) {
                option.label.setColor(option.danger ? COLOR.selectedDanger : COLOR.selected);
            } else {
                option.label.setColor(COLOR.dim);
            }
        });
    }

    // --- Entrada ---
    handleKey(event) {
        switch (event.code) {
            case "KeyW":
            case "ArrowUp":
                this.move(-1);
                return;
            case "KeyS":
            case "ArrowDown":
                this.move(1);
                return;
            case "Enter":
            case "Space":
            case "KeyE":
                this.confirm(this.index);
                return;
            case "Escape":
                if (this.view === "confirm") {
                    this.showMenu();
                } else {
                    this.resumeGame();
                }
        }
    }

    move(direction) {
        this.index = Phaser.Math.Wrap(this.index + direction, 0, this.options.length);
        this.paintOptions();
    }

    confirm(index) {
        this.options[index]?.onSelect();
    }

    // --- Ações ---
    resumeGame() {
        if (!this.roomKey) {
            this.scene.stop();
            return;
        }

        // Uma tecla solta enquanto a sala estava pausada continuaria marcada
        // como pressionada (o plugin de teclado não roda em cena pausada) e a
        // Artemis sairia andando sozinha ao voltar.
        this.scene.get(this.roomKey)?.input?.keyboard?.resetKeys?.();

        this.scene.stop();
        this.scene.resume(this.roomKey);
    }

    openSettings() {
        // A sala continua pausada por baixo; este menu dorme e a tela de opções
        // volta para cá pelo VOLTAR (ver goBack na OptionsScene).
        this.scene.launch("options-scene", { returnTo: this.scene.key });
        this.scene.sleep();
    }

    exitGame() {
        // Mesma saída do menu principal: volta para a página inicial do site.
        window.location.href = "../index.html";
    }
}
