import BaseRoomScene from "./BaseRoomScene";
import Enemy from "../../characters/Enemy";
import arquivosBg from "../../assets/images/arquivos/arquivos_bg.png";
import arquivosMap from "../../assets/maps/arquivos.json";

// Capítulo 1, sala 2 — Sala de arquivos, agora o TUTORIAL da reprogramação
// remota ([R]). Uma unidade de segurança (mech biped) fica trancada atrás de uma
// barreira de laser IMPASSÁVEL: a Artemis não chega perto para golpear/reprogramar
// de perto, então precisa apertar [R] (tempo desacelerado), mirar com o mouse e
// reprogramar À DISTÂNCIA — desviando das bolas de energia que o robô solta. Ao
// ser desligado, o próprio robô revela o nome dela ("Artemis... você nos traiu"),
// a barreira cai e a porta abre. É aqui que o jogo também introduz a ideia de
// variável: o nome é um valor de texto (nome = "Artemis").

const BARRIER_X = 740;
const BARRIER_W = 16;

// O feixe vai da BASE DA PAREDE até o FIM DO PISO, não dos bounds do jogador —
// os bounds param antes da borda do mapa e deixavam o emissor de baixo boiando.
// Fundo de 1280x704 centralizado no canvas de 720: parede acaba em 128 e o piso
// em 672, ambos +8 do offset do mapa.
const BARRIER_TOP = 136;
const BARRIER_BOTTOM = 680;
const BARRIER_H = BARRIER_BOTTOM - BARRIER_TOP;
const BARRIER_CY = BARRIER_TOP + BARRIER_H / 2;
const ROBOT = { x: 1000, y: 470 };

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "A sala de arquivos. E um problema: aquela unidade de segurança trancou tudo." },
    { speaker: "COSMO", text: "Ela está atrás de uma barreira de laser. Chegar perto pra desativar? Nem pensar." },
    { speaker: "COSMO", text: "Mas você não precisa chegar perto. Aperte [R] para desacelerar o tempo." },
    { speaker: "COSMO", text: "No tempo lento, mire nela com o mouse e clique para reprogramar à distância." },
    { speaker: "COSMO", text: "Ela vai revidar — desvie do ataque e desligue o sistema dela. Vai." }
];

export default class SalaArquivosScene extends BaseRoomScene {
    constructor() {
        super("cap1-arquivos", {
            nextScene: "cap1-controle",
            spawn: { x: 150, y: 450 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 656, y: 98 },
            ySort: true,
            combat: true,
            bg: arquivosBg,
            map: arquivosMap
        });
    }

    preload() {
        super.preload();
        Enemy.preload(this);
    }

    onRoomCreate() {
        this.robotDefeated = false;

        this.createBarrier();

        // Guardião parado (só faz o slam soltando bolas de energia): não persegue,
        // não sai do lugar — a barreira já garante que ele fica inalcançável.
        this.robot = new Enemy(this, ROBOT.x, ROBOT.y, {
            type: "biped",
            // Guardião-tutorial: resiste a 3 estágios de reprogramação antes de cair.
            overrides: { wander: false, speed: 0, slamMs: 3200, reprogramStages: 3 }
        });

        this.playDialogue(ENTRY_SCRIPT);
    }

    onRoomUpdate() {
        if (this.robotDefeated) {
            return;
        }
        if (this.robot?.disabled) {
            this.robotDefeated = true;
            this.handleRobotDefeated();
        }
    }

    // --- Barreira de laser (parede sólida + feixe) ---
    createBarrier() {
        this.barrierOn = true;

        // Emissores no topo e na base do feixe.
        this.barrierEmitters = this.add.graphics().setDepth(701);
        this.drawEmitters(0xff4545);

        // Feixe: glow largo + núcleo fino, ambos pulsando.
        this.barrierGlow = this.add.rectangle(BARRIER_X, BARRIER_CY, 16, BARRIER_H, 0xff4545, 0.22).setDepth(700);
        this.barrierCore = this.add.rectangle(BARRIER_X, BARRIER_CY, 4, BARRIER_H, 0xff4545, 1).setDepth(700);
        this.tweens.add({ targets: this.barrierCore, alpha: { from: 0.8, to: 1 }, duration: 480, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: this.barrierGlow, alpha: { from: 0.14, to: 0.3 }, duration: 480, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

        // Parede sólida: a Artemis não atravessa (colisor só contra ela; as bolas
        // de energia do robô passam livres para poderem alcançá-la).
        this.barrierZone = this.add.zone(BARRIER_X, BARRIER_CY, BARRIER_W, BARRIER_H);
        this.physics.add.existing(this.barrierZone, true);
        this.barrierCollider = this.physics.add.collider(this.player.sprite, this.barrierZone);
    }

    drawEmitters(color) {
        // Emissores encostados: o de cima na base da parede, o de baixo no fim
        // do piso, cada um mordendo a ponta do feixe.
        this.barrierEmitters.clear();
        this.barrierEmitters.fillStyle(color, 1);
        this.barrierEmitters.fillRect(BARRIER_X - 10, BARRIER_TOP - 8, 20, 14);
        this.barrierEmitters.fillRect(BARRIER_X - 10, BARRIER_BOTTOM - 6, 20, 14);
    }

    dropBarrier() {
        if (!this.barrierOn) {
            return;
        }
        this.barrierOn = false;
        this.barrierCollider?.destroy();
        this.barrierCollider = null;
        this.tweens.killTweensOf(this.barrierCore);
        this.tweens.killTweensOf(this.barrierGlow);
        this.drawEmitters(0x3a3f55);
        this.tweens.add({
            targets: [this.barrierCore, this.barrierGlow],
            alpha: 0,
            duration: 400,
            onComplete: () => {
                this.barrierCore?.destroy();
                this.barrierGlow?.destroy();
            }
        });
    }

    // --- Robô desligado: revela o nome, derruba a barreira, abre a porta ---
    handleRobotDefeated() {
        // Sem texto de status: ele é desenhado no topo da tela, bem em cima da
        // porta. O retorno vem da barreira caindo, da fala do robô e da luz da
        // porta virando verde.
        this.dropBarrier();
        this.time.delayedCall(600, () => {
            this.playDialogue(this.revealScript(), () => this.unlockDoor());
        });
    }

    revealScript() {
        return [
            { speaker: "SEGURANÇA", text: "Unidade... A-7724...", color: "#ff6b6b" },
            {
                speaker: "SEGURANÇA",
                text: "Artemis... você nos traiu...",
                color: "#ff6b6b",
                onEnter: () => this.flashPlayer()
            },
            { speaker: "COSMO", text: '"Artemis". Foi como ela te chamou. Acho que é o seu nome.' },
            { speaker: "COSMO", text: 'Um nome é só um valor de texto — guardado entre aspas: nome = "Artemis".' },
            { speaker: "COSMO", text: "Vamos, Artemis. O controle ambiental fica adiante." }
        ];
    }

    flashPlayer() {
        this.tweens.add({
            targets: this.player.sprite,
            alpha: { from: 1, to: 0.2 },
            duration: 80,
            yoyo: true,
            repeat: 4,
            onComplete: () => this.player.sprite.setAlpha(1)
        });
    }
}
