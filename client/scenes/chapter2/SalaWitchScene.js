import BaseRoomScene from "../chapter1/BaseRoomScene";
import WitchBoss from "../../characters/WitchBoss";
import { addServicePanel } from "../../objects/ServicePanel";
import Effects from "../../ui/Effects";

// Capítulo 2: sala da WITCH, a boss FINAL do capítulo (a LEO virou pré-boss).
// Provisória como as outras salas de teste do cap. 2, até o mapa existir.
//
// A luta tem DUAS FASES:
//   1. No MAPA, em tempo real (characters/WitchBoss): o núcleo dela é blindado
//      e o [R] não a enxerga. É preciso CANSÁ-LA — sobrevivendo (ela cansa
//      atacando) ou batendo com [F] quando ela abre a guarda depois de um golpe.
//      Golpes: ceifada com ECO, SENTENÇA (死 onde você está e onde esteve),
//      BADALADA (anéis com brecha que gira) e PASSO NO TEMPO (portal atrás de
//      você). Enfurece na metade do fôlego. Sem fôlego, fica tonta uns
//      segundos: é a janela do [R].
//   2. Reprogramada, vira o combate POR TURNOS da BattleScene, com os padrões
//      dela: o RELÓGIO ("rewind" — rebobina e seus passos viram minas, ou
//      acelera a você junto), os PONTEIROS ("hands"), a ALMA ESPELHO ("mirror")
//      e a SENTENÇA na caixa que anda ("sentence"). O relógio do pack só
//      aparece aqui, na batalha por turnos.
// Perder a fase 2 reinicia o embate por turnos ali mesmo (regra da BattleScene):
// não é preciso cansá-la de novo.
//
// Fora do fluxo do jogo: sem porta, `autoSave: false`, sem música na sala e
// `reward: null` (no jogo de verdade, boss de capítulo larga o chip "cache" —
// aqui, refazer para testar não pode virar farm). Acesso pelo painel do
// laboratório ou por  __game.scene.start("cap2-sala-witch").

const WITCH_POS = { x: 640, y: 250 };

// HP: com 3 REPROGRAMAR, forca 10 -> 20 -> 40; 3 turnos investindo + 4
// ataques de 40 = 160 >= 150, então 7 turnos na rota mais rápida — um a mais
// que a LEO, por ser a boss final. Com o chip de cache (forca 80): 4 + 2 = 6.
const WITCH_HP = 150;

// Defesas do turno dela: condicionais com tempo, no tema do relógio.
const WITCH_DEFENSES = [
    {
        title: "DEFESA // HORA DO GOLPE",
        briefing: [
            "Ela ataca quando o relógio bate.",
            "Mais de 10 s: espere. Mais de 3 s: prepare. Senão: desvie."
        ],
        hint: 'comece pelo MAIOR: se tempo > 10 ... senão se tempo > 3 ...',
        lines: [
            "se [nome] [op] [valor] :",
            "    acao = [valor]",
            "senão se [nome] [op] [valor] :",
            "    acao = [valor]",
            "senão :",
            "    acao = [valor]"
        ],
        blocks: {
            nome: ["tempo", "tempo"],
            op: [">", ">", "<"],
            valor: ["10", "3", '"esperar"', '"preparar"', '"desviar"']
        },
        // As duas BORDAS estão nos testes (10 e 3): sem o caso de 3 s, soluções
        // com `< 3` passavam e contrariavam o texto ("mais de 3" exclui o 3).
        tests: [
            { given: { tempo: 15 }, expect: { acao: "esperar" } },
            { given: { tempo: 10 }, expect: { acao: "preparar" } },
            { given: { tempo: 5 }, expect: { acao: "preparar" } },
            { given: { tempo: 3 }, expect: { acao: "desviar" } }
        ],
        successMessage: "GOLPE ANTECIPADO",
        timeLimitMs: 32000
    },
    {
        title: "DEFESA // CONTRATEMPO",
        briefing: [
            "A foice erguida é perigo. O relógio girando também.",
            "Com qualquer um dos dois, escudo. Sem nenhum, abaixe."
        ],
        hint: "monte:  se foice ou relogio :  escudo = true  /  senão :  escudo = false",
        lines: [
            "se [nome] [op] [nome] :",
            "    escudo = [valor]",
            "senão :",
            "    escudo = [valor]"
        ],
        blocks: { nome: ["foice", "relogio"], op: ["e", "ou"], valor: ["true", "false"] },
        tests: [
            { given: { foice: true, relogio: true }, expect: { escudo: true } },
            { given: { foice: true, relogio: false }, expect: { escudo: true } },
            { given: { foice: false, relogio: true }, expect: { escudo: true } },
            { given: { foice: false, relogio: false }, expect: { escudo: false } }
        ],
        successMessage: "ESCUDO NO TEMPO CERTO",
        timeLimitMs: 26000
    }
];

