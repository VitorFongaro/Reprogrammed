import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import CrateCorridor from "../../objects/CrateCorridor";
import CrateBridge from "../../objects/CrateBridge";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Effects from "../../ui/Effects";
import Enemy from "../../characters/Enemy";
import { corredorPuzzle, pontePuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import depositoBg from "../../assets/images/deposito/deposito_bg.png";
import depositoMap from "../../assets/maps/deposito.json";

// Capítulo 2 (CONDICIONAIS), sala 3 — DEPÓSITO do térreo.
//
// O almoxarifado, onde o programa do jogador não acende luz nem pinta cartão
// de teste: ele MEXE NO MAPA. Cada caso de teste é uma caixa; o console fecha
// ao completar o programa e o mapa executa caso a caso. Lógica errada não dá
// mensagem: o jogador vê a caixa que travou ou o buraco que ficou na ponte.
// (Erro de SINTAXE continua no console, como um compilador.)
//
// Percurso, da esquerda para a direita, com as duas metades bloqueadas até o
// puzzle de cada uma passar:
//   1. CORREDOR (se/senão, limite numérico): um bloco de estantes com o
//      corredor travado por caixas; leve vai para o vão de cima, pesada para o
//      de baixo. A caixa que pesa exatamente o limite separa `<=` de `<`.
//   2. PONTE (`ou`): um fosso corta a sala; o guindaste leva as caixas da
//      esteira para a ponte ou para o compactador.
//   3. Do outro lado, um FAXINEIRO guarda a porta. Dá para reprogramá-lo com
//      [R] de cima do fosso, antes mesmo de a ponte existir.
// A porta abre com a ponte montada E o faxineiro neutralizado.
//
// Os DOIS puzzles são GERADOS POR IA (data/aiSpecs.js), como o do jardim: na
// chegada a sala pede os dois ao servidor e o Gemini decide os pesos, os
// materiais, o limite e quantas caixas há. Estantes, fosso e esteira são
// montados a partir dos casos de teste, então a sala só é montada quando os
// dois chegam — o diálogo de entrada cobre a espera e, se acabar antes, a
// Artemis espera parada. Sem resposta da IA, entra o gerador local da mesma
// ficha (data/puzzleVariants.js). Puzzle já resolvido no save não pede nada.
//
// Arte: fundo por tools/deposito_bg.py; estantes, esteira, compactador e
// móveis por tools/deposito_props.lua (Aseprite), no Tiled em
// assets/maps/deposito.json.

const CORREDOR_ID = "deposito-corredor";
const PONTE_ID = "deposito-ponte";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Bloco de estantes: o corredor fica centrado aqui, qualquer que seja o número
// de caixas (de 3 a 5 — x de 230 a 610 no máximo, ver RACKS do deposito_bg.py).
const CORREDOR = { cx: 420, y: 408 };
// Fosso ancorado pela margem direita (PIT do deposito_bg.py, embaixo da porta
// de enrolar): com 2 ou 3 vãos, vai de 904/964 a 1084.
const PONTE = {
    x1: 1084, y: 560,
    queue: { x: 830, y0: 200, gap: 58 },
    chute: { x: 665, y: 630 }
};
// Terminais (props do Tiled; coordenadas de TELA = mapa + 8).
const PAINEL_CORREDOR = { x: 182, y: 294, w: 64, h: 88 };
const CONTROLE_GUINDASTE = { x: 690, y: 236, w: 76, h: 72 };
const FAXINEIRO_POS = { x: 1165, y: 340 };
const OUTRO_LADO_X = PONTE.x1 + 12;

const MATERIAL_LABEL = { aco: "AÇO", madeira: "MADEIRA", papelao: "PAPELÃO" };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "O almoxarifado. A diretoria nunca pisou aqui: por isso ainda tem caixa de papelão." },
    { speaker: "COSMO", text: "O bloqueio travou o corredor com caixas. Do lado de cada uma tem um vão na estante, em cima ou embaixo." },
    { speaker: "COSMO", text: "Aqui o seu código não acende luzinha. Ele EMPURRA coisas. Se errar, você vai ver qual caixa travou." }
];
// Voltando pelo save com o corredor já livre.
const RETURN_SCRIPT = [
    { speaker: "COSMO", text: "De volta ao depósito. O corredor ficou livre; falta a ponte." }
];
// Só quando algum dos puzzles veio da IA.
const AI_SCRIPT = [
    { speaker: "COSMO", text: "Opa. O estoque mudou de lugar agora mesmo. A ADA reorganizou o depósito inteiro." },
    { speaker: "COSMO", text: "Essas caixas foram arrumadas para o seu jeito de resolver. Ela está prestando atenção." }
];
const CORREDOR_LIVRE = [
    { speaker: "COSMO", text: "Corredor livre. Leve em cima, pesada embaixo: até estante tem condicional." },
    { speaker: "COSMO", text: "Lá na frente tem um fosso. O guindaste monta uma ponte com as caixas da esteira." }
];
const PONTE_PRONTA = [
    { speaker: "COSMO", text: "Ponte montada. Cada caixa ali embaixo é um caso de teste que passou." }
];
const FAXINEIRO_AVISO = [
    { speaker: "COSMO", text: "Ainda tem um faxineiro rodando do outro lado. A porta não abre com ele ligado." }
];
const OUTRO_LADO = [
    { speaker: "COSMO", text: "Esse caminho não existia. Foi o seu programa que construiu." }
];
const CLEARED_SCRIPT = [
    { speaker: "COSMO", text: "Depósito liberado. Vamos." }
];

