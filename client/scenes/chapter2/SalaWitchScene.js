import BaseRoomScene from "../chapter1/BaseRoomScene";
import WitchBoss from "../../characters/WitchBoss";
import { addServicePanel } from "../../objects/ServicePanel";
import { witchBattle, WITCH_ENTRY_SCRIPT, WITCH_VICTORY_SCRIPT } from "./HallScene";
import Effects from "../../ui/Effects";

// Capítulo 2: sala da WITCH, a boss FINAL do capítulo (a LEO virou pré-boss).
// SALA DE TESTE: a luta de verdade é no hall do relógio (HallScene, `cap2-hall`),
// que é de onde vêm o embate e os roteiros.
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

// O embate do hall, voltando para cá e sem espólio: refazer para testar não
// pode virar farm de chip.
const WITCH_BATTLE = witchBattle({ returnScene: "cap2-sala-witch", reward: null });

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

        this.playEntryDialogue(WITCH_ENTRY_SCRIPT, () => this.witch.start());
    }

    startBattle() {
        this.setStatus("");
        this.witch.pauseForBattle();
        this.player.setEnabled(false);
        this.scene.launch("cap1-batalha", { config: WITCH_BATTLE });
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
        this.time.delayedCall(600, () => this.playDialogue(WITCH_VICTORY_SCRIPT));
    }

}
