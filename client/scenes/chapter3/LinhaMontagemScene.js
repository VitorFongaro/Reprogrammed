import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import AssemblyLine from "../../objects/AssemblyLine";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Effects from "../../ui/Effects";
import { montagemPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import montagemBg from "../../assets/images/montagem/montagem_bg.png";

// Capítulo 3 (REPETIÇÕES), sala 1 — LINHA DE MONTAGEM, a entrada do último
// andar, o território da ADA.
//
// O primeiro laço do jogo, o mais literal que existe: uma prensa que repete a
// mesma batida. Cada MOLDE na esteira tem `vao` colunas e `faixas` fileiras; a
// prensa bate uma vez por coluna e põe uma placa por fileira, então o programa
// é `repita vao vezes : placas = placas + faixas`. Um número fixo de repetições
// não serve, porque os moldes têm tamanhos diferentes.
//
// Por que abre caminho: um FOSSO corta a sala de cima a baixo, e os moldes
// cheios na medida viram a ponte (objects/AssemblyLine.js). O jogador vê cada
// volta do laço como uma batida da prensa.
//
// Puzzle GERADO POR IA (montagem-prensa, data/aiSpecs.js): a IA escolhe quantos
// moldes e de que tamanho; o gerador local (montagemPuzzle) entra se ela não
// responder. A esteira e o fosso são fixos, então a Artemis pode andar enquanto
// a IA responde: só o terminal espera.
//
// Arte: fundo por tools/montagem_bg.py; terminal por tools/montagem_props.lua
// (Aseprite); prensa, moldes e ponte desenhados no código.

const PUZZLE_ID = "montagem-prensa";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Esteira e fosso pintados no fundo (BELT/CHASM do montagem_bg.py, tela = mapa + 8).
const BELT = { x0: 240, x1: 848, y: 300 };   // vai até a borda do fosso
const CHASM = { x0: 860, x1: 980 };
const BRIDGE = { x: 860, y: 380, w: 120, h: 84 };
const PRESS = { x: 320, y: 300 };
const MOLD_X0 = 390;          // primeiro molde na esteira; os outros à direita
const MOLD_GAP = 26;          // espaço entre moldes (encolhe se a IA mandar moldes grandes)

const TERMINAL = { x: 150, y: 330, w: 64, h: 88 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Último andar. Tudo aqui é vermelho... é o andar dela. O da ADA." },
    { speaker: "COSMO", text: "Uma linha de montagem. A prensa enche os moldes com placas, e os moldes viram a ponte daquele fosso." },
    { speaker: "COSMO", text: "Só que a prensa está parada. Ela faz a MESMA batida de novo e de novo: é só dizer quantas vezes." }
];

const AI_SCRIPT = [
    { speaker: "ADA", text: "Moldes novos. Calculados para você.", color: "#ff4565" }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Cada molde na medida. Uma batida por coluna, repetida quantas vezes o molde pedia." },
    { speaker: "COSMO", text: "Isso é um LAÇO: escrever o passo uma vez e mandar repetir." }
];

const BRIDGE_SCRIPT = [
    { speaker: "COSMO", text: "Ponte montada. Vamos." }
];

export default class LinhaMontagemScene extends BaseRoomScene {
    constructor() {
        super("cap3-montagem", {
            // Até a próxima sala do capítulo existir, a porta leva à sala de teste da ADA.
            nextScene: "cap3-sala-ada",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: montagemBg,
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
        this.line = null;
        this.waitingText = null;

        // Esteira e fosso são sólidos; o pedaço do fosso onde nasce a ponte é
        // um colisor à parte, que some quando ela fica pronta.
        this.addColliders([
            { x: BELT.x0, y: BELT.y - 24, w: BELT.x1 - BELT.x0, h: 48 },
            { x: CHASM.x0, y: 140, w: CHASM.x1 - CHASM.x0, h: BRIDGE.y - 140 },
            { x: CHASM.x0, y: BRIDGE.y + BRIDGE.h, w: CHASM.x1 - CHASM.x0, h: 666 - BRIDGE.y - BRIDGE.h }
        ]);
        [this.gapCollider] = this.addColliders([{ x: CHASM.x0, y: BRIDGE.y, w: CHASM.x1 - CHASM.x0, h: BRIDGE.h }]);

        if (isSolved(PUZZLE_ID)) {
            this.buildLine(montagemPuzzle(), { restored: true });
            return;
        }

        let puzzle = null;
        let dialogueDone = false;
        let left = false;
        this.events.once("shutdown", () => { left = true; });
        const ready = () => {
            if (!puzzle || !dialogueDone || this.line) return;
            this.hideWaiting();
            this.buildLine(puzzle);
            if (!this.retrying && puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };

        const request = this.retrying && this.lastPuzzle
            ? Promise.resolve(this.lastPuzzle)
            : requestAiPuzzle(PUZZLE_ID, montagemPuzzle);
        request.then((result) => {
            if (left) return;
            puzzle = result;
            this.lastPuzzle = result;
            ready();
        });

        const start = () => this.playEntryDialogue(ENTRY_SCRIPT, () => {
            dialogueDone = true;
            if (!puzzle) this.showWaiting();
            ready();
        });
        if (this.retrying) start();
        else this.showChapterCard("3", "NÚCLEO", start);
    }

    // Aviso enquanto a IA não responde. A sala é fixa, então a Artemis anda.
    showWaiting() {
        this.waitingText = this.add.text(this.scale.width / 2, 196, "ADA RECALCULANDO OS MOLDES...", {
            fontFamily: "VCR", fontSize: "18px", color: "#ff4565",
            backgroundColor: "#05060a", padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setDepth(900);
        this.tweens.add({ targets: this.waitingText, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
    }

    hideWaiting() {
        this.waitingText?.destroy();
        this.waitingText = null;
    }

    buildLine(puzzle, { restored = false } = {}) {
        // Moldes lado a lado na esteira, à direita da prensa; com moldes
        // grandes o espaço entre eles encolhe para caber até o fim da esteira.
        const widths = puzzle.tests.map((t) => AssemblyLine.moldWidth(t.given.vao));
        const room = BELT.x1 - 10 - MOLD_X0 - widths.reduce((a, b) => a + b, 0);
        const gap = Math.min(MOLD_GAP, room / Math.max(1, widths.length - 1));
        let x = MOLD_X0;
        const slots = widths.map((w) => {
            const slot = x + w / 2;
            x += w + gap;
            return slot;
        });
        this.line = new AssemblyLine(this, { press: PRESS, slots, beltY: BELT.y, tests: puzzle.tests, field: "placas" });
        if (!restored) this.cameras.main.flash(260, 255, 42, 74, false);

        // Terminal com arte própria (painel_prensa, tools/montagem_props.lua).
        const bottom = TERMINAL.y + TERMINAL.h / 2;
        this.add.image(TERMINAL.x, bottom, "prop-painel_prensa").setOrigin(0.5, 1).setDepth(bottom);
        this.addColliders([{ x: TERMINAL.x - 30, y: bottom - 26, w: 60, h: 24 }]);
        new PuzzleDevice(this, {
            id: PUZZLE_ID,
            ...TERMINAL,
            drawBody: false,
            label: "PRENSA",
            puzzle,
            onRun: (results, done) => this.line.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.line.buildBridge(BRIDGE, () => {
                    this.gapCollider.body.enable = false;
                    this.playDialogue(BRIDGE_SCRIPT, () => this.unlockDoor());
                });
            }),
            onRestore: () => {
                this.line.showSolved(BRIDGE);
                this.gapCollider.body.enable = false;
                this.unlockDoor();
            }
        });
    }
}
