import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";

// Capítulo 1, sala 3 — Controle ambiental: dois puzzles, um de string (setor da
// ventilação, texto entre aspas) e um de float (temperatura com ponto decimal).

const VENTILATION_PUZZLE = {
    title: "VENTILAÇÃO // SETOR",
    briefing: [
        "A ventilação precisa saber qual setor reativar.",
        "Textos (strings) sempre vão entre aspas.",
        "Você está no setor B2."
    ],
    hint: 'dica:  setor = "..."   (com aspas!)',
    variable: "setor",
    expected: "B2",
    successMessage: "VENTILAÇÃO ATIVA",
    wrongValueMessage: "setor não reconhecido"
};

const THERMOSTAT_PUZZLE = {
    title: "TERMOSTATO // NÚCLEO",
    briefing: [
        "O núcleo está superaquecendo.",
        "Ajuste a temperatura alvo para 21.5 graus.",
        "Números decimais (float) usam ponto, não vírgula."
    ],
    hint: "dica:  temperatura = 21.5",
    variable: "temperatura",
    expected: 21.5,
    successMessage: "TEMPERATURA AJUSTADA",
    wrongValueMessage: "fora da faixa segura"
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Controle ambiental. Se reativarmos os sistemas daqui, o caminho até a segurança abre." },
    { speaker: "COSMO", text: "Dois painéis, dois tipos de valor: texto entre aspas e números com ponto decimal." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Ar circulando, núcleo estável. Você aprende rápido." },
    { speaker: "COSMO", text: "Cuidado agora. A sala de segurança fica à frente — e algo antigo vive nela." }
];

export default class SalaControleScene extends BaseRoomScene {
    constructor() {
        super("cap1-controle", {
            title: "- CONTROLE AMBIENTAL -",
            nextScene: "cap1-seguranca",
            spawn: { x: 180, y: 400 }
        });
    }

    onRoomCreate() {
        this.ventilation = new PuzzleDevice(this, {
            x: 460,
            y: 260,
            label: "VENTILAÇÃO",
            puzzle: VENTILATION_PUZZLE,
            onSolved: () => this.checkAllSolved()
        });

        this.thermostat = new PuzzleDevice(this, {
            x: 860,
            y: 260,
            label: "TERMOSTATO",
            puzzle: THERMOSTAT_PUZZLE,
            onSolved: () => this.checkAllSolved()
        });

        this.playDialogue(ENTRY_SCRIPT);
    }

    checkAllSolved() {
        const solvedCount = [this.ventilation, this.thermostat].filter((device) => device.solved).length;
        this.setStatus(`> SISTEMAS REATIVADOS: ${solvedCount}/2`, solvedCount === 2 ? "#51e36b" : "#7a8099");

        if (solvedCount < 2) {
            return;
        }

        this.time.delayedCall(1000, () => {
            this.playDialogue(SOLVED_SCRIPT, () => this.unlockDoor());
        });
    }
}
