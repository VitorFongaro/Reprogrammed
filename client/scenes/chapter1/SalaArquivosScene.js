import BaseRoomScene from "./BaseRoomScene";
import Enemy from "../../characters/Enemy";
import arquivosBg from "../../assets/images/arquivos/arquivos_bg.png";
import arquivosMap from "../../assets/maps/arquivos.json";
import laserUrl from "../../assets/sprites/laser/laser.png";

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

// Feixe do pack sci-fi (CC0, ver CREDITOS.txt): 2 quadros de 16x32 que empilham
// na vertical. Escala 2 para casar com a densidade dos props (ver AGENTS.md).
const BEAM_W = 16;
const BEAM_H = 32;
const BEAM_SCALE = 2;
const BEAM_STEP = BEAM_H * BEAM_SCALE;
const BEAM_TINT = 0xff4545;
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
            footer: "WASD mover   [R] reprogramação remota",
            spawn: { x: 150, y: 450 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 656, y: 98 },
            ySort: true,
            hp: 18,
            bg: arquivosBg,
            map: arquivosMap
        });
    }

    preload() {
        super.preload();
        Enemy.preload(this);

        if (!this.textures.exists("laser-feixe")) {
            this.load.spritesheet("laser-feixe", laserUrl, {
                frameWidth: BEAM_W,
                frameHeight: BEAM_H
            });
        }
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
        const { y, h } = this.bounds;
        const cy = y + h / 2;
        this.barrierOn = true;

        // Emissores no topo e na base do feixe.
        this.barrierEmitters = this.add.graphics().setDepth(701);
        this.drawEmitters(0xff4545);

        // Feixe: coluna de sprites empilhados, todos na mesma animação.
        if (!this.anims.exists("laser-feixe-anim")) {
            this.anims.create({
                key: "laser-feixe-anim",
                frames: this.anims.generateFrameNumbers("laser-feixe", { start: 0, end: 1 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // Só quadros inteiros: a sobra (menos de um quadro) fica escondida sob
        // os emissores, em vez de esticar o último e deformar o padrão.
        const tiles = Math.floor(h / BEAM_STEP);
        const top = cy - (tiles * BEAM_STEP) / 2;
        this.barrierBeams = [];

        for (let i = 0; i < tiles; i += 1) {
            const beam = this.add.sprite(BARRIER_X, top + i * BEAM_STEP + BEAM_STEP / 2, "laser-feixe")
                .setScale(BEAM_SCALE)
                .setTint(BEAM_TINT)
                .setDepth(700);
            beam.play({ key: "laser-feixe-anim", startFrame: i % 2 });
            this.barrierBeams.push(beam);
        }

        // Parede sólida: a Artemis não atravessa (colisor só contra ela; as bolas
        // de energia do robô passam livres para poderem alcançá-la).
        this.barrierZone = this.add.zone(BARRIER_X, cy, BARRIER_W, h);
        this.physics.add.existing(this.barrierZone, true);
        this.barrierCollider = this.physics.add.collider(this.player.sprite, this.barrierZone);
    }

    drawEmitters(color) {
        const { y, h } = this.bounds;
        this.barrierEmitters.clear();
        this.barrierEmitters.fillStyle(color, 1);
        this.barrierEmitters.fillRect(BARRIER_X - 12, y - 4, 24, 20);
        this.barrierEmitters.fillRect(BARRIER_X - 12, y + h - 16, 24, 20);
    }

    dropBarrier() {
        if (!this.barrierOn) {
            return;
        }
        this.barrierOn = false;
        this.barrierCollider?.destroy();
        this.barrierCollider = null;
        this.drawEmitters(0x3a3f55);
        this.tweens.add({
            targets: this.barrierBeams,
            alpha: 0,
            duration: 400,
            onComplete: () => {
                this.barrierBeams.forEach((beam) => beam.destroy());
                this.barrierBeams = [];
            }
        });
    }

    // --- Robô desligado: revela o nome, derruba a barreira, abre a porta ---
    handleRobotDefeated() {
        this.dropBarrier();
        this.setStatus("> UNIDADE DE SEGURANÇA DESATIVADA", "#51e36b");
        this.time.delayedCall(600, () => {
            this.playDialogue(this.revealScript(), () => {
                this.setStatus('> nome = "Artemis"', "#51e36b");
                this.unlockDoor();
            });
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
