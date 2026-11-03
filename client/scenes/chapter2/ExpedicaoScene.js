import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import ParcelSorter from "../../objects/ParcelSorter";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Enemy from "../../characters/Enemy";
import { triagemPuzzle } from "../../data/puzzleVariants";
import { requestAiPuzzle } from "../../state/aiPuzzles";
import { isSolved } from "../../state/progress";
import expedicaoBg from "../../assets/images/expedicao/expedicao_bg.png";
import expedicaoMap from "../../assets/maps/expedicao.json";

// Capítulo 2 (CONDICIONAIS), sala 4 — EXPEDIÇÃO, a triagem do correio.
//
// O `senão se` do capítulo: três saídas, e a ORDEM dos testes importa. A
// esteira corta a sala ao meio e três rampas separam os pacotes: CARGA
// (caminhão, leva peso), EXPRESSO (moto, só pacote leve e urgente) e NORMAL. O
// pacote pesado E urgente é a lição: testar "urgente" primeiro manda ele para a
// moto, que não aguenta.
//
// Por que isso abre caminho: a triagem quebrada manda TODO pacote para o fim da
// esteira, e a pilha entupiu a passarela — o único jeito de atravessar para o
// lado da porta. Com a triagem certa, nenhum pacote sobra e o braço de descarte
// esvazia a passarela (objects/ParcelSorter.js). Do outro lado, um MENSAGEIRO
// dorme ao lado da porta; ela só abre com ele neutralizado (dá para reprogramar
// de longe com [R] enquanto ele dorme, de graça).
//
// Puzzle GERADO POR IA (expedicao-triagem, data/aiSpecs.js), como o do jardim:
// a sala pede na chegada, o diálogo cobre a espera e o gerador local
// (triagemPuzzle) entra se a IA não responder.
//
// Arte: fundo por tools/expedicao_bg.py; pacotes, rampas, pilha e móveis por
// tools/expedicao_props.lua (Aseprite), no Tiled em assets/maps/expedicao.json.

const PUZZLE_ID = "expedicao-triagem";

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Painel da triagem (prop do Tiled, tela = mapa + 8).
const PANEL = { x: 472, y: 256, w: 64, h: 88 };

// Esteira pintada no fundo (BELT_* do expedicao_bg.py, em tela) e as rampas.
const BELT = { x: 620, top: 136, bottom: 562 };
const CHUTES = [
    { value: "carga", label: "CARGA", color: "#ff962e", baseY: 418 },
    { value: "expresso", label: "EXPRESSO", color: "#ff4545", baseY: 492 },
    { value: "normal", label: "NORMAL", color: "#4a8ce6", baseY: 566 }
];
// A pilha entupindo a passarela, embaixo da esteira: ela vai do fim da esteira
// até a parede de baixo, então esteira + pilha dividem a sala inteira.
const PILE = { x: 620, baseY: 668, collider: { x: 552, y: 562, w: 138, h: 110 } };

const COURIER = { x: 1060, y: 470 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "A expedição. Daqui sai tudo que a Elysium manda para fora... e hoje não está saindo nada." },
    { speaker: "COSMO", text: "A triagem pifou: todo pacote vai parar no fim da esteira. A pilha entupiu a passarela, o único jeito de atravessar." },
    { speaker: "COSMO", text: "Três rampas: CARGA, EXPRESSO e NORMAL. O painel ali decide para qual vai cada pacote." }
];