const WITCH_BATTLE = {
    name: "WITCH",
    maxHp: WITCH_HP,
    maxReprograms: 3,
    returnScene: "cap2-sala-witch",
    defenseEnabled: true,
    defensePuzzles: WITCH_DEFENSES,
    // Um padrão por turno, cada um com uma regra nova (ver BattleScene).
    dodgePatterns: ["rewind", "hands", "mirror", "sentence"],
    dodgeDuration: 6500,
    // O relógio é um ciclo só: converge (1,6 s), segura (0,7 s) e volta (~1,2 s),
    // com as minas até ~3,9 s.
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
    reward: null,                     // sala de teste (no jogo: "cache", boss de capítulo).
    theme: "boss",
    combatants: [
        { ...WitchBoss.BATTLE_SPRITE, x: 640, y: 110, scale: 2.6 }
    ]
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Essa é a WITCH. Nome de um computador de 1951: o mais velho do mundo que ainda liga." },
    { speaker: "COSMO", text: "Enquanto ela luta, o núcleo fica blindado. O [R] não pega. Primeiro, canse ela." },
    { speaker: "COSMO", text: "Ela cansa sozinha de tanto atacar. E logo depois de um golpe abre a guarda: bata ali com [F]." },
    { speaker: "COSMO", text: "Só que todo golpe dela deixa um ECO que repete o golpe no mesmo lugar. Bata DEPOIS do eco." },
    { speaker: "COSMO", text: "E cuidado com o chão: ela escreve a sentença onde você está... e onde você acabou de estar." },
    { speaker: "COSMO", text: "Quando ela ficar tonta, sem fôlego, é a hora: [R]." }
];

const VICTORY_SCRIPT = [
    { speaker: "COSMO", text: "Parou. Pela primeira vez desde 1951, o relógio dela não anda." }
];

export default class SalaWitchScene extends BaseRoomScene {
    constructor() {
        super("cap2-sala-witch", {
            title: null,                  // o topo é da barra de fôlego dela
            spawn: { x: 640, y: 600 },
            combat: true,
            autoSave: false,
            music: null
        });
    }

    preload() {
        super.preload();
        WitchBoss.preload(this);
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        this.witch = new WitchBoss(this, WITCH_POS.x, WITCH_POS.y);
        this.witch.onTired = () => this.setStatus("> ELA ESTÁ SEM FÔLEGO: [R] PARA REPROGRAMAR", "#ffb347");
        this.witch.onEnraged = () => {
            this.setStatus("> FÚRIA: CADA GOLPE DELA GANHOU UMA CAMADA", "#ff4545");
            this.time.delayedCall(2200, () => this.setStatus(""));
        };
        this.witch.onRecovered = () => {
            this.setStatus("> ELA RECUPEROU O FÔLEGO", "#ff4545");
            this.time.delayedCall(1600, () => this.setStatus(""));
        };

        // Alvo do [R] só com ela sem fôlego: fora disso, o modo nem a mostra.
        this.registerReprogrammable({
            sprite: this.witch.sprite,
            w: 90,
            h: 130,
            label: "WITCH",
            isAvailable: () => this.witch.state === "tired",
            onReprogram: () => this.startBattle()
        });

        addServicePanel(this, {
            x: 110, y: 610, prompt: "[E] VOLTAR AOS TESTES", label: "LAB", color: 0x4ad6ff,
            onInteract: () => this.scene.start("cap2-laboratorio")
        });
        addServicePanel(this, {
            x: 1170, y: 610, prompt: "[E] REINICIAR SALA", label: "RESET", color: 0xffb347,
            onInteract: () => this.scene.restart()
        });

        this.events.on("resume", this.onBattleResume, this);
        this.events.once("shutdown", () => this.events.off("resume", this.onBattleResume, this));

        this.playDialogue(ENTRY_SCRIPT, () => this.witch.start());
    }

    startBattle() {
        this.setStatus("");
        this.witch.pauseForBattle();
        this.player.setEnabled(false);
        this.scene.launch("cap1-batalha", { config: WITCH_BATTLE });
        this.scene.pause();
    }

    // A BattleScene só devolve a sala na vitória (a derrota reinicia o embate
    // lá dentro). O resto dos resumes (menu de pausa, inventário) passa reto.
    onBattleResume(_scene, data) {
        if (!data?.victory || this.witch.state !== "battle") {
            return;
        }
        this.witch.defeat();
        this.time.delayedCall(600, () => this.playDialogue(VICTORY_SCRIPT));
    }

    // A Artemis caiu na fase 1: ela volta para o começo junto.
    onPlayerDowned() {
        super.onPlayerDowned();
        if (!this.witch.disabled) {
            this.witch.reset();
        }
    }
}
