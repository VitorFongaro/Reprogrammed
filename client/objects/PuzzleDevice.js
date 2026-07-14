import ProgrammingConsole from "../ui/ProgrammingConsole";
import BlockProgrammingConsole from "../ui/BlockProgrammingConsole";

// Máquina interagível que abre o console de puzzle de variável. Desenha o corpo,
// a luz indicadora (vermelha = desligada, verde = ativa) e o prompt "[E] PROGRAMAR",
// e se registra como interagível na cena (BaseRoomScene).
// `config.blocks: true` usa o console de PROGRAMAÇÃO EM BLOCOS (arrastar e encaixar);
// caso contrário, usa o console de texto (digitar `nome = valor`).

const DEFAULT_W = 84;
const DEFAULT_H = 132;
const DEFAULT_RADIUS = 130;
const OFF_COLOR = 0xff4545;
const ON_COLOR = 0x51e36b;

export default class PuzzleDevice {
    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;
        this.w = config.w ?? DEFAULT_W;
        this.h = config.h ?? DEFAULT_H;
        this.label = config.label ?? "";
        this.onSolved = config.onSolved;
        // drawBody: false para máquinas já desenhadas na arte do mapa (desenha só
        // luz indicadora e prompt). promptY: posição vertical customizada do prompt.
        this.drawBody = config.drawBody ?? true;
        this.promptY = config.promptY ?? null;
        this.solved = false;

        this.draw();

        const ConsoleClass = config.blocks ? BlockProgrammingConsole : ProgrammingConsole;
        this.console = new ConsoleClass(scene, config.puzzle, {
            onSolved: () => this.handleSolved(),
            onClose: () => scene.player.setEnabled(true)
        });

        scene.registerInteractable({
            x: this.x,
            y: this.y,
            radius: config.radius ?? DEFAULT_RADIUS,
            promptObj: this.prompt,
            isAvailable: () => !this.solved,
            onInteract: () => {
                scene.player.setEnabled(false);
                this.console.open();
            }
        });
    }

    draw() {
        const left = this.x - this.w / 2;
        const top = this.y - this.h / 2;

        if (this.drawBody) {
            const body = this.scene.add.graphics();
            body.fillStyle(0x14161f, 1);
            body.fillRect(left, top, this.w, this.h);
            body.lineStyle(2, 0x3a3f55, 1);
            body.strokeRect(left, top, this.w, this.h);
            // Painéis/ranhuras.
            body.lineStyle(1, 0x2a2f45, 0.9);
            for (let py = top + 18; py < top + this.h - 16; py += 18) {
                body.lineBetween(left + 8, py, left + this.w - 8, py);
            }
            // Base.
            body.fillStyle(0x0c0d14, 1);
            body.fillRect(left - 8, top + this.h, this.w + 16, 10);
        }

        this.indicator = this.scene.add.graphics().setDepth(790);
        this.drawIndicator(OFF_COLOR);

        if (this.label) {
            this.scene.add.text(this.x, top - 16, this.label, {
                fontFamily: "VCR",
                fontSize: "16px",
                color: "#7a8099"
            }).setOrigin(0.5);
        }

        const promptY = this.promptY ?? top - 44;
        this.prompt = this.scene.add.text(this.x, promptY, "[E] PROGRAMAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.scene.tweens.add({
            targets: this.prompt,
            y: promptY - 6,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    drawIndicator(color) {
        const cx = this.x;
        const cy = this.y - this.h / 2 + 14;
        this.indicator.clear();
        this.indicator.fillStyle(color, 0.25);
        this.indicator.fillCircle(cx, cy, 11);
        this.indicator.fillStyle(color, 1);
        this.indicator.fillCircle(cx, cy, 6);
    }

    handleSolved() {
        this.solved = true;
        this.drawIndicator(ON_COLOR);

        // Brilho de ativação.
        const glow = this.scene.add.graphics();
        glow.fillStyle(ON_COLOR, 0.18);
        glow.fillRect(this.x - this.w, this.y - this.h, this.w * 2, this.h * 2);
        this.scene.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 0 },
            duration: 700,
            onComplete: () => glow.destroy()
        });

        this.onSolved?.();
    }
}
