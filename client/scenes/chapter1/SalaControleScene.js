import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import Enemy from "../../characters/Enemy";
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
        "A ventilação precisa do setor onde você",
        "está agora. Leia o mapa (o ponto azul) e",
        "informe o código — é um texto (string)."
    ],
    hint: 'setor = "código do mapa" (a linha e a coluna, entre aspas)',
    variable: "setor",
    expected: "B2",
    // Mapa/grade: o ponto azul marca onde a Artemis está; escolha a célula certa.
    gauge: { kind: "sector", label: "SETOR", rows: ["A", "B", "C"], cols: ["1", "2", "3"] },
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
        "Ajuste a variável temperatura até o",
        "termômetro bater no marcador seguro."
    ],
    hint: "temperatura = número decimal (com ponto) — qual bate no marcador?",
    variable: "temperatura",
    expected: 21.5,
    // Termômetro: o mercúrio sobe até o valor; o marcador verde é o alvo (21.5).
    gauge: { kind: "thermometer", label: "TERMOSTATO", min: 18, max: 25, target: 21.5 },
    successMessage: "TEMPERATURA AJUSTADA",
    wrongValueMessage: "fora da faixa segura",
    blockDistractors: {
        nome: ["nucleo", "calor"],
        op: ["=="],
        valor: ["21", "22.5", '"21.5"']
    }
};

const ENEMY_SPAWNS = [
    { type: "biped", x: 940, y: 400 },
    { type: "pistol", x: 700, y: 540 }
];

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Controle ambiental: dois painéis, dois tipos de valor — texto e número decimal. Reative os dois." },
    { speaker: "COSMO", text: "Cuidado, tem robôs de segurança soltos. [R] reprograma um deles, [F] golpeia — ou só desvie." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Sistemas estáveis. À frente fica o setor de treinamento da segurança — vá preparada." }
];

export default class SalaControleScene extends BaseRoomScene {
    constructor() {
        super("cap1-controle", {
            nextScene: "cap1-treinamento",
            spawn: { x: 150, y: 430 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 640, y: 98 },
            ySort: true,
            bg: controleBg,
            map: controleMap,
            hp: 20
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        Enemy.preload(this);
    }

    onRoomCreate() {
        this.ventilation = new PuzzleDevice(this, {
            id: "controle-ventilacao",
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
            id: "controle-termostato",
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

        ENEMY_SPAWNS.forEach((spawn) => new Enemy(this, spawn.x, spawn.y, { type: spawn.type }));

        this.restoreFromSave();
        this.playDialogue(ENTRY_SCRIPT);
    }

    // Save carregado com os dois painéis prontos: abre a porta sem repetir a
    // fala do Cosmo.
    restoreFromSave() {
        if (this.solvedCount() === 2) {
            this.unlockDoor();
        }
    }

    solvedCount() {
        return [this.ventilation, this.thermostat].filter((device) => device.solved).length;
    }

    checkAllSolved() {
        if (this.solvedCount() < 2) {
            return;
        }

        this.time.delayedCall(1000, () => {
            this.playDialogue(SOLVED_SCRIPT, () => this.unlockDoor());
        });
    }
}
