import telaUrl from "../assets/sprites/computador/tela.png";

// Tela do ponto de salvamento (overlay), aberta pelo computador da sala —
// estilo máquina de escrever do Resident Evil: o jogador acha a estação e
// decide se grava o progresso.
//
// A moldura é o monitor do pack (240x192, área interna de 176x142 medida em
// pixel); todo o texto é desenhado por cima com a fonte VCR, como nos outros
// consoles. Navegação por teclado (A/D ou setas + E/Enter) ou mouse.
//
// O SALVAMENTO EM SI ainda não existe: passe `options.onSave` para conectar
// quando houver. A callback pode devolver { text, color } para a resposta na
// tela; sem ela, o console avisa que o sistema não está conectado.

const WIDTH = 1280;
const HEIGHT = 720;

// Moldura do monitor: 240x192 com a tela preta em (32,25)-(207,166).
const SCREEN_SCALE = 3;
const SCREEN_W = 240 * SCREEN_SCALE;
const SCREEN_H = 192 * SCREEN_SCALE;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

const COLOR = {
    backdrop: 0x000000,
    accent: "#4ad6ff",
    text: "#e7e9f2",
    dim: "#5b6178",
    success: "#51e36b",
    warn: "#ffb347",
    selected: "#ffffff"
};

const CARET_MS = 450;

export default class SaveConsole {
    static preload(scene) {
        if (!scene.textures.exists("computador-tela")) {
            scene.load.image("computador-tela", telaUrl);
        }
    }

    constructor(scene, options = {}) {
        this.scene = scene;
        this.onSave = options.onSave ?? null;
        this.onClose = options.onClose ?? null;

        this.isOpen = false;
        this.index = 1;          // começa em NÃO (evita salvar sem querer).
        this.answered = false;
        this.caretVisible = true;
    }