export default class DepositoScene extends BaseRoomScene {
    constructor() {
        super("cap2-deposito", {
            // Até a próxima sala do térreo existir, a porta leva ao laboratório de testes.
            nextScene: "cap2-laboratorio",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: depositoBg,
            map: depositoMap,
            combat: true,
            music: "cap2"
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        Effects.preload(this);   // faíscas das caixas batendo/rachando
        Enemy.preload(this);
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        // A instância da cena sobrevive ao scene.restart (morte na sala): sem
        // zerar, o `this.corridor` da vida anterior faria o ready() desistir.
        this.corridor = null;
        this.bridge = null;
        this.waitingText = null;
        this.bridgeDone = false;
        this.cleared = false;
        this.reachedOtherSide = false;

        // Puzzle resolvido no save: sem pedido à IA, o local só serve para
        // desenhar as caixas já no lugar.
        const corridorDone = isSolved(CORREDOR_ID);
        const bridgeDone = isSolved(PONTE_ID);
        const fetchPuzzle = (id, local, done) => (done ? Promise.resolve(local()) : requestAiPuzzle(id, local));

        if (corridorDone && bridgeDone) {
            this.buildCorridor(corredorPuzzle());
            this.buildBridge(pontePuzzle());
            this.spawnGuard();
            this.reachedOtherSide = true;
            return;
        }

        let puzzles = null;
        let dialogueDone = false;
        let left = false;
        this.events.once("shutdown", () => { left = true; });
        const ready = () => {
            if (!puzzles || !dialogueDone || this.corridor) return;
            this.hideWaiting();
            const [corridorPuzzle, bridgePuzzle] = puzzles;
            this.buildCorridor(corridorPuzzle);
            this.buildBridge(bridgePuzzle);
            this.spawnGuard();
            this.cameras.main.flash(260, 74, 214, 255, false);
            if (puzzles.some((p) => p.source === "ai")) {
                this.playDialogue(AI_SCRIPT);
            }
        };

        Promise.all([
            fetchPuzzle(CORREDOR_ID, corredorPuzzle, corridorDone),
            fetchPuzzle(PONTE_ID, pontePuzzle, bridgeDone)
        ]).then((result) => {
            if (left) return;            // saiu da sala antes de a IA responder
            puzzles = result;
            ready();
        });
        this.playDialogue(corridorDone ? RETURN_SCRIPT : ENTRY_SCRIPT, () => {
            dialogueDone = true;
            // As estantes e o fosso ainda não existem: andar agora deixaria a
            // Artemis onde o colisor vai nascer.
            if (!puzzles) this.showWaiting();
            ready();
        });
    }

    onRoomUpdate() {
        if (!this.reachedOtherSide && this.player.sprite.x > OUTRO_LADO_X) {
            this.reachedOtherSide = true;
            this.playDialogue(OUTRO_LADO);
        }
        if (!this.cleared && this.bridgeDone && this.enemies.every((e) => e.disabled)) {
            this.cleared = true;
            this.time.delayedCall(600, () => this.playDialogue(CLEARED_SCRIPT, () => this.unlockDoor()));
        }
    }

    // Nasce DEPOIS das estantes e do fosso: antes deles ele andaria pela sala
    // inteira e podia acabar dentro de um colisor novo ou do lado da entrada.
    spawnGuard() {
        new Enemy(this, FAXINEIRO_POS.x, FAXINEIRO_POS.y, { type: "faxineiro" });
    }

    buildCorridor(puzzle) {
        this.corridor = new CrateCorridor(this, {
            x0: CORREDOR.cx - (puzzle.tests.length * 76) / 2,
            y: CORREDOR.y,
            tests: puzzle.tests,
            field: "lado",
            labelOf: (given) => `${given.peso} kg`
        });
        new PuzzleDevice(this, {
            id: CORREDOR_ID,
            ...PAINEL_CORREDOR,
            drawBody: false,
            label: "CORREDOR",
            promptY: PAINEL_CORREDOR.y - PAINEL_CORREDOR.h / 2 - 12,
            puzzle,
            onRun: (results, done) => this.corridor.play(results, done),
            onSolved: () => this.playDialogue(CORREDOR_LIVRE),
            onRestore: () => this.corridor.showSolved()
        });
    }

    buildBridge(puzzle) {
        this.bridge = new CrateBridge(this, {
            ...PONTE,
            tests: puzzle.tests,
            field: "destino",
            bridgeValue: "ponte",
            discardValue: "descarte",
            lookOf: (given) => ({
                kind: given.material,
                label: MATERIAL_LABEL[given.material] ?? "",
                tag: given.cheia ? "CHEIA" : "VAZIA"
            })
        });
        new PuzzleDevice(this, {
            id: PONTE_ID,
            ...CONTROLE_GUINDASTE,
            drawBody: false,
            label: "GUINDASTE",
            promptY: CONTROLE_GUINDASTE.y - CONTROLE_GUINDASTE.h / 2 - 12,
            puzzle,
            onRun: (results, done) => this.bridge.play(results, done),
            onSolved: () => {
                this.bridgeDone = true;
                const script = this.enemies.every((e) => e.disabled) ? PONTE_PRONTA : [...PONTE_PRONTA, ...FAXINEIRO_AVISO];
                this.playDialogue(script);
            },
            onRestore: () => {
                this.bridge.showSolved();
                this.bridgeDone = true;
            }
        });
    }

    // Aviso enquanto a IA não responde (só aparece se o diálogo acabar antes).
    showWaiting() {
        this.player.setEnabled(false);
        this.waitingText = this.add.text(this.scale.width / 2, 196, "ADA REORGANIZANDO O ESTOQUE...", {
            fontFamily: "VCR", fontSize: "18px", color: "#4ad6ff",
            backgroundColor: "#05060a", padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setDepth(900);
        this.tweens.add({ targets: this.waitingText, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
    }

    hideWaiting() {
        if (!this.waitingText) return;
        this.waitingText.destroy();
        this.waitingText = null;
        this.player.setEnabled(true);
    }
}
