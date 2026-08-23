import BaseRoomScene from "./BaseRoomScene";
import tealWalk from "../../assets/sprites/enemies/biped_teal/walk.png";
import tealDisabled from "../../assets/sprites/enemies/biped_teal/disabled.png";
import violetWalk from "../../assets/sprites/enemies/biped_violet/walk.png";
import violetDisabled from "../../assets/sprites/enemies/biped_violet/disabled.png";
import arquivosBg from "../../assets/images/arquivos/arquivos_bg.png";
import arquivosMap from "../../assets/maps/arquivos.json";

// Capítulo 1, arena da sentinela (sala pré-boss): agora uma DUPLA de sentinelas
// (recolor do biped — teal e violeta, não-vermelhos) que lutam JUNTAS numa só
// batalha por turnos (BattleScene em modo `combatants`, HP combinado → mais
// difícil). O turno das sentinelas cicla TRÊS padrões de bullet hell:
//   spiral      — orbe central girando e cuspindo balas em espiral;
//   splitBounce — bolas grandes que quicam nas bordas e se dividem a cada quicada;
//   touhouCross — uma cruz de balas surge em volta da alma; escape pelas diagonais.
// Cenário reaproveita o mapa da sala de arquivos (bg + props + colisões do Tiled)
// em vez do grid procedural: os dois sentinelas ficam plantados no chão aberto,
// com o terminal central atrás deles, como guardas.

const WIDTH = 1280;
const UNIT_SCALE = 2.8;
const UNIT_Y = 480;
const PROMPT = { x: 640, y: 405 };
const CHALLENGE_RADIUS = 220;

// Unidades mostradas na sala (a batalha usa suas próprias cópias).
const UNITS = [
    { key: "sentTeal", walkUrl: tealWalk, disabledUrl: tealDisabled, x: 540 },
    { key: "sentViolet", walkUrl: violetWalk, disabledUrl: violetDisabled, x: 740 }
];

const BATTLE_CONFIG = {
    name: "SENTINELAS",
    maxHp: 45,                       // pool combinado das duas → mais duro que o antigo 25.
    returnScene: "cap1-sentinela",
    defenseEnabled: false,           // turno delas é sempre bullet hell (os 3 padrões).
    dodgePatterns: ["spiral", "splitBounce", "touhouCross"],
    dodgeDuration: 6000,
    projectileInterval: 300,
    projectileSpeed: { min: 150, max: 210 },
    analysisLine: "DUPLA DE SENTINELAS — UNIDADES DE TREINO DA ELYSIUM.",
    combatants: [
        { key: "sentTeal", walkUrl: tealWalk, disabledUrl: tealDisabled, x: WIDTH / 2 - 95, y: 150, scale: 2.6 },
        { key: "sentViolet", walkUrl: violetWalk, disabledUrl: violetDisabled, x: WIDTH / 2 + 95, y: 150, scale: 2.6 }
    ]
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Duas sentinelas de treino — e elas atacam juntas. Vai ser mais puxado." },
    { speaker: "COSMO", text: "ATACAR usa a variável forca; REPROGRAMAR cria ou dobra a forca; ANALISAR dá dicas." },
    { speaker: "COSMO", text: "No turno delas, três padrões diferentes de tiro. Ache as brechas e desvie com WASD. [E] pra começar." }
];

const VICTORY_SCRIPT = [
    { speaker: "COSMO", text: "As duas no chão. O ENIAC é mais duro — mas a lógica é a mesma. Vamos." }
];

export default class SentinelaScene extends BaseRoomScene {
    constructor() {
        super("cap1-sentinela", {
            footer: "WASD mover   SHIFT correr   [E] interagir",
            nextScene: "cap1-seguranca",
            spawn: { x: 150, y: 470 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 656, y: 98 },
            ySort: true,
            bg: arquivosBg,
            bgKey: "bg-cap1-arquivos",
            map: arquivosMap
        });
    }

    preload() {
        super.preload();
        UNITS.forEach((u) => {
            if (!this.textures.exists(`${u.key}-walk`)) {
                this.load.spritesheet(`${u.key}-walk`, u.walkUrl, { frameWidth: 32, frameHeight: 32 });
            }
            if (!this.textures.exists(`${u.key}-disabled`)) {
                this.load.spritesheet(`${u.key}-disabled`, u.disabledUrl, { frameWidth: 32, frameHeight: 32 });
            }
        });
    }

    onRoomCreate() {
        this.defeated = false;
        this.units = UNITS.map((u) => this.createUnit(u));

        this.createChallengePrompt();

        // A BattleScene devolve o controle via scene.resume(..., { victory: true }).
        // `on` (não `once`): o menu de pausa também retoma a sala.
        const onResume = (_scene, data) => {
            if (data?.victory) {
                this.handleVictory();
            }
        };
        this.events.on("resume", onResume);
        this.events.once("shutdown", () => this.events.off("resume", onResume));

        this.playDialogue(ENTRY_SCRIPT);
    }

    createUnit(u) {
        const walkKey = `${u.key}-walk`;
        const disabledKey = `${u.key}-disabled`;
        if (!this.anims.exists(walkKey)) {
            this.anims.create({ key: walkKey, frames: this.anims.generateFrameNumbers(walkKey, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
        }
        if (!this.anims.exists(disabledKey)) {
            this.anims.create({ key: disabledKey, frames: this.anims.generateFrameNumbers(disabledKey, { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
        }
        const s = this.add.sprite(u.x, UNIT_Y, walkKey, 0).setScale(UNIT_SCALE).setDepth(UNIT_Y);
        s.play(walkKey);
        s.disabledKey = disabledKey;
        return s;
    }

    createChallengePrompt() {
        this.challengePrompt = this.add.text(PROMPT.x, PROMPT.y, "[E] TREINAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.tweens.add({
            targets: this.challengePrompt,
            y: PROMPT.y - 6,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.registerInteractable({
            x: PROMPT.x,
            y: UNIT_Y,
            radius: CHALLENGE_RADIUS,
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
        this.units.forEach((s) => {
            s.play(s.disabledKey);
            this.tweens.add({ targets: s, alpha: 0.75, duration: 500 });
        });
        this.setStatus("> SENTINELAS OFFLINE", "#51e36b");

        this.time.delayedCall(600, () => {
            this.playDialogue(VICTORY_SCRIPT, () => this.unlockDoor());
        });
    }
}
