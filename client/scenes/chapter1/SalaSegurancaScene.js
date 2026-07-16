import BaseRoomScene from "./BaseRoomScene";
import EniacBoss from "../../characters/EniacBoss";
import segurancaBg from "../../assets/images/seguranca/seguranca_bg.png";
import segurancaMap from "../../assets/maps/seguranca.json";

// Capítulo 1, sala 4 — Sala de segurança: antessala do boss. O ENIAC (sprite
// animado) vigia a parede do fundo; interagir com o terminal do núcleo abre a
// tela de combate por turnos (BattleScene, "cap1-batalha") via launch + pause.
// A sala retoma com { victory: true } quando o boss é derrotado: o ENIAC da
// sala desliga, o diálogo final toca e a porta destrava.

const BOSS = { x: 640, y: 185, scale: 3 };
const CORE = { x: 640, y: 340, h: 110 };
const CORE_RADIUS = 140;

const ENIAC_COLOR = "#ff4545";

const ENTRY_SCRIPT = [
    { speaker: "ENIAC", color: ENIAC_COLOR, text: "UNIDADE NÃO AUTORIZADA DETECTADA." },
    { speaker: "ENIAC", color: ENIAC_COLOR, text: "ESTE SETOR ESTÁ SOB MINHA CUSTÓDIA DESDE 1946." },
    { speaker: "COSMO", text: "Um ENIAC... primeira geração. Ele controla a trava mestra do saguão." },
    { speaker: "COSMO", text: "Vamos derrubá-lo por dentro. Invada o núcleo — e lembre: no combate, você pode REPROGRAMAR o próprio ataque." }
];

const VICTORY_SCRIPT = [
    { speaker: "ENIAC", color: ENIAC_COLOR, text: "CUSTÓDIA... ENCERRADA... ......" },
    { speaker: "COSMO", text: "Conseguimos. O caminho pro saguão está livre." },
    { speaker: "COSMO", text: "Espera... com o ENIAC fora, o bloqueio de sinal caiu um nível. Estou recebendo algo—" }
];

export default class SalaSegurancaScene extends BaseRoomScene {
    constructor() {
        super("cap1-seguranca", {
            nextScene: "cap1-corredor",
            spawn: { x: 150, y: 480 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 1150, y: 98 },
            ySort: true,
            bg: segurancaBg,
            map: segurancaMap
        });
    }

    preload() {
        super.preload();
        EniacBoss.preload(this);
    }

    onRoomCreate() {
        this.defeated = false;

        this.boss = new EniacBoss(this, BOSS.x, BOSS.y, { scale: BOSS.scale });
        this.createCore();

        // A BattleScene devolve o controle via scene.resume(..., { victory: true }).
        this.events.once("resume", (_scene, data) => {
            if (data?.victory) {
                this.handleVictory();
            }
        });

        this.playDialogue(ENTRY_SCRIPT);
    }

    // --- Terminal do núcleo: abre a tela de combate ---
    createCore() {
        const { x, y, h } = CORE;
        const top = y - h / 2;

        this.add.text(x, y + h / 2 + 16, "NÚCLEO", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#7a8099"
        }).setOrigin(0.5).setDepth(790);

        this.corePrompt = this.add.text(x, top - 24, "[E] INVADIR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.tweens.add({
            targets: this.corePrompt,
            y: top - 30,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.registerInteractable({
            x,
            y,
            radius: CORE_RADIUS,
            promptObj: this.corePrompt,
            isAvailable: () => !this.defeated,
            onInteract: () => this.startBattle()
        });
    }

    startBattle() {
        this.player.setEnabled(false);
        this.scene.launch("cap1-batalha");
        this.scene.pause();
    }

    handleVictory() {
        this.defeated = true;
        this.boss.powerDown();
        this.cameras.main.shake(500, 0.005);
        this.setStatus("> ENIAC DESLIGADO", "#51e36b");

        this.time.delayedCall(600, () => {
            this.playDialogue(VICTORY_SCRIPT, () => this.unlockDoor());
        });
    }
}
