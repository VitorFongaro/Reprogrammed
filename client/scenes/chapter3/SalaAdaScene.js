import Phaser from "phaser";
import BaseRoomScene from "../chapter1/BaseRoomScene";
import Effects from "../../ui/Effects";
import Sfx from "../../ui/Sfx";
import idleUrl from "../../assets/sprites/boss/ada/idle.png";
import castUrl from "../../assets/sprites/boss/ada/cast.png";
import hurtUrl from "../../assets/sprites/boss/ada/hurt.png";
import defeatUrl from "../../assets/sprites/boss/ada/defeat.png";

// Capítulo 3: sala de TESTE da ADA, a boss final do capítulo. Só para ver a
// arte no jogo: ela fica parada respirando e, de tempos em tempos, levanta a
// mão e solta um dos quatro ataques da ficha de personagem, em ciclo. Os
// ataques são só visuais (não ferem): aqui ainda não há luta. [H] mostra o dano e
// [J] a derrota (ela se curva, o halo estoura e ela some em glitch; volta sozinha).
//
//   JULGAMENTO — um círculo vermelho se fecha no chão sob a Artemis e cai um raio.
//   HEXÁGONOS  — seis hexágonos de energia surgem em volta dela e estouram.
//   FOICE      — uma meia-lua de energia varre a sala na direção da Artemis.
//   PILARES    — colunas de energia sobem pelo chão da arena, uma atrás da outra.
//
// Arte: PixelLab, a partir da ficha do GPT (ver docs/ASSETS.md). Os efeitos são
// os do pack de sempre (ui/Effects), tingidos de vermelho.
// Fora do fluxo: sem porta, sem save. Acesso: __game.scene.start("cap3-sala-ada").

const ADA_POS = { x: 640, y: 300 };
const SCALE = 2;
const IDLE_FRAME = 80;
const CAST_FRAME = 112;
const ATTACK_EVERY_MS = 4200;
const HURT_FRAME = 80;
const DEFEAT_FRAME = 112;
const REVIVE_MS = 2500;             // depois da derrota, ela volta para o teste continuar
const CAST_HAND_FRAME = 4;          // quadro do cast com a mão erguida: é quando o ataque sai
const RED = 0xff2a4a;
const RED_DIM = 0x8a1020;

const ATTACKS = ["julgamento", "hexagonos", "foice", "pilares"];
const LABELS = {
    julgamento: "> ADA :: JULGAMENTO",
    hexagonos: "> ADA :: HEXÁGONOS",
    foice: "> ADA :: FOICE DE ENERGIA",
    pilares: "> ADA :: PILARES"
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Sala de teste da ADA. Ela só vai mostrar os golpes, ainda não luta." },
    { speaker: "ADA", text: "Você não deveria ter chegado até aqui.", color: "#ff4565" }
];

export default class SalaAdaScene extends BaseRoomScene {
    constructor() {
        super("cap3-sala-ada", {
            title: "CAP. 3 :: SALA DE TESTE DA ADA",
            spawn: { x: 640, y: 600 },
            autoSave: false,
            itemDrops: false,
            music: null
        });
    }

