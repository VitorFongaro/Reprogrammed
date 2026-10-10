import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import GardenBeds from "../../objects/GardenBeds";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import { irrigacaoPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import jardimBg from "../../assets/images/jardim/jardim_bg.png";
import jardimMap from "../../assets/maps/jardim.json";

// Capítulo 2 (CONDICIONAIS), sala 2 — JARDIM DE INVERNO do térreo.
//
// A estufa de vidro com a neve lá fora. É o `se / senão` do capítulo: a
// irrigação rega todos os canteiros do mesmo jeito, e o jogador reescreve a
// regra para cada canteiro receber água só se precisar. As duas saídas têm de
// ser escritas — sem o `senão`, o canteiro fica sem ordem nenhuma.
//
// É o PRIMEIRO PUZZLE GERADO POR IA do jogo. Na chegada, a sala pede ao
// servidor (state/aiPuzzles.js -> POST /ai/puzzle) um puzzle feito para este
// jogador: o Gemini decide a regra, o limite de umidade, quantos canteiros há,
// que planta tem em cada um e as peças-isca, na dificuldade que o perfil de
// aprendizado dele pede. O servidor executa todas as montagens antes de aceitar.
// Os canteiros só são montados quando o puzzle chega — o diálogo de entrada
// cobre a espera. Se a IA não responder, entra o gerador local da mesma ficha
// (irrigacaoPuzzle) e o jogo segue igual.
//
// Puzzle de MUNDO: o console fecha e cada canteiro mostra o resultado (ver
// objects/GardenBeds.js). A porta abre com a irrigação certa e leva ao
// depósito (`cap2-deposito`).
//
// Arte: fundo por tools/jardim_bg.py; plantas, canteiro e móveis por
// tools/jardim_props.lua (Aseprite), no Tiled em assets/maps/jardim.json.

const PUZZLE_ID = "jardim-irrigacao";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Painel da irrigação (prop do Tiled, coordenadas de TELA = mapa + 8).
const PANEL = { x: 260, y: 264, w: 64, h: 88 };

// Fileira de canteiros encostada no vidro (tela).
const BEDS = { cx: 690, baseY: 236 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Uma estufa! Lá fora neva, e aqui dentro tem cacto. Só a Elysium mesmo." },
    { speaker: "COSMO", text: "A irrigação está rodando a mesma ordem para todo canteiro. Metade vai secar, a outra vai afogar." },
    { speaker: "COSMO", text: "O painel ali é o sistema. Cada canteiro tem um sensor de umidade: é com ele que a regra decide." }
];

// Só quando o puzzle veio da IA: a ADA reescreve a sala para o jogador.
const AI_SCRIPT = [
    { speaker: "COSMO", text: "Opa. Os canteiros mudaram agora mesmo. A ADA reescreveu a irrigação inteira." },
    { speaker: "COSMO", text: "Ela está aprendendo com você. Esta regra foi montada para o seu jeito de resolver." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Cada planta com a água que precisa. SE a terra está seca, rega. SENÃO, deixa quieta." },
    { speaker: "COSMO", text: "A porta liberou. Vamos." }
];

export default class JardimScene extends BaseRoomScene {
    constructor() {
        super("cap2-jardim", {
            nextScene: "cap2-deposito",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: jardimBg,
            map: jardimMap,
            music: "cap2"
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
    }

    onRoomCreate() {
        // Save com o jardim já resolvido: sem pedido à IA, o puzzle local só
        // serve para desenhar os canteiros no ponto.
        if (isSolved(PUZZLE_ID)) {
            this.buildGarden(irrigacaoPuzzle(), { restored: true });
            return;
        }

        let puzzle = null;
        let dialogueDone = false;
        let left = false;
        this.events.once("shutdown", () => { left = true; });
        const ready = () => {
            if (!puzzle || !dialogueDone || this.garden) return;
            this.buildGarden(puzzle);
            if (puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };

        requestAiPuzzle(PUZZLE_ID, irrigacaoPuzzle).then((result) => {
            if (left) return;            // saiu da sala antes de a IA responder
            puzzle = result;
            ready();
        });
        this.playDialogue(ENTRY_SCRIPT, () => {
            dialogueDone = true;
            ready();
        });
    }

    buildGarden(puzzle, { restored = false } = {}) {
        this.garden = new GardenBeds(this, { ...BEDS, tests: puzzle.tests, field: "regar" });

        if (!restored) {
            // A fileira "liga": surge de baixo para cima.
            this.cameras.main.flash(260, 74, 214, 255, false);
        }

        new PuzzleDevice(this, {
            id: PUZZLE_ID,
            ...PANEL,
            drawBody: false,
            label: "IRRIGAÇÃO",
            promptY: PANEL.y - PANEL.h / 2 - 12,
            puzzle,
            onRun: (results, done) => this.garden.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => this.unlockDoor()),
            onRestore: () => {
                this.garden.showSolved();
                this.unlockDoor();
            }
        });
    }
}
