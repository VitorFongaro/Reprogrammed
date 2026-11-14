import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import Enemy from "../../characters/Enemy";
import SealLocks from "../../objects/SealLocks";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Effects from "../../ui/Effects";
import { antessalaPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import antessalaBg from "../../assets/images/antessala/antessala_bg.png";

// Capítulo 3 (REPETIÇÕES), sala 5 — ANTESSALA, a última antes do núcleo da ADA.
//
// A CONDIÇÃO DE PARADA. A porta do núcleo está lacrada por TRAVAS, e a ADA
// escreveu o laço delas para nunca terminar. O jogador reescreve:
//
//   enquanto nivel < PONTO :
//       nivel = nivel + passo
//
// As iscas são os jeitos de um laço não parar: `!=` (o passo pula o ponto e a
// condição nunca fica falsa) e `-` (o nível desce para longe do ponto); `<=`
// dá um ciclo a mais. O laço infinito aparece NO MAPA, não no console
// (`worldErrors`): a trava fica girando até o alarme (objects/SealLocks.js).
//
// Por que abre caminho: com todas as travas abertas, o lacre da porta do núcleo
// se desfaz.
//
// Puzzle GERADO POR IA (antessala-selo, data/aiSpecs.js), com o gerador local
// (antessalaPuzzle) de reserva. As travas ficam em posições fixas (os colisores
// existem desde a entrada) e, enquanto a IA não responde, rodam o laço da ADA.
//
// Arte: fundo por tools/antessala_bg.py; travas e lacre desenhados no código; o
// terminal reusa o painel da prensa (tools/montagem_props.lua).

const PUZZLE_ID = "antessala-selo";

const DOOR = { x: 640, y: 98 };
const SPAWN = { x: 128, y: 200 };
const SEAL = { x: 640, y: 72 };

// Travas dos dois lados do caminho até a porta (base de cada coluna).
const LOCK_SLOTS = [430, 520, 760, 850].map((x) => ({ x, y: 300 }));

const TERMINAL = { x: 250, y: 420, w: 64, h: 88 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "É aqui. Atrás daquela porta fica o núcleo." },
    { speaker: "SISTEMA", text: "> selo do núcleo: rotina de travas em execução" },
    { speaker: "COSMO", text: "Olha as travas... sobem, estouram, recomeçam. Ela escreveu um laço que nunca termina." },
];

const AI_SCRIPT = [
    { speaker: "ADA", text: "Você revisava os meus laços, Artemis. Este eu escrevi sem você.", color: "#ff4565" }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Todas paradas no ponto. Um laço só termina se a condição puder ficar falsa." },
    { speaker: "COSMO", text: "...Às vezes eu acho que ela também é isso. Um laço que ninguém escreveu como parar." },
];

const OPEN_SCRIPT = [
    { speaker: "SISTEMA", text: "> selo do núcleo: rompido" }
];

export default class AntessalaScene extends BaseRoomScene {
    constructor() {
        super("cap3-antessala", {
            // Até o núcleo existir, a porta leva à sala de teste da ADA.
            nextScene: "cap3-sala-ada",
            doorLabel: "[E] NÚCLEO",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: antessalaBg,
            combat: true,
            music: "cap3"
        });
    }

    preload() {
        super.preload();
        Enemy.preload(this);
        BlockProgrammingConsole.preload(this);
        Effects.preload(this);
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        this.spawnEnemies();
        // A instância sobrevive ao restart: zera o que a montagem testa.
        this.waitingText = null;
        this.terminal = null;

        this.locks = new SealLocks(this, LOCK_SLOTS, SEAL);
        this.addColliders(LOCK_SLOTS.map(({ x, y }) => ({ x: x - 22, y: y - 132, w: 44, h: 130 })));

        if (isSolved(PUZZLE_ID)) {
            this.locks.activate(antessalaPuzzle().tests);
            this.locks.showSolved();
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
            this.locks.activate(puzzle.tests);
            this.cameras.main.flash(260, 255, 42, 74, false);
            this.buildTerminal(puzzle);
            if (!this.retrying && puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };

        const request = this.retrying && this.lastPuzzle
            ? Promise.resolve(this.lastPuzzle)
            : requestAiPuzzle(PUZZLE_ID, antessalaPuzzle);
        request.then((result) => {
            if (left) return;
            // O laço infinito vai para o mapa (vale também para o puzzle da IA).
            puzzle = { ...result, worldErrors: true };
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
        this.waitingText = this.add.text(this.scale.width / 2, 360, "ADA REESCREVENDO AS TRAVAS...", {
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
            label: "SELO",
            puzzle: puzzle ?? antessalaPuzzle(),
            onRun: (results, done) => this.locks.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.locks.breakSeal(() => this.playDialogue(OPEN_SCRIPT, () => this.unlockDoor()));
            }),
            onRestore: () => this.unlockDoor()
        });
    }

    // Inimigos do capítulo 3. A última sala antes do núcleo junta os dois: o carro e um semeador rondando as travas.
    // Nascem a cada entrada (o restart reaproveita a instância, mas recria a sala).
    spawnEnemies() {
        new Enemy(this, 1060, 580, { type: "car" });
        new Enemy(this, 420, 560, {
            type: "semeador",
            overrides: { route: [{ x: 420, y: 560 }, { x: 640, y: 620 }, { x: 860, y: 560 }, { x: 640, y: 470 }] }
        });
    }
}
