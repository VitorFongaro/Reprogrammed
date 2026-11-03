import BaseRoomScene from "../chapter1/BaseRoomScene";
import WitchBoss from "../../characters/WitchBoss";
// Defesas do turno dela: condicionais no tema do relógio, sorteadas a cada turno.
import { WITCH_DEFENSES } from "../../data/puzzleVariants";
import Effects from "../../ui/Effects";
import hallBg from "../../assets/images/hall/hall_bg.png";
import hallMap from "../../assets/maps/hall.json";

// Capítulo 2 (CONDICIONAIS), sala 5 — HALL DO RELÓGIO, a arena da WITCH, a
// boss final do capítulo.
//
// O saguão central do térreo: a pedra e as janelas da recepção, mas vazio, com
// o relógio grande na parede e um mostrador de mosaico no chão marcando a
// arena. A luta tem DUAS FASES (ver também SalaWitchScene, a sala de teste):
//   1. No MAPA, em tempo real (characters/WitchBoss): o núcleo dela é blindado
//      e o [R] não a enxerga. É preciso CANSÁ-LA — sobrevivendo ou batendo com
//      [F] quando ela abre a guarda. Sem fôlego, fica tonta uns segundos: é a
//      janela do [R].
//   2. Reprogramada, vira o combate POR TURNOS da BattleScene com os padrões
//      dela. A vitória larga o chip "cache" (boss de capítulo) e abre a porta.
// Morrer em qualquer das duas fases reinicia a SALA, com ela de volta ao
// começo da fase 1 (BaseRoomScene.restartRoom).
//
// Arte: fundo por tools/hall_bg.py; os móveis são os da recepção, no Tiled
// (assets/maps/hall.json).

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };
const WITCH_POS = { x: 640, y: 380 };
// O relógio da parede e o mostrador do chão (CLOCK e DIAL do hall_bg.py, em
// tela = mapa + 8): são a arena do golpe da MEIA-NOITE (ver WitchBoss).
const WALL_CLOCK = { x: 640, y: 70, r: 54 };
const FLOOR_DIAL = { cx: 640, cy: 418, rx: 330, ry: 190 };

// HP: com 3 REPROGRAMAR, forca 10 -> 20 -> 40; 3 turnos investindo + 4
// ataques de 40 = 160 >= 150, então 7 turnos na rota mais rápida — um a mais
// que a LEO, por ser a boss final. Com o chip de cache (forca 80): 4 + 2 = 6.
const WITCH_HP = 150;

// O embate por turnos. A sala de teste usa o mesmo, com o próprio retorno e
// sem espólio.
export function witchBattle(overrides = {}) {
    return {
        name: "WITCH",
        maxHp: WITCH_HP,
        maxReprograms: 3,
        returnScene: "cap2-hall",
        defenseEnabled: true,
        defensePuzzles: WITCH_DEFENSES,
        // Um padrão por turno, cada um com uma regra nova (ver BattleScene).
        dodgePatterns: ["rewind", "hands", "mirror", "sentence"],
        dodgeDuration: 6500,
        // O relógio é um ciclo só: converge (1,6 s), segura (0,7 s) e volta
        // (~1,2 s), com as minas até ~3,9 s.
        patternDurations: { rewind: 5000, hands: 7000, mirror: 6200, sentence: 6400 },
        projectileInterval: 420,
        projectileSpeed: { min: 140, max: 210 },
        analysisLine: "WITCH :: HARWELL DEKATRON, 1951. RELIGADA EM 2012.",
        analysisQuips: [
            "Baseada no WITCH: o computador digital mais velho do mundo que ainda funciona.",
            "WITCH quer dizer instrumento para ENSINAR computação. Ela reprova todo mundo.",
            "Quando o relógio dela volta, tudo que você fez com o tempo parado volta junto. Ande pouco.",
            "A outra alma é você também. Se ela apanha, quem sente é você."
        ],
        reward: "cache",              // boss de capítulo
        theme: "boss",
        combatants: [
            { ...WitchBoss.BATTLE_SPRITE, x: 640, y: 110, scale: 2.6 }
        ],
        ...overrides
    };
}

