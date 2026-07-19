import BaseRoomScene from "./BaseRoomScene";
import EniacBoss from "../../characters/EniacBoss";

// Capítulo 1, arena da sentinela (sala 5 do fluxo): batalha de treino contra um
// inimigo próprio antes do boss. Reusa a BattleScene parametrizada (menos HP,
// sem sequência de defesa) para ensinar o combate por turnos: ATACAR,
// REPROGRAMAR (criar/dobrar a forca) e ANALISAR, sem punição pesada. O padrão
// de ataque é DIFERENTE do ENIAC: varredura lateral com brecha ("sweep"), em
// vez da chuva vertical.
//
// Cenário procedural (grade) e sprite PLACEHOLDER (robô do ENIAC com tint
// ciano) até a arte da sentinela ficar pronta no Aseprite.

const SENTINEL = { x: 640, y: 240, scale: 2.2, tint: 0x8fe0ff };
const SENTINEL_RADIUS = 150;

// Números mais brandos que os do ENIAC (DEFAULT_CONFIG da BattleScene).
const BATTLE_CONFIG = {
    name: "SENTINELA",
    maxHp: 25,
    returnScene: "cap1-sentinela",
    defenseEnabled: false,
    dodgePattern: "sweep",
    dodgeDuration: 4600,
    projectileInterval: 950,               // intervalo entre varreduras.
    projectileSpeed: { min: 150, max: 190 },
    bossTint: SENTINEL.tint,
    analysisLine: "SENTINELA DE TREINO — UNIDADE DIDÁTICA DA ELYSIUM."
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Sentinela de treino. ATACAR causa o dano da variável forca; REPROGRAMAR cria ou dobra a forca; ANALISAR dá dicas." },
    { speaker: "COSMO", text: "No turno dela, ache a brecha na varredura e desvie com WASD. Aperte [E] quando estiver pronta." }
];

const VICTORY_SCRIPT = [
    { speaker: "COSMO", text: "Sentinela no chão. O ENIAC é mais duro — mas a lógica é a mesma. Vamos." }
];

export default class SentinelaScene extends BaseRoomScene {
    constructor() {
        super("cap1-sentinela", {
            title: "ARENA // SENTINELA",
            footer: "WASD mover   SHIFT correr   [E] interagir",
            nextScene: "cap1-seguranca",
            spawn: { x: 140, y: 430 }
        });
    }

    preload() {
        super.preload();
        EniacBoss.preload(this);
    }

    onRoomCreate() {
        this.defeated = false;

        this.sentinel = new EniacBoss(this, SENTINEL.x, SENTINEL.y, {
            scale: SENTINEL.scale,
            tint: SENTINEL.tint
        });

        this.createChallengePrompt();

        // A BattleScene devolve o controle via scene.resume(..., { victory: true }).
        this.events.once("resume", (_scene, data) => {
            if (data?.victory) {
                this.handleVictory();
            }
        });

        this.playDialogue(ENTRY_SCRIPT);
    }

    createChallengePrompt() {
        this.challengePrompt = this.add.text(SENTINEL.x, SENTINEL.y - 80, "[E] TREINAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.tweens.add({
            targets: this.challengePrompt,
            y: SENTINEL.y - 86,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.registerInteractable({
            x: SENTINEL.x,
            y: SENTINEL.y,
            radius: SENTINEL_RADIUS,
            promptObj: this.challengePrompt,
            isAvailable: () => !this.defeated,
            onInteract: () => this.startBattle()
        });
    }

    startBattle() {
        this.player.setEnabled(false);
        this.scene.launch("cap1-batalha", { config: BATTLE_CONFIG });
        this.scene.pause();
    }

    handleVictory() {
        this.defeated = true;
        this.sentinel.powerDown();
        this.setStatus("> SENTINELA OFFLINE", "#51e36b");

        this.time.delayedCall(600, () => {
            this.playDialogue(VICTORY_SCRIPT, () => this.unlockDoor());
        });
    }
}
