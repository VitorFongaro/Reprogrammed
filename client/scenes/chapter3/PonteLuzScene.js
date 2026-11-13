import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import LightBridge from "../../objects/LightBridge";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Effects from "../../ui/Effects";
import { ponteLuzPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import ponteBg from "../../assets/images/ponte/ponte_bg.png";

// Capítulo 3 (REPETIÇÕES), sala 4 — PONTE DE LUZ.
//
// O `para cada`: passar por TODOS os itens de uma lista, usando o item da vez.
// Um ABISMO corta a sala; a travessia é uma ponte de luz feita de FAIXAS, e cada
// faixa é uma lista com a energia de cada placa. O programa é
//
//   para cada placa em placas :
//       energia = energia + placa
//
// (energia começa em 0 pelos `defaults`). As iscas são as confusões clássicas:
// a lista inteira no lugar do item (placas), somar 1 (contar placas) e o "-".
//
// Por que abre caminho: com todas as faixas na medida, a ponte inteira firma e
// o pedaço do abismo onde ela está deixa de ser parede (objects/LightBridge.js).
//
// Puzzle GERADO POR IA (ponte-luz, data/aiSpecs.js), com o gerador local
// (ponteLuzPuzzle) de reserva. As faixas ficam em linhas fixas e nascem OFFLINE,
// então a Artemis anda enquanto a IA responde: só o terminal espera.
//
// Arte: fundo por tools/ponte_bg.py; ponte, emissores e pulsos desenhados no
// código; o terminal reusa o painel da prensa (tools/montagem_props.lua).

const PUZZLE_ID = "ponte-luz";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Abismo pintado no fundo (CHASM do ponte_bg.py) e as 4 faixas fixas da ponte.
const CHASM = { x0: 560, x1: 880 };
const ROWS = [300, 346, 392, 438];
const BRIDGE = { top: 282, bottom: 456 };

const TERMINAL = { x: 260, y: 420, w: 64, h: 88 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Um abismo. Do outro lado, a porta. E nenhum chão no meio." },
    { speaker: "COSMO", text: "Aquilo ali são emissores de uma ponte de luz. Cada faixa da ponte é uma fileira de placas." },
    { speaker: "COSMO", text: "Cada placa pede a sua energia. O gerador tem que mandar o total de cada faixa, placa por placa." },
    { speaker: "COSMO", text: "Não é repetir N vezes, nem enquanto alguma coisa... é passar por CADA placa da lista." }
];

const AI_SCRIPT = [
    { speaker: "ADA", text: "Uma ponte de luz. Acenda o caminho até mim, se souber contar o que vale cada passo.", color: "#ff4565" }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Cada placa recebeu a dela. O laço passou por todas, uma de cada vez." },
    { speaker: "COSMO", text: "Isso é o PARA CADA: você não diz quantas vezes, a lista diz. E dentro, você usa o item da vez." }
];

const CLEAR_SCRIPT = [
    { speaker: "COSMO", text: "A ponte firmou. Pode atravessar... sem olhar para baixo." }
];

export default class PonteLuzScene extends BaseRoomScene {
    constructor() {
        super("cap3-ponte", {
            nextScene: "cap3-antessala",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: ponteBg,
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

        this.bridge = new LightBridge(this, { x0: CHASM.x0, x1: CHASM.x1, rows: ROWS });
        // O abismo é parede; o pedaço da ponte é um colisor à parte, que some quando ela firma.
        const w = CHASM.x1 - CHASM.x0;
        this.addColliders([
            { x: CHASM.x0, y: 140, w, h: BRIDGE.top - 140 },
            { x: CHASM.x0, y: BRIDGE.bottom, w, h: 666 - BRIDGE.bottom }
        ]);
        [this.gapCollider] = this.addColliders([{ x: CHASM.x0, y: BRIDGE.top, w, h: BRIDGE.bottom - BRIDGE.top }]);

        if (isSolved(PUZZLE_ID)) {
            this.bridge.activate(ponteLuzPuzzle().tests);
            this.bridge.solidify(null, { instant: true });
            this.gapCollider.body.enable = false;
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
            this.bridge.activate(puzzle.tests);
            this.cameras.main.flash(260, 255, 42, 74, false);
            this.buildTerminal(puzzle);
            if (!this.retrying && puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };

        const request = this.retrying && this.lastPuzzle
            ? Promise.resolve(this.lastPuzzle)
            : requestAiPuzzle(PUZZLE_ID, ponteLuzPuzzle);
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

    showWaiting() {
        this.waitingText = this.add.text(this.scale.width / 2, 196, "ADA RECALIBRANDO A PONTE...", {
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
            label: "GERADOR",
            puzzle: puzzle ?? ponteLuzPuzzle(),
            onRun: (results, done) => this.bridge.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.bridge.solidify(() => {
                    this.gapCollider.body.enable = false;
                    this.playDialogue(CLEAR_SCRIPT, () => this.unlockDoor());
                });
            }),
            onRestore: () => this.unlockDoor()
        });
    }
}
