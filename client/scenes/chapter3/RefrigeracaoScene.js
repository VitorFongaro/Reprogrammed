import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import Enemy from "../../characters/Enemy";
import CoolingRacks, { SteamDuct } from "../../objects/CoolingRacks";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Effects from "../../ui/Effects";
import { refrigeracaoPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import refrigeracaoBg from "../../assets/images/refrigeracao/refrigeracao_bg.png";

// Capítulo 3 (REPETIÇÕES), sala 2 — REFRIGERAÇÃO.
//
// O `enquanto`: repetir sem saber antes quantas vezes. Os RACKS de servidor da
// ADA estão fervendo; cada um tem a temperatura no visor e a potência do
// resfriador (`passo`). O programa é `enquanto temp > N : temp = temp - passo`:
// um rack bem quente precisa de várias voltas, um que já está frio não roda
// nenhuma, e quem passa do ponto congela o rack. Diferente do `repita` da sala
// anterior, aqui o número de voltas não está escrito em lugar nenhum: sai da
// condição.
//
// Por que abre caminho: o calor dos racks sai pela GRADE do piso, que corta a
// sala de cima a baixo cuspindo vapor (um colisor). Com todos os racks no ponto,
// o vapor para (objects/CoolingRacks.js, SteamDuct).
//
// Puzzle GERADO POR IA (refrigeracao-racks, data/aiSpecs.js), com o gerador
// local (refrigeracaoPuzzle) de reserva. Os racks ficam em posições fixas e já
// nascem desligados na entrada, então a Artemis anda enquanto a IA responde:
// só o terminal espera.
//
// Arte: fundo por tools/refrigeracao_bg.py; racks e vapor desenhados no código;
// o terminal reusa o painel da prensa (tools/montagem_props.lua).

const PUZZLE_ID = "refrigeracao-racks";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Grade do piso (DUCT do refrigeracao_bg.py, tela = mapa + 8 no y).
const DUCT = { x: 900, y: 140, w: 64, h: 526 };
// Racks encostados na parede, em frente às descidas do cano (PIPE_X + 40, a cada 120).
const RACK_SLOTS = [390, 510, 630, 750].map((x) => ({ x, y: 240 }));

const TERMINAL = { x: 200, y: 400, w: 64, h: 88 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Que calor... são os servidores dela." },
    { speaker: "COSMO", text: "E o calor sai todo por aquela grade no chão. Vapor desse jeito derrete androide." },
];

const AI_SCRIPT = [
    { speaker: "ADA", text: "Você sempre soube a hora de parar. Era o seu trabalho.", color: "#ff4565" }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Um rack precisou de várias voltas, outro de nenhuma. Esse laço não conta antes: ele pergunta a cada volta." },
];

export default class RefrigeracaoScene extends BaseRoomScene {
    constructor() {
        super("cap3-refrigeracao", {
            nextScene: "cap3-datacenter",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: refrigeracaoBg,
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

        // Racks fixos (colisores já na entrada) e a grade com o vapor.
        this.racks = new CoolingRacks(this, RACK_SLOTS);
        this.addColliders(RACK_SLOTS.map(({ x, y }) => ({ x: x - 32, y: y - 46, w: 64, h: 44 })));
        this.duct = new SteamDuct(this, DUCT);

        if (isSolved(PUZZLE_ID)) {
            this.racks.activate(refrigeracaoPuzzle().tests);
            this.racks.showSolved();
            this.duct.clear();
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
            this.racks.activate(puzzle.tests);
            this.cameras.main.flash(260, 255, 42, 74, false);
            this.buildTerminal(puzzle);
            if (!this.retrying && puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };
        const request = this.retrying && this.lastPuzzle
            ? Promise.resolve(this.lastPuzzle)
            : requestAiPuzzle(PUZZLE_ID, refrigeracaoPuzzle);
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

    // Aviso enquanto a IA não responde. Os racks já estão no lugar, então a Artemis anda.
    showWaiting() {
        this.waitingText = this.add.text(this.scale.width / 2, 300, "ADA AQUECENDO OS SERVIDORES...", {
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
            label: "RESFRIADOR",
            puzzle: puzzle ?? refrigeracaoPuzzle(),
            onRun: (results, done) => this.racks.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.duct.stop(() => {
                    this.player.setEnabled(true);
                    this.unlockDoor();
                });
            }),
            onRestore: () => this.unlockDoor()
        });
    }

    // Inimigos do capítulo 3. Um varredor entre os racks e a grade de vapor: atira enquanto enxerga a Artemis.
    // Nascem a cada entrada (o restart reaproveita a instância, mas recria a sala).
    spawnEnemies() {
        new Enemy(this, 640, 520, { type: "varredor" });
    }
}
