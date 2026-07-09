import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";

// Capítulo 1, sala 1 — Porão fundo: tutorial de movimento (WASD) e o primeiro
// puzzle de variável (int): religar o gerador com `energia = 100`.

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
    { speaker: "COSMO", text: "Está vendo aquele gerador? Sem energia, nenhuma porta deste andar abre." },
    { speaker: "COSMO", text: "Chegue perto dele e aperte [E]. Eu te guio no resto." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Ouviu o zumbido? Energia de volta." },
    { speaker: "COSMO", text: "Você acabou de criar uma variável: um espaço na memória com um nome e um valor." },
    { speaker: "COSMO", text: "A porta destravou. Vamos — a sala de arquivos fica adiante." }
];

export default class PoraoScene extends BaseRoomScene {
    constructor() {
        super("cap1-porao", {
            title: "- PORÃO -  SETOR B // FUNDO",
            nextScene: "cap1-arquivos",
            spawn: { x: 300, y: 400 }
        });
    }

    onRoomCreate() {
        this.generator = new PuzzleDevice(this, {
            x: 1040,
            y: 320,
            label: "GERADOR",
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
