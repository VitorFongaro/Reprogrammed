import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import GardenBeds from "../../objects/GardenBeds";
import FloodedExit from "../../objects/FloodedExit";
import Effects from "../../ui/Effects";
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
// objects/GardenBeds.js). E é a irrigação que BLOQUEIA o caminho: ela rega tudo
// sem parar, a água transbordou e alagou a frente da porta, com um cabo de
// força faiscando dentro da poça (objects/FloodedExit.js). Androide não passa.
// Com a regra certa a água para de sobrar, o ralo dá conta e a saída seca.
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

// A poça na frente da porta, o cabo que caiu nela e a ponta do cano principal
// que está transbordando (PIPE_Y e GLASS do jardim_bg.py). Tela.
const FLOOD = {
    area: { x: 1050, y: 140, w: 196, h: 160 },
    cable: { from: { x: 1238, y: 136 }, tip: { x: 1172, y: 236 } },
    leak: { x: 1076, y: 124 }
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Uma estufa! Lá fora neva, e aqui dentro tem cacto. Só a Elysium mesmo." },
    { speaker: "COSMO", text: "Ih. A irrigação está regando tudo sem parar. A água transbordou e alagou a frente da porta." },
    { speaker: "COSMO", text: "E tem um cabo de força caído bem na poça. Água, cabo e androide... nem pensar." },
    { speaker: "COSMO", text: "O painel ali é o sistema. Cada canteiro tem um sensor de umidade: rega só quem precisa e a água para de sobrar." }
];

// Só quando o puzzle veio da IA: a ADA reescreve a sala para o jogador.
const AI_SCRIPT = [
    { speaker: "COSMO", text: "Opa. Os canteiros mudaram agora mesmo. A ADA reescreveu a irrigação inteira." },
    { speaker: "COSMO", text: "Ela está aprendendo com você. Esta regra foi montada para o seu jeito de resolver." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Cada planta com a água que precisa. SE a terra está seca, rega. SENÃO, deixa quieta." }
];

const DRAINED_SCRIPT = [
    { speaker: "COSMO", text: "Sem água sobrando, o ralo deu conta. E o cabo parou de faiscar: sem água, sem curto. Caminho livre." }
];

export default class JardimScene extends BaseRoomScene {
    constructor() {
        super("cap2-jardim", {
            nextScene: "cap2-expedicao",
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
        Effects.preload(this);   // faíscas do cabo na poça
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        // Save com o jardim já resolvido: sem pedido à IA, o puzzle local só
        // serve para desenhar os canteiros no ponto.
        if (isSolved(PUZZLE_ID)) {
            this.buildGarden(irrigacaoPuzzle(), { restored: true });
            return;
        }

        this.flood = new FloodedExit(this, FLOOD);

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
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.flood.drain(() => {
                    this.unlockDoor();
                    this.playDialogue(DRAINED_SCRIPT);
                });
            }),
            onRestore: () => {
                this.garden.showSolved();
                this.unlockDoor();
            }
        });
    }
}
