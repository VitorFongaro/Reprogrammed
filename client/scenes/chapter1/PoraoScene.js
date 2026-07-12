import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import poraoBg from "../../assets/images/porao/porao_bg.png";
import poraoMap from "../../assets/maps/porao.json";

// Capítulo 1, sala 1 — Porão fundo (depósito da Elysium): tutorial de movimento
// (WASD) e o primeiro puzzle de variável (int) no gerador da parede. Mesma sala
// da IntroScene — o jogador acorda e ganha controle aqui.

// A androide acorda onde a IntroScene a deixou (canto esquerdo do depósito).
const SPAWN = { x: 236, y: 426 };

// Gerador desenhado na arte do mapa (parede do fundo, à direita da porta).
const GENERATOR = { x: 1046, y: 75, w: 92, h: 110 };

// Porta dupla desenhada na arte (parede do fundo, centro).
const DOOR = { x: 656, y: 98 };

const GENERATOR_PUZZLE = {
    title: "GERADOR // NÚCLEO",
    briefing: [
        "O gerador está sem carga.",
        "Declare uma variável para armazenar a energia",
        "e atribua o valor exigido: 100 (número inteiro)."
    ],
    hint: "dica:  nome = valor   (ex: energia = 100)",
    variable: "energia",
    expected: 100,
    successMessage: "GERADOR ATIVADO",
    wrongValueMessage: "carga insuficiente"
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Seus servos ainda estão calibrando. Tente se mover — W, A, S, D." },
    { speaker: "COSMO", text: "Está vendo aquele gerador na parede? Sem energia, nenhuma porta deste andar abre." },
    { speaker: "COSMO", text: "Chegue perto dele e aperte [E]. Eu te guio no resto." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Ouviu o zumbido? Energia de volta." },
    { speaker: "COSMO", text: "Você acabou de criar uma variável: um espaço na memória com um nome e um valor." },
    { speaker: "COSMO", text: "A porta destravou. A sala de arquivos fica logo depois dela." }
];

export default class PoraoScene extends BaseRoomScene {
    constructor() {
        super("cap1-porao", {
            nextScene: "cap1-arquivos",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: poraoBg,
            bgKey: "porao-bg",
            map: poraoMap
        });
    }

    drawBackdrop() {
        super.drawBackdrop();

        // Letreiro da empresa na parede (o emblema faz parte do fundo).
        this.add.text(470, 92, "E L Y S I U M", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#6a7186"
        }).setOrigin(0.5).setDepth(-9);
    }

    onRoomCreate() {
        this.generator = new PuzzleDevice(this, {
            x: GENERATOR.x,
            y: GENERATOR.y,
            w: GENERATOR.w,
            h: GENERATOR.h,
            drawBody: false,
            promptY: GENERATOR.y + GENERATOR.h / 2 + 22,
            puzzle: GENERATOR_PUZZLE,
            onSolved: () => this.handleGeneratorSolved()
        });

        this.playDialogue(ENTRY_SCRIPT);
    }

    handleGeneratorSolved() {
        this.setStatus("> GERADOR ATIVADO", "#51e36b");
        this.time.delayedCall(1000, () => {
            this.playDialogue(SOLVED_SCRIPT, () => this.unlockDoor());
        });
    }
}