    open() {
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        this.index = 1;
        this.answered = false;
        this.build();

        // Entrada só no próximo tique: senão a própria tecla [E] que abriu a
        // tela já confirmaria a opção selecionada.
        this.scene.time.delayedCall(0, () => {
            if (!this.isOpen) {
                return;
            }
            this.keyHandler = (event) => this.handleKey(event);
            this.scene.input.keyboard.on("keydown", this.keyHandler);
            this.caretTimer = this.scene.time.addEvent({
                delay: CARET_MS,
                loop: true,
                callback: () => {
                    this.caretVisible = !this.caretVisible;
                    this.renderCaret();
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

    // --- Montagem ---
    build() {
        const scene = this.scene;
        this.container = scene.add.container(0, 0).setDepth(1000);

        const backdrop = scene.add.rectangle(CENTER_X, CENTER_Y, WIDTH, HEIGHT, COLOR.backdrop, 0.78);
        const screen = scene.add.image(CENTER_X, CENTER_Y, "computador-tela")
            .setDisplaySize(SCREEN_W, SCREEN_H);

        const title = scene.add.text(CENTER_X, CENTER_Y - 160, "SISTEMA DE ARQUIVO // ELYSIUM", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: COLOR.accent
        }).setOrigin(0.5);

        this.question = scene.add.text(CENTER_X, CENTER_Y - 80, "> SALVAR PROGRESSO?", {
            fontFamily: "VCR",
            fontSize: "26px",
            color: COLOR.text
        }).setOrigin(0.5);

        this.caret = scene.add.text(
            this.question.x + this.question.width / 2 + 8,
            this.question.y,
            "_",
            { fontFamily: "VCR", fontSize: "26px", color: COLOR.accent }
        ).setOrigin(0, 0.5);

        this.output = scene.add.text(CENTER_X, CENTER_Y + 110, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: COLOR.dim,
            align: "center",
            wordWrap: { width: 480 }
        }).setOrigin(0.5);

        const hint = scene.add.text(CENTER_X, CENTER_Y + 170, "[A]/[D] escolher   [E] confirmar   [ESC] sair", {
            fontFamily: "VCR",
            fontSize: "14px",
            color: COLOR.dim
        }).setOrigin(0.5);

        this.container.add([backdrop, screen, title, this.question, this.caret, this.output, hint]);
        this.buildOptions();
    }

    buildOptions() {
        const scene = this.scene;
        const specs = [
            { label: "SIM", x: CENTER_X - 100, onSelect: () => this.confirmSave() },
            { label: "NÃO", x: CENTER_X + 100, onSelect: () => this.close() }
        ];

        this.options = specs.map((spec, index) => {
            const box = scene.add.graphics();
            const label = scene.add.text(spec.x, CENTER_Y + 20, spec.label, {
                fontFamily: "VCR",
                fontSize: "26px",
                color: COLOR.dim
            }).setOrigin(0.5);
            const hit = scene.add.rectangle(spec.x, CENTER_Y + 20, 150, 52, 0xffffff, 0.001)
                .setInteractive({ useHandCursor: true });

            hit.on("pointerover", () => {
                if (this.answered) {
                    return;
                }
                this.index = index;
                this.paintOptions();
            });
            hit.on("pointerdown", () => {
                if (!this.answered) {
                    spec.onSelect();
                }
            });

            this.container.add([box, label, hit]);
            return { ...spec, box, label };
        });

        this.paintOptions();
    }

    paintOptions() {
        this.options.forEach((option, index) => {
            const selected = index === this.index;
            option.box.clear();
            option.box.fillStyle(0x4ad6ff, selected ? 0.16 : 0.04);
            option.box.fillRect(option.x - 75, CENTER_Y - 6, 150, 52);
            option.box.lineStyle(selected ? 3 : 2, 0x4ad6ff, selected ? 1 : 0.4);
            option.box.strokeRect(option.x - 75, CENTER_Y - 6, 150, 52);
            option.label.setColor(selected ? COLOR.selected : COLOR.dim);
        });
    }

    renderCaret() {
        this.caret?.setVisible(this.caretVisible && !this.answered);
    }

    // --- Entrada ---
    handleKey(event) {
        if (!this.isOpen) {
            return;
        }

        if (event.key === "Escape") {
            this.close();
            return;
        }

        if (this.answered) {
            return;
        }

        switch (event.code) {
            case "KeyA":
            case "ArrowLeft":
                this.index = 0;
                this.paintOptions();
                return;
            case "KeyD":
            case "ArrowRight":
                this.index = 1;
                this.paintOptions();
                return;
            case "KeyE":
            case "Enter":
                this.options[this.index]?.onSelect();
        }
    }

    confirmSave() {
        this.answered = true;
        this.renderCaret();
        this.options.forEach((option) => option.label.setColor(COLOR.dim));

        // Sem `onSave` conectado o console não finge que salvou: avisa que o
        // sistema de arquivo ainda não existe (ver comentário do topo).
        const result = this.onSave
            ? this.onSave()
            : { text: "> nó de arquivo ainda não conectado", color: COLOR.warn };

        // Gravar passa pela rede: enquanto a promessa não volta, a tela mostra
        // que está gravando em vez de anunciar sucesso antes da hora.
        if (typeof result?.then === "function") {
            this.output.setText("> gravando...").setColor(COLOR.dim);
            result
                .then((value) => this.finishSave(value))
                .catch((error) => this.finishSave({
                    text: `> falha ao gravar: ${error.message}`,
                    color: COLOR.warn
                }));
            return;
        }

        this.finishSave(result);
    }

    finishSave(result) {
        // O jogador pode ter fechado com ESC enquanto a gravação corria.
        if (!this.isOpen) {
            return;
        }

        this.output.setText(result?.text ?? "> progresso salvo").setColor(result?.color ?? COLOR.success);
        this.scene.time.delayedCall(1600, () => this.close());
    }
}
