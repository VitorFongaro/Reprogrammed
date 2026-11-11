import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import BackupStations from "../../objects/BackupStations";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Effects from "../../ui/Effects";
import Sfx from "../../ui/Sfx";
import { datacenterPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import datacenterBg from "../../assets/images/datacenter/datacenter_bg.png";

// Capítulo 3 (REPETIÇÕES), sala 3 — DATA CENTER.
//
// O CONTADOR com um `se` DENTRO do laço. A ADA vai apagar o arquivo de memórias
// das pessoas ligadas aos chips; cada ESTAÇÃO DE BACKUP tem um drive com espaço
// livre e uma fila de arquivos iguais. O programa passa por cada arquivo e só
// copia (e conta) se ainda cabe:
//
//   repita arquivos vezes :
//       se espaco >= tamanho :
//           espaco = espaco - tamanho
//           salvos = salvos + 1
//
// Sem o `se`, o drive estoura; com `>` no lugar de `>=`, sobra um que cabia.
//
// Por que abre caminho: a sala está em QUARENTENA — a blindagem da porta de
// saída só sobe com o backup completo (desenhada aqui, por cima da porta do fundo).
//
// Puzzle GERADO POR IA (datacenter-backup, data/aiSpecs.js), com o gerador local
// (datacenterPuzzle) de reserva. As bancadas ficam em linhas fixas e nascem
// OFFLINE, então a Artemis anda enquanto a IA responde: só o terminal espera.
//
// Arte: fundo por tools/datacenter_bg.py; estações e blindagem desenhadas no
// código; o terminal reusa o painel da prensa (tools/montagem_props.lua).

const PUZZLE_ID = "datacenter-backup";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Bancadas de backup (centro de cada uma) e o bloco que elas ocupam no chão.
const ROWS = [250, 330, 410, 490].map((y) => ({ x: 600, y }));
const DESK_BLOCK = { x: 320, y: 228, w: 560, h: 284 };
const SHUTTER = { x: 1100, y: 18, w: 104, h: 116 };   // cobre a porta pintada no fundo

const TERMINAL = { x: 200, y: 400, w: 64, h: 88 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Um data center. Esses armários guardam... memórias. De gente." },
    { speaker: "COSMO", text: "As pessoas ligadas aos chips. A ADA guarda tudo aqui, e pelo visto vai apagar." },
    { speaker: "SISTEMA", text: "> quarentena ativa: porta selada até o fim do backup" },
    { speaker: "COSMO", text: "Dá para copiar os arquivos para aqueles drives. Um por um... mas só o que couber em cada drive." },
    { speaker: "COSMO", text: "E contando quantos salvou. Repetir para cada arquivo, decidindo dentro da repetição." }
];

const AI_SCRIPT = [
    { speaker: "ADA", text: "Cada byte que você salvar, eu apago de novo. Mas continue contando.", color: "#ff4565" }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Tudo que cabia, salvo. Nem um a mais, nem um a menos." },
    { speaker: "COSMO", text: "O laço passou por cada arquivo, e o se dentro dele decidiu um por um. E o contador foi somando." }
];

const OPEN_SCRIPT = [
    { speaker: "SISTEMA", text: "> backup concluído: quarentena encerrada" }
];

export default class DataCenterScene extends BaseRoomScene {
    constructor() {
        super("cap3-datacenter", {
            // Até a próxima sala do capítulo existir, a porta leva à sala de teste da ADA.
            nextScene: "cap3-sala-ada",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: datacenterBg,
            combat: false,
            music: "cap3"
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        Effects.preload(this);
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        // A instância sobrevive ao restart: zera o que a montagem testa.
        this.waitingText = null;
        this.terminal = null;

        this.stations = new BackupStations(this, ROWS);
        this.addColliders([DESK_BLOCK]);
        this.drawShutter();

        if (isSolved(PUZZLE_ID)) {
            this.stations.activate(datacenterPuzzle().tests);
            this.stations.showSolved();
            this.shutter.setVisible(false);
            this.buildTerminal(null);
            return;
        }

        let puzzle = null;
        let dialogueDone = false;
        let left = false;
        this.events.once("shutdown", () => { left = true; });
        const ready = () => {
            if (!puzzle || !dialogueDone || this.terminal) return;
            this.hideWaiting();
            this.stations.activate(puzzle.tests);
            this.cameras.main.flash(260, 255, 42, 74, false);
            this.buildTerminal(puzzle);
            if (!this.retrying && puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };

        const request = this.retrying && this.lastPuzzle
            ? Promise.resolve(this.lastPuzzle)
            : requestAiPuzzle(PUZZLE_ID, datacenterPuzzle);
        request.then((result) => {
            if (left) return;
            puzzle = result;
            this.lastPuzzle = result;
            ready();
        });

        this.playEntryDialogue(ENTRY_SCRIPT, () => {
            dialogueDone = true;
            if (!puzzle) this.showWaiting();
            ready();
        });
    }

    // Blindagem de quarentena por cima da porta de saída: chapa com faixas de
    // perigo e uma luz vermelha. Sobe quando o backup termina.
    drawShutter() {
        const { x, y, w, h } = SHUTTER;
        this.shutter = this.add.container(x, y).setDepth(-3);
        const g = this.add.graphics();
        g.fillStyle(0x2a2d36, 1).fillRect(0, 0, w, h);
        for (let k = 0; k < h; k += 14) {
            g.fillStyle(0x1b1d24, 1).fillRect(0, k, w, 3);
        }
        // faixa de perigo na base
        g.fillStyle(0x14161c, 1).fillRect(0, h - 12, w, 12);
        g.fillStyle(0xc8243c, 1);
        for (let k = 0; k < w; k += 12) {
            g.fillRect(k, h - 12, 6, 12);
        }
        g.lineStyle(2, 0x0a0b10, 1).strokeRect(0, 0, w, h);
        this.shutterLight = this.add.circle(w / 2, 14, 5, 0xff2a4a);
        this.tweens.add({ targets: this.shutterLight, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
        this.shutter.add([g, this.shutterLight]);
    }

    openShutter(onDone) {
        this.shutterLight.setFillStyle(0x51e36b);
        Sfx.play(this, "confirm", 0.4);
        this.cameras.main.shake(300, 0.002);
        this.tweens.add({
            targets: this.shutter, scaleY: 0, duration: 1200, ease: "Sine.easeIn",
            onComplete: () => {
                this.shutter.setVisible(false);
                onDone?.();
            }
        });
    }

    showWaiting() {
        this.waitingText = this.add.text(this.scale.width / 2, 196, "ADA CRIPTOGRAFANDO OS ARQUIVOS...", {
            fontFamily: "VCR", fontSize: "18px", color: "#ff4565",
            backgroundColor: "#05060a", padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setDepth(900);
        this.tweens.add({ targets: this.waitingText, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
    }

    hideWaiting() {
        this.waitingText?.destroy();
        this.waitingText = null;
    }

    // Sem puzzle = save com a sala resolvida: o PuzzleDevice nasce resolvido e
    // chama o onRestore (o puzzle local só preenche o objeto).
    buildTerminal(puzzle) {
        const bottom = TERMINAL.y + TERMINAL.h / 2;
        this.add.image(TERMINAL.x, bottom, "prop-painel_prensa").setOrigin(0.5, 1).setDepth(bottom);
        this.addColliders([{ x: TERMINAL.x - 30, y: bottom - 26, w: 60, h: 24 }]);
        this.terminal = new PuzzleDevice(this, {
            id: PUZZLE_ID,
            ...TERMINAL,
            drawBody: false,
            label: "BACKUP",
            puzzle: puzzle ?? datacenterPuzzle(),
            onRun: (results, done) => this.stations.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.openShutter(() => this.playDialogue(OPEN_SCRIPT, () => this.unlockDoor()));
            }),
            onRestore: () => this.unlockDoor()
        });
    }
}