const AI_SCRIPT = [
    { speaker: "COSMO", text: "Chegou carga nova na esteira agora mesmo. A ADA mexeu na triagem de novo, do jeito que acha que você resolve." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Cada pacote na rampa certa. A ordem fez diferença: o pesado e urgente tinha de ser pego pelo peso antes." },
    { speaker: "COSMO", text: "Sem pacote errado chegando, o braço de descarte limpou a passarela." }
];

const COURIER_SCRIPT = [
    { speaker: "COSMO", text: "E aquele mensageiro dormindo do lado da porta... a porta é dele. Melhor desligar antes que acorde." }
];

const CLEARED_SCRIPT = [
    { speaker: "COSMO", text: "Passarela livre e mensageiro desligado. A porta é nossa." }
];

export default class ExpedicaoScene extends BaseRoomScene {
    constructor() {
        super("cap2-expedicao", {
            nextScene: "cap2-hall",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: expedicaoBg,
            map: expedicaoMap,
            combat: true,
            music: "cap2"
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        Enemy.preload(this);
    }

    onRoomCreate() {
        // A instância da cena sobrevive ao scene.restart: sem zerar, o
        // `this.sorter` da vez anterior faria o ready() desistir.
        this.sorter = null;
        this.waitingText = null;
        this.cleared = false;
        this.pileCleared = false;
        new Enemy(this, COURIER.x, COURIER.y, { type: "mensageiro" });

        if (isSolved(PUZZLE_ID)) {
            this.buildSorter(triagemPuzzle(), { restored: true });
            return;
        }

        let puzzle = null;
        let dialogueDone = false;
        let left = false;
        this.events.once("shutdown", () => { left = true; });
        const ready = () => {
            if (!puzzle || !dialogueDone || this.sorter) return;
            this.hideWaiting();
            this.buildSorter(puzzle);
            if (!this.retrying && puzzle.source === "ai") {
                this.playDialogue(AI_SCRIPT);
            }
        };

        // Nova tentativa depois de morrer: o MESMO puzzle (sem outra ida à IA).
        // `lastPuzzle` sobrevive ao restart porque a instância da cena é a mesma.
        const request = this.retrying && this.lastPuzzle
            ? Promise.resolve(this.lastPuzzle)
            : requestAiPuzzle(PUZZLE_ID, triagemPuzzle);
        request.then((result) => {
            if (left) return;            // saiu da sala antes de a IA responder
            puzzle = result;
            this.lastPuzzle = result;
            ready();
        });
        this.playEntryDialogue(ENTRY_SCRIPT, () => {
            dialogueDone = true;
            // A esteira e a pilha só ganham colisor quando o puzzle chega:
            // andar antes deixaria a Artemis atravessar para o lado do
            // mensageiro, ou ficar presa dentro da pilha quando ela nascer.
            if (!puzzle) this.showWaiting();
            ready();
        });
    }

    // Aviso enquanto a IA não responde (só aparece se o diálogo acabar antes),
    // o mesmo do depósito.
    showWaiting() {
        this.player.setEnabled(false);
        this.waitingText = this.add.text(this.scale.width / 2, 196, "ADA REORGANIZANDO A TRIAGEM...", {
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

    onRoomUpdate() {
        if (this.cleared || !this.pileCleared) {
            return;
        }
        if (this.enemies.every((e) => e.disabled)) {
            this.cleared = true;
            this.time.delayedCall(500, () => {
                this.playDialogue(CLEARED_SCRIPT, () => this.unlockDoor());
            });
        }
    }

    buildSorter(puzzle, { restored = false } = {}) {
        this.sorter = new ParcelSorter(this, { belt: BELT, chutes: CHUTES, pile: PILE, tests: puzzle.tests, field: "rampa" });

        if (!restored) {
            this.cameras.main.flash(260, 74, 214, 255, false);
        }

        new PuzzleDevice(this, {
            id: PUZZLE_ID,
            ...PANEL,
            drawBody: false,
            label: "TRIAGEM",
            promptY: PANEL.y - PANEL.h / 2 - 12,
            puzzle,
            onRun: (results, done) => this.sorter.play(results, done),
            onSolved: () => this.playDialogue(SOLVED_SCRIPT, () => {
                this.player.setEnabled(false);
                this.sorter.clearPile(() => {
                    this.pileCleared = true;
                    if (!this.enemies.every((e) => e.disabled)) {
                        this.playDialogue(COURIER_SCRIPT);
                    } else {
                        this.player.setEnabled(true);
                    }
                });
            }),
            onRestore: () => {
                this.sorter.showSolved();
                this.pileCleared = true;
            }
        });
    }
}
