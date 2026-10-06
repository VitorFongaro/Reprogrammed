import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import SaveComputer from "../../objects/SaveComputer";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Enemy from "../../characters/Enemy";
import { catracaPuzzle } from "../../data/puzzleVariants";
import { save as saveProgress } from "../../state/progress";
import recepcaoBg from "../../assets/images/recepcao/recepcao_bg.png";
import recepcaoMap from "../../assets/maps/recepcao.json";

// Capítulo 2 (CONDICIONAIS), sala 1 — RECEPÇÃO do térreo da Elysium.
//
// A Artemis sai do elevador (à esquerda) no primeiro andar "limpo" do jogo. O
// saguão é dividido ao meio por floreiras e uma fileira de CATRACAS: do lado de
// cá, a área pública (balcão, espera, totem); do lado de lá, a área restrita,
// com o posto da segurança, uma VIGIA e a porta de saída.
//
// É o primeiro `se` do capítulo, e o mais literal que existe: catraca é uma
// condicional de metal. O sistema do balcão reprograma a regra de acesso
// (ConditionalConsole, via PuzzleDevice); com ela certa, as abas de vidro
// recolhem. A vigia do outro lado só atira em quem se MEXE, então atravessar
// é pare-e-anda ou reprogramá-la de longe com [R]. A porta abre com as
// catracas liberadas E a vigia neutralizada.
//
// Arte: fundo por tools/recepcao_bg.py; móveis e catracas no Aseprite, por
// tools/recepcao_props.lua. Os móveis estão no Tiled (assets/maps/recepcao.json);
// as catracas e as abas são colocadas AQUI porque trocam de estado.

// Porta padrão carimbada no fundo (DOOR_X do recepcao_bg.py).
const DOOR = { x: 1152, y: 98 };

// Sai do elevador pintado na parede (ELEVATOR do recepcao_bg.py).
const SPAWN = { x: 136, y: 250 };

// Sistema de acesso: o balcão inteiro é o dispositivo (coordenadas de TELA =
// mapa + 8). Sem corpo nem luz: a resposta visual é a catraca mudando de cor.
const DESK = { x: 480, y: 196, w: 200, h: 96 };

const SAVE_STATION = { x: 262, y: 214 };

// Catracas: 3 pedestais empilhados na linha da divisória, x do canto esquerdo e
// y da BASE (tela), como os objetos do Tiled. As duas de cima têm a aba de
// vidro que fecha a pista abaixo delas; a última não tem pista embaixo.
const GATE_X = 770;
const GATES = [
    { y: 384, closed: "catraca_fechada" },
    { y: 484, closed: "catraca_fechada" },
    { y: 584, closed: "catraca_travada" }
];
// Abas fechadas = colisores nas pistas entre os pedestais (tela).
const FLAPS = [
    { x: 790, y: 330, w: 20, h: 54 },
    { x: 790, y: 430, w: 20, h: 54 }
];

const VIGIA_POS = { x: 1060, y: 448 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Térreo. Luz de verdade, piso polido... bem-vinda ao lado bonito da Elysium." },
    { speaker: "COSMO", text: "As catracas travaram no bloqueio. Consegui um crachá de técnico lá embaixo: nível 4." },
    { speaker: "COSMO", text: "Catraca é pura CONDIÇÃO: SE o crachá tem nível, ela abre. O sistema fica no balcão." },
    { speaker: "COSMO", text: "E do outro lado tem uma vigia. Ela só atira em quem se mexe. Lembre disso." }
];

const GATES_OPEN_SCRIPT = [
    { speaker: "COSMO", text: "Regra nova no ar. Crachá nível 4: passa." }
];

const CLEARED_SCRIPT = [
    { speaker: "COSMO", text: "Recepção liberada. Daqui para dentro, cada porta é uma decisão." }
];