    preload() {
        super.preload();
        Effects.preload(this);
        Sfx.preload(this);
        if (!this.textures.exists("ada-idle")) {
            this.load.spritesheet("ada-idle", idleUrl, { frameWidth: IDLE_FRAME, frameHeight: IDLE_FRAME });
        }
        if (!this.textures.exists("ada-cast")) {
            this.load.spritesheet("ada-cast", castUrl, { frameWidth: CAST_FRAME, frameHeight: CAST_FRAME });
        }
        if (!this.textures.exists("ada-hurt")) {
            this.load.spritesheet("ada-hurt", hurtUrl, { frameWidth: HURT_FRAME, frameHeight: HURT_FRAME });
        }
        if (!this.textures.exists("ada-defeat")) {
            this.load.spritesheet("ada-defeat", defeatUrl, { frameWidth: DEFEAT_FRAME, frameHeight: DEFEAT_FRAME });
        }
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        if (!this.anims.exists("ada-idle-s")) {
            // idle.png: linhas norte, sul, leste, oeste (4 quadros cada).
            this.anims.create({ key: "ada-idle-s", frames: this.anims.generateFrameNumbers("ada-idle", { start: 4, end: 7 }), frameRate: 4, repeat: -1 });
            // cast.png: linhas sul, leste, oeste (9 quadros cada).
            this.anims.create({ key: "ada-cast-s", frames: this.anims.generateFrameNumbers("ada-cast", { start: 0, end: 8 }), frameRate: 10, repeat: 0 });
            this.anims.create({ key: "ada-hurt-s", frames: this.anims.generateFrameNumbers("ada-hurt", { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
            this.anims.create({ key: "ada-defeat-s", frames: this.anims.generateFrameNumbers("ada-defeat", { start: 0, end: 8 }), frameRate: 8, repeat: 0 });
        }

        this.attackIndex = 0;
        this.floorFx = this.add.graphics().setDepth(-3);
        this.halo = this.add.ellipse(ADA_POS.x, ADA_POS.y + 66, 120, 34, RED, 0.18).setDepth(ADA_POS.y - 1);
        this.tweens.add({ targets: this.halo, alpha: 0.06, duration: 1200, yoyo: true, repeat: -1 });
        this.ada = this.add.sprite(ADA_POS.x, ADA_POS.y, "ada-idle", 4).setScale(SCALE).setDepth(ADA_POS.y + 60);
        this.ada.play("ada-idle-s");

        this.input.keyboard.on("keydown-H", () => this.hurt());
        this.input.keyboard.on("keydown-J", () => this.defeat());

        this.playDialogue(ENTRY_SCRIPT, () => {
            this.setStatus("> [H] DANO   [J] DERROTA", "#ff4565");
            this.attackTimer = this.time.addEvent({ delay: ATTACK_EVERY_MS, loop: true, callback: () => this.cast() });
            this.time.delayedCall(600, () => this.cast());
        });
    }

    // Levanta a mão (cast) e solta o próximo ataque do ciclo no quadro da mão erguida.
    cast() {
        if (this.busy || this.down) return;
        this.busy = true;
        const kind = ATTACKS[this.attackIndex % ATTACKS.length];
        this.attackIndex += 1;
        this.setStatus(LABELS[kind], "#ff4565");
        this.ada.play("ada-cast-s");
        this.time.delayedCall((CAST_HAND_FRAME / 10) * 1000, () => this[kind]());
        this.ada.once("animationcomplete", () => {
            this.ada.play("ada-idle-s");
            this.busy = false;
        });
    }

    // DANO: recua piscando branco.
    hurt() {
        if (this.busy || this.down) return;
        this.busy = true;
        this.ada.play("ada-hurt-s").setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        this.time.delayedCall(90, () => this.ada.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
        this.fx("fx-impact", ADA_POS.x, ADA_POS.y, { scale: 1.2 });
        this.cameras.main.shake(120, 0.004);
        Sfx.play(this, "bump", 0.7);
        this.ada.once("animationcomplete", () => {
            this.ada.play("ada-idle-s");
            this.busy = false;
        });
    }

    // DERROTA: ela se curva e o halo estoura (a animação); depois some em glitch
    // (pisca e desloca de lado, com faíscas) e, no teste, volta sozinha.
    defeat() {
        if (this.down) return;
        this.down = true;
        this.busy = true;
        this.tweens.killTweensOf(this.ada);
        this.ada.off("animationcomplete");     // um cast pela metade não pode trazê-la de volta ao idle
        this.setStatus("> ADA :: NÚCLEO DESLIGADO", "#ff4565");
        this.ada.play("ada-defeat-s");
        Sfx.play(this, "hack", 0.6);
        this.ada.once("animationcomplete", () => {
            const glitch = this.time.addEvent({
                delay: 70, repeat: 14, callback: () => {
                    this.ada.setX(ADA_POS.x + Phaser.Math.Between(-6, 6)).setAlpha(Math.random() < 0.5 ? 0.25 : 0.9);
                    if (Math.random() < 0.4) this.fx("fx-spark", ADA_POS.x + Phaser.Math.Between(-30, 30), ADA_POS.y + Phaser.Math.Between(-50, 50), { scale: 0.6 });
                }
            });
            this.time.delayedCall(70 * 15, () => {
                glitch.remove();
                this.ada.setVisible(false).setX(ADA_POS.x).setAlpha(1);
                this.halo.setVisible(false);
                this.time.delayedCall(REVIVE_MS, () => this.revive());
            });
        });
    }

    revive() {
        this.ada.setVisible(true).setAlpha(0).play("ada-idle-s");
        this.halo.setVisible(true);
        this.fx("fx-arrive", ADA_POS.x, ADA_POS.y - 10, { scale: 1.3 });
        this.tweens.add({ targets: this.ada, alpha: 1, duration: 500 });
        this.setStatus("> [H] DANO   [J] DERROTA", "#ff4565");
        this.down = false;
        this.busy = false;
    }

    fx(key, x, y, opts = {}) {
        return Effects.play(this, key, x, y, { depth: 830, ...opts }).setTint(RED);
    }

    // JULGAMENTO: anel no chão que se fecha onde a Artemis está; no fim, o raio.
    julgamento() {
        const x = this.player.sprite.x;
        const y = this.player.feetY;
        const ring = { r: 90 };
        Sfx.play(this, "hack", 0.5);
        this.tweens.add({
            targets: ring, r: 26, duration: 900, ease: "Quad.easeIn",
            onUpdate: () => {
                this.floorFx.clear()
                    .lineStyle(3, RED, 0.9).strokeEllipse(x, y, ring.r * 2, ring.r * 0.9)
                    .lineStyle(1, RED_DIM, 0.6).strokeEllipse(x, y, ring.r * 2.4, ring.r * 1.1);
            },
            onComplete: () => {
                this.floorFx.clear();
                this.fx("fx-lightning", x, y - 50, { scale: 1.4 });
                this.fx("fx-burst", x, y, { scale: 1.2, depth: y + 1 });
                this.cameras.main.shake(140, 0.004);
                Sfx.play(this, "bump", 0.8);
            }
        });
    }

    // HEXÁGONOS: seis hexágonos de energia em volta dela, que giram e estouram.
    hexagonos() {
        const hexes = [];
        for (let k = 0; k < 6; k += 1) {
            const g = this.add.graphics().setDepth(830);
            hexes.push({ g, a: (k / 6) * Math.PI * 2 });
        }
        const state = { t: 0 };
        Sfx.play(this, "laser", 0.4);
        this.tweens.add({
            targets: state, t: 1, duration: 1100, ease: "Sine.easeInOut",
            onUpdate: () => hexes.forEach((h) => {
                const a = h.a + state.t * Math.PI * 0.6;
                const r = 60 + state.t * 70;
                const cx = ADA_POS.x + Math.cos(a) * r;
                const cy = ADA_POS.y + 10 + Math.sin(a) * r * 0.7;
                h.cx = cx; h.cy = cy;
                const pts = [];
                for (let i = 0; i < 6; i += 1) {
                    const b = (i / 6) * Math.PI * 2;
                    pts.push(new Phaser.Math.Vector2(cx + Math.cos(b) * 16, cy + Math.sin(b) * 16));
                }
                h.g.clear().fillStyle(RED, 0.18).fillPoints(pts, true).lineStyle(2, RED, 1).strokePoints(pts, true)
                    .fillStyle(0xffffff, 0.9).fillCircle(cx, cy, 2.5);
            }),
            onComplete: () => hexes.forEach((h, i) => this.time.delayedCall(i * 70, () => {
                h.g.destroy();
                this.fx("fx-explosion", h.cx, h.cy, { scale: 1.2 });
                Sfx.play(this, "gun", 0.25);
            }))
        });
    }

    // FOICE: meia-lua de energia que sai dela e varre a sala até a Artemis e além.
    foice() {
        const aim = Phaser.Math.Angle.Between(ADA_POS.x, ADA_POS.y, this.player.sprite.x, this.player.sprite.y);
        const g = this.add.graphics().setDepth(830);
        const s = { d: 30 };
        this.fx("fx-impact", ADA_POS.x + Math.cos(aim) * 40, ADA_POS.y + Math.sin(aim) * 40, { scale: 1.3, angle: Phaser.Math.RadToDeg(aim) + 90 });
        Sfx.play(this, "laser", 0.6);
        this.tweens.add({
            targets: s, d: 900, duration: 1000, ease: "Quad.easeIn",
            onUpdate: () => {
                const cx = ADA_POS.x + Math.cos(aim) * s.d;
                const cy = ADA_POS.y + Math.sin(aim) * s.d;
                g.clear();
                [[46, 10, 0.35], [40, 5, 1]].forEach(([r, w, alpha]) => {
                    g.lineStyle(w, alpha === 1 ? 0xffd6de : RED, alpha)
                        .beginPath().arc(cx, cy, r, aim - 1.1, aim + 1.1).strokePath();
                });
            },
            onComplete: () => g.destroy()
        });
    }

    // PILARES: colunas de energia que sobem em fila pelo chão, da ADA para fora.
    pilares() {
        const spots = [];
        for (let ring = 1; ring <= 3; ring += 1) {
            for (let k = 0; k < 4 + ring * 2; k += 1) {
                const a = (k / (4 + ring * 2)) * Math.PI * 2 + ring * 0.4;
                spots.push({
                    x: ADA_POS.x + Math.cos(a) * ring * 120,
                    y: ADA_POS.y + 60 + Math.sin(a) * ring * 70,
                    delay: ring * 260
                });
            }
        }
        spots.forEach(({ x, y, delay }) => {
            if (y < 150 || y > 660) return;
            this.time.delayedCall(delay, () => {
                const mark = this.add.ellipse(x, y, 40, 14, RED, 0.5).setDepth(-2);
                this.time.delayedCall(320, () => {
                    mark.destroy();
                    this.fx("fx-lightning", x, y - 50, { scale: 1.1 });
                });
            });
        });
        this.time.delayedCall(900, () => {
            this.cameras.main.shake(200, 0.003);
            Sfx.play(this, "bump", 0.7);
        });
    }
}
