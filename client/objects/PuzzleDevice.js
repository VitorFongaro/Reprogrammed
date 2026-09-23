import ProgrammingConsole from "../ui/ProgrammingConsole";
import { createConsole } from "../ui/ConditionalConsole";
import { isSolved, markSolved } from "../state/progress";

// Máquina interagível que abre o console de puzzle de variável. Desenha o corpo,
// a luz indicadora (vermelha = desligada, verde = ativa) e o prompt "[E] PROGRAMAR",
// e se registra como interagível na cena (BaseRoomScene).
// `config.blocks: true` usa o console de PROGRAMAÇÃO EM BLOCOS (arrastar e encaixar);
// caso contrário, usa o console de texto (digitar `nome = valor`). Puzzle com
// `lines` (condicional multilinha do cap. 2) abre o ConditionalConsole.
// `config.introScript` (roteiro de DialogueBox) toca UMA vez antes da primeira
// abertura do console — o Cosmo explicando a mecânica em vez do texto do painel.
// `config.id` é o slug do puzzle (o mesmo de `puzzles.slug` no banco): com ele a
// máquina nasce já resolvida quando o save carregado diz que ela foi resolvida.
// Nesse caso ela chama `config.onRestore` (e NÃO `onSolved`), para a sala
// reaplicar o efeito — porta destravada — sem repetir o diálogo.
// `config.onRun(results, done)` faz dela um puzzle de MUNDO (cap. 2): o console
// entrega o resultado de cada caso e a SALA anima isso no mapa; no fim ela
// chama `done(resolvido)`. Só então a máquina acende (ou não) — quem julga é o
// mapa. A Artemis fica parada assistindo do começo ao fim.

const DEFAULT_W = 84;
const DEFAULT_H = 132;
const DEFAULT_RADIUS = 130;
const OFF_COLOR = 0xff4545;
const ON_COLOR = 0x51e36b;

export default class PuzzleDevice {
    constructor(scene, config) {
        this.scene = scene;
        this.id = config.id ?? null;
        this.x = config.x;
        this.y = config.y;
        this.w = config.w ?? DEFAULT_W;
        this.h = config.h ?? DEFAULT_H;
        this.label = config.label ?? "";
        this.onSolved = config.onSolved;
        this.onRestore = config.onRestore ?? null;
        // drawBody: false para máquinas já desenhadas na arte do mapa (desenha só
        // luz indicadora e prompt). promptY: posição vertical customizada do prompt.
        // indicator: false quando o sprite da máquina já tem sinalização própria
        // e a luz do código ficaria sobrando por cima dele.
        this.drawBody = config.drawBody ?? true;
        this.showIndicator = config.indicator ?? true;
        this.promptY = config.promptY ?? null;
        this.introScript = config.introScript ?? null;
        this.introPlayed = false;
        this.solved = false;
        this.onRun = config.onRun ?? null;
        this.running = false;       // puzzle de mundo com a animação em curso

        this.draw();

        const options = {
            // O mesmo slug que identifica o puzzle no save identifica a
            // tentativa na telemetria.
            puzzleId: this.id,
            onSolved: () => this.handleSolved(),
            // Rodando no mapa, quem devolve a Artemis é o fim da animação.
            onClose: () => {
                if (!this.running) {
                    scene.player.setEnabled(true);
                }
            }
        };
        if (this.onRun) {
            options.onRun = (results) => this.runInWorld(results);
        }
        // Puzzle com `lines` (condicional, cap. 2) sempre é em blocos; o
        // createConsole escolhe entre o console de variável e o de condicional.
        this.console = config.blocks || config.puzzle?.lines
            ? createConsole(scene, config.puzzle, options)
            : new ProgrammingConsole(scene, config.puzzle, options);

        scene.registerInteractable({
            x: this.x,
            y: this.y,
            radius: config.radius ?? DEFAULT_RADIUS,
            promptObj: this.prompt,
            isAvailable: () => !this.solved && !this.running,
            onInteract: () => this.openConsole()
        });

        // Alvo do modo de reprogramação remota ([R]): mesma abertura de console,
        // sem precisar chegar perto da máquina.
        scene.registerReprogrammable?.({
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            label: config.label || config.puzzle?.title || "SISTEMA",
            isAvailable: () => !this.solved && !this.running,
            onReprogram: () => this.openConsole()
        });

        if (isSolved(this.id)) {
            this.restoreSolved();
        }
    }

    // Save carregado com este puzzle já resolvido: acende a luz e desliga a
    // interação, sem brilho de ativação nem diálogo. `onRestore` NÃO cai para
    // `onSolved` de propósito — o onSolved costuma ler outros objetos da sala
    // que ainda não existem quando este construtor roda.
    restoreSolved() {
        this.solved = true;
        this.introPlayed = true;
        this.drawIndicator(ON_COLOR);
        this.onRestore?.();
    }

    openConsole() {
        this.scene.player.setEnabled(false);
        if (this.introScript && !this.introPlayed) {
            this.introPlayed = true;
            this.scene.playDialogue(this.introScript, () => {
                this.scene.player.setEnabled(false);
                this.console.open();
            });
            return;
        }
        this.console.open();
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

        if (this.showIndicator) {
            this.indicator = this.scene.add.graphics().setDepth(790);
            this.drawIndicator(OFF_COLOR);
        }

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
        if (!this.indicator) {
            return;
        }
        const cx = this.x;
        const cy = this.y - this.h / 2 + 14;
        this.indicator.clear();
        this.indicator.fillStyle(color, 0.25);
        this.indicator.fillCircle(cx, cy, 11);
        this.indicator.fillStyle(color, 1);
        this.indicator.fillCircle(cx, cy, 6);
    }

    // Puzzle de mundo: o console fechou e entregou um resultado por caso. A sala
    // anima cada um no mapa e responde se o caminho abriu.
    runInWorld(results) {
        this.running = true;
        this.scene.player.setEnabled(false);
        this.onRun(results, (solved) => {
            this.running = false;
            // Libera ANTES do onSolved: se a sala abrir um diálogo ali, é ele
            // quem segura a Artemis até terminar de falar.
            this.scene.player.setEnabled(true);
            if (solved) {
                this.handleSolved();
            }
        });
    }

    handleSolved() {
        this.solved = true;
        markSolved(this.id);
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