export default class RecepcaoScene extends BaseRoomScene {
    constructor() {
        super("cap2-recepcao", {
            // Até o jardim de inverno existir, a porta leva ao laboratório de
            // testes do capítulo.
            nextScene: "cap2-laboratorio",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: recepcaoBg,
            map: recepcaoMap,
            combat: true,
            music: "cap2"
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        Enemy.preload(this);
        SaveComputer.preload(this);
    }

    onRoomCreate() {
        this.gatesOpen = false;
        this.cleared = false;

        this.createGates();

        this.accessSystem = new PuzzleDevice(this, {
            id: "recepcao-catracas",
            x: DESK.x,
            y: DESK.y,
            w: DESK.w,
            h: DESK.h,
            drawBody: false,
            indicator: false,
            promptY: DESK.y - DESK.h / 2 - 12,
            blocks: true,
            // Nível mínimo sorteado a cada entrada (data/puzzleVariants.js).
            puzzle: catracaPuzzle(),
            onSolved: () => this.openGates(true),
            // Save com as catracas já liberadas: abre calado.
            onRestore: () => this.openGates(false)
        });

        this.saveStation = new SaveComputer(this, {
            x: SAVE_STATION.x,
            y: SAVE_STATION.y,
            onSave: () => this.saveGame()
        });

        new Enemy(this, VIGIA_POS.x, VIGIA_POS.y, { type: "vigia" });

        // Chegada nova (catracas ainda travadas): card do capítulo e o Cosmo.
        // Quem volta pelo CONTINUAR já passou por isso.
        if (!this.gatesOpen) {
            this.showChapterCard(() => this.playDialogue(ENTRY_SCRIPT));
        }
    }

    onRoomUpdate() {
        if (this.cleared || !this.gatesOpen) {
            return;
        }
        if (this.enemies.every((e) => e.disabled)) {
            this.cleared = true;
            this.time.delayedCall(600, () => {
                this.playDialogue(CLEARED_SCRIPT, () => this.unlockDoor());
            });
        }
    }

    // --- Catracas ---
    createGates() {
        this.gateImages = GATES.map((gate) => this.add.image(GATE_X, gate.y, `prop-${gate.closed}`)
            .setOrigin(0, 1)
            .setDepth(gate.y));
        this.flapZones = this.addColliders(FLAPS);
    }

    openGates(announce) {
        if (this.gatesOpen) {
            return;
        }
        this.gatesOpen = true;
        this.gateImages.forEach((image) => image.setTexture("prop-catraca_aberta"));
        this.flapZones.forEach((zone) => { zone.body.enable = false; });
        if (announce) {
            this.time.delayedCall(700, () => this.playDialogue(GATES_OPEN_SCRIPT));
        }
    }

    // Resposta do ponto de salvamento (mesma do porão).
    async saveGame() {
        const result = await saveProgress();
        if (result.remote) {
            return { text: "> progresso gravado no nó de arquivo" };
        }
        return {
            text: "> gravado só nesta máquina — nó de arquivo fora do ar",
            color: "#ffb347"
        };
    }

    // Card de abertura do capítulo, no mesmo estilo do "CAPÍTULO 1 :: SUBSOLO"
    // da IntroScene. Fica acima do diálogo (900) e dos consoles (1000).
    showChapterCard(onComplete) {
        const W = this.scale.width;
        const H = this.scale.height;
        const card = this.add.container(0, 0).setDepth(1100).setAlpha(0);
        const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x050505, 0.82);
        const chapter = this.add.text(W / 2, H / 2 - 46, "C A P Í T U L O   2", {
            fontFamily: "VCR", fontSize: "20px", color: "#6a7186"
        }).setOrigin(0.5);
        const title = this.add.text(W / 2, H / 2 + 6, "T É R R E O", {
            fontFamily: "VCR", fontSize: "54px", color: "#f7f7f7"
        }).setOrigin(0.5);
        const rule = this.add.graphics();
        rule.lineStyle(2, 0x4ad6ff, 0.9);
        rule.lineBetween(W / 2 - 150, H / 2 + 46, W / 2 + 150, H / 2 + 46);
        card.add([shade, chapter, title, rule]);

        // A Artemis não anda por baixo do card.
        this.player.setEnabled(false);
        this.tweens.add({
            targets: card,
            alpha: 1,
            duration: 700,
            ease: "Sine.easeOut",
            hold: 1800,
            yoyo: true,
            onComplete: () => {
                card.destroy(true);
                this.player.setEnabled(true);
                onComplete?.();
            }
        });
    }
}
