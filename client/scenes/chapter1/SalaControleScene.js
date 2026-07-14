import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import controleBg from "../../assets/images/controle/controle_bg.png";
import controleMap from "../../assets/maps/controle.json";

// Capítulo 1, sala 3 — Controle ambiental: dois puzzles, um de string (setor da
// ventilação, texto) e um de float (temperatura com ponto decimal). As máquinas
// estão desenhadas na parede do mapa; o código liga console/indicador/prompt.

const VENT = { x: 420, y: 75, w: 92, h: 110 };
const THERMO = { x: 860, y: 75, w: 92, h: 110 };
const DEVICE_PROMPT_Y = 152;

const VENTILATION_PUZZLE = {
    title: "VENTILAÇÃO // SETOR",
    briefing: [
        "A ventilação precisa saber qual setor reativar.",
        "Monte:  setor  =  valor.",
        "O valor é um texto (string) — você está no setor B2."
    ],
    hint: 'arraste os blocos para formar:  setor = "B2"',
    variable: "setor",
    expected: "B2",
    successMessage: "VENTILAÇÃO ATIVA",
    wrongValueMessage: "setor não reconhecido",
    blockDistractors: {
        nome: ["duto", "ar"],
        op: ["=="],
        valor: ['"A1"', '"C3"']
    }
};

const THERMOSTAT_PUZZLE = {
    title: "TERMOSTATO // NÚCLEO",
    briefing: [
        "O núcleo está superaquecendo.",
        "Monte:  temperatura  =  valor.",
        "Alvo: 21.5 graus (float usa ponto, não vírgula)."
    ],
    hint: "arraste os blocos para formar:  temperatura = 21.5",
    variable: "temperatura",
    expected: 21.5,
    successMessage: "TEMPERATURA AJUSTADA",
    wrongValueMessage: "fora da faixa segura",
    blockDistractors: {
        nome: ["nucleo", "calor"],
        op: ["=="],
        valor: ["21", "22.5", '"21.5"']
    }
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Controle ambiental. Se reativarmos os sistemas daqui, o caminho até a segurança abre." },
    { speaker: "COSMO", text: "Dois painéis na parede, dois tipos de valor: texto e número com ponto decimal." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Ar circulando, núcleo estável. Você aprende rápido." },
    { speaker: "COSMO", text: "Cuidado agora. A sala de segurança fica à frente — e algo antigo vive nela." }
];

export default class SalaControleScene extends BaseRoomScene {
    constructor() {
        super("cap1-controle", {
            nextScene: "cap1-seguranca",
            spawn: { x: 150, y: 430 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 640, y: 98 },
            ySort: true,
            bg: controleBg,
            map: controleMap
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
    }

    onRoomCreate() {
        this.ventilation = new PuzzleDevice(this, {
            x: VENT.x,
            y: VENT.y,
            w: VENT.w,
            h: VENT.h,
            drawBody: false,
            promptY: DEVICE_PROMPT_Y,
            blocks: true,
            puzzle: VENTILATION_PUZZLE,
            onSolved: () => this.checkAllSolved()
        });

        this.thermostat = new PuzzleDevice(this, {
            x: THERMO.x,
            y: THERMO.y,
            w: THERMO.w,
            h: THERMO.h,
            drawBody: false,
            promptY: DEVICE_PROMPT_Y,
            blocks: true,
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