// Avisos da luta no topo da sala (a barra de fôlego dela fica logo acima).
// A sala de teste usa os mesmos.
export function wireWitchStatus(scene, witch) {
    const flash = (text, color, ms) => {
        scene.setStatus(text, color);
        scene.time.delayedCall(ms, () => scene.setStatus(""));
    };
    witch.onTired = () => scene.setStatus("> ELA ESTÁ SEM FÔLEGO: [R] PARA REPROGRAMAR", "#ffb347");
    witch.onEnraged = () => flash("> FÚRIA: CADA GOLPE DELA GANHOU UMA CAMADA", "#ff4545", 2200);
    witch.onRecovered = () => flash("> ELA RECUPEROU O FÔLEGO", "#ff4545", 1600);
    witch.onClock = (mode) => flash(mode === "rewind"
        ? "> MEIA-NOITE: O RELÓGIO VAI VOLTAR"
        : "> MEIA-NOITE: O RELÓGIO VAI ACELERAR", "#b48cff", 2400);
    witch.onClockTurn = () => flash("> O TEMPO VOLTOU", "#b48cff", 1400);
}

export const WITCH_ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Essa é a WITCH. Nome de um computador de 1951: o mais velho do mundo que ainda liga." },
    { speaker: "COSMO", text: "Enquanto ela luta, o núcleo fica blindado. O [R] não pega. Primeiro, canse ela." },
    { speaker: "COSMO", text: "Ela cansa sozinha de tanto atacar. E logo depois de um golpe abre a guarda: bata ali com [F]." },
    { speaker: "COSMO", text: "Só que todo golpe dela deixa um ECO que repete o golpe no mesmo lugar. Bata DEPOIS do eco." },
    { speaker: "COSMO", text: "E cuidado com o chão: ela escreve a sentença onde você está... e onde você acabou de estar." },
    { speaker: "COSMO", text: "De longe, a foice solta uma onda. Saia da linha dela. E se o relógio voltar a andar, saia do mostrador." },
    { speaker: "COSMO", text: "Quando ela ficar tonta, sem fôlego, é a hora: [R]." }
];

const HALL_SCRIPT = [
    { speaker: "COSMO", text: "O hall central. Aquele relógio parou faz anos... e mesmo assim continua marcando quase meia-noite." },
    { speaker: "COSMO", text: "Tem alguém no meio do mostrador. Artemis... não é decoração." },
    ...WITCH_ENTRY_SCRIPT
];

export const WITCH_VICTORY_SCRIPT = [
    { speaker: "COSMO", text: "Parou. Pela primeira vez desde 1951, o relógio dela não anda." }
];

const DOOR_SCRIPT = [
    { speaker: "COSMO", text: "Sem ela, o térreo é nosso. A porta do fundo liberou." }
];

export default class HallScene extends BaseRoomScene {
    constructor() {
        super("cap2-hall", {
            // Até as salas depois do boss existirem, a porta leva ao laboratório.
            nextScene: "cap2-laboratorio",
            title: null,                  // o topo é da barra de fôlego dela
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: hallBg,
            map: hallMap,
            combat: true,
            music: "cap2"
        });
    }

    preload() {
        super.preload();
        WitchBoss.preload(this);
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        this.witch = new WitchBoss(this, WITCH_POS.x, WITCH_POS.y, { arena: FLOOR_DIAL, wallClock: WALL_CLOCK });
        wireWitchStatus(this, this.witch);

        // Alvo do [R] só com ela sem fôlego: fora disso, o modo nem a mostra.
        this.registerReprogrammable({
            sprite: this.witch.sprite,
            w: 90,
            h: 130,
            label: "WITCH",
            isAvailable: () => this.witch.state === "tired",
            onReprogram: () => this.startBattle()
        });

        this.events.on("resume", this.onBattleResume, this);
        this.events.once("shutdown", () => this.events.off("resume", this.onBattleResume, this));

        this.playEntryDialogue(HALL_SCRIPT, () => this.witch.start());
    }

    startBattle() {
        this.setStatus("");
        this.witch.pauseForBattle();
        this.player.setEnabled(false);
        this.scene.launch("cap1-batalha", { config: witchBattle() });
        this.scene.pause();
    }

    // A BattleScene devolve a sala na vitória; a derrota (lá ou aqui na fase 1)
    // reinicia a sala inteira, e a WITCH volta ao começo junto (BaseRoomScene).
    // O resto dos resumes (menu de pausa, inventário) passa reto.
    onBattleResume(_scene, data) {
        if (!data?.victory || this.witch.state !== "battle") {
            return;
        }
        this.witch.defeat();
        this.time.delayedCall(600, () => this.playDialogue([...WITCH_VICTORY_SCRIPT, ...DOOR_SCRIPT], () => this.unlockDoor()));
    }

}
