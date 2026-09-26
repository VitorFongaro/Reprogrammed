import Phaser from "phaser";
import PlayerCharacter from "../../characters/PlayerCharacter";
import CosmoCompanion from "../../characters/CosmoCompanion";
import DialogueBox from "../../ui/DialogueBox";
import saguaoBg from "../../assets/images/saguao/saguao_bg.png";

// Capítulo 1, sala 6 — Saguão: cutscene de encerramento. As portas do elevador
// se abrem para o saguão da Elysium, diálogo de gancho para o capítulo 2 e o
// cartão "FIM DO CAPÍTULO 1" com o resumo das variáveis aprendidas; o
// ESPAÇO segue para a recepção do térreo (cap2-recepcao).

const WIDTH = 1280;
const HEIGHT = 720;
const FLOOR_Y = 560;

const SCRIPT = [
    { speaker: "COSMO", text: "O saguão da Elysium. Seu primeiro contato com o mundo lá de cima." },
    { speaker: "COSMO", text: "Limpo, silencioso, perfeito... É assim que a ADA gosta das coisas." },
    { speaker: "COSMO", text: "A partir daqui, cada andar é território dela. Descanse os circuitos — o próximo desafio vem aí." }
];

const SUMMARY_LINES = [
    "energia = 100",
    'nome = "Artemis"',
    "temperatura = 21.5",
    "travaMestra = false"
];

export default class SaguaoScene extends Phaser.Scene {
    constructor() {
        super("cap1-saguao");
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
        this.load.image("saguao-bg", saguaoBg);
    }

    create() {
        this.drawLobby();
        this.createAndroid();
        this.cosmo = new CosmoCompanion(this, { sprite: this.android, lastDirection: "south" });
        this.dialogue = new DialogueBox(this);

        this.openElevatorDoors(() => {
            this.dialogue.play(SCRIPT, () => this.showEndCard());
        });
    }

    update(time, delta) {
        this.cosmo.update(time, delta);
    }

    drawLobby() {
        this.cameras.main.setBackgroundColor("#050505");

        // Mapa do saguão (gerado no Aseprite; o emblema está acima das janelas).
        this.add.image(WIDTH / 2, HEIGHT / 2, "saguao-bg").setDepth(-10);

        // Letreiro da empresa sob o emblema.
        this.add.text(WIDTH / 2, 104, "E L Y S I U M", {
            fontFamily: "VCR",
            fontSize: "24px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setAlpha(0.85).setDepth(-9);

        this.add.text(WIDTH / 2, 128, "integração é evolução", {
            fontFamily: "VCR",
            fontSize: "14px",
            color: "#5b6178"
        }).setOrigin(0.5).setDepth(-9);

        // Scanlines.
        const scan = this.add.graphics();
        scan.setDepth(-4);
        scan.lineStyle(1, 0x000000, 0.35);
        for (let y = 0; y < HEIGHT; y += 4) {
            scan.lineBetween(0, y, WIDTH, y);
        }
    }

    createAndroid() {
        PlayerCharacter.createAnimations(this);
        this.android = this.add.sprite(WIDTH / 2, FLOOR_Y - 70, PlayerCharacter.idleTexture("south"), 0);
        this.android.setScale(3);
    }

    // Portas do elevador deslizam abrindo a visão do saguão.
    openElevatorDoors(onComplete) {
        const leftDoor = this.add.graphics().setDepth(900);
        leftDoor.fillStyle(0x0a0b12, 1);
        leftDoor.fillRect(-WIDTH / 2, 0, WIDTH / 2, HEIGHT);
        leftDoor.lineStyle(2, 0x3a3f55, 1);
        leftDoor.lineBetween(0, 0, 0, HEIGHT);
        leftDoor.x = WIDTH / 2;

        const rightDoor = this.add.graphics().setDepth(900);
        rightDoor.fillStyle(0x0a0b12, 1);
        rightDoor.fillRect(0, 0, WIDTH / 2, HEIGHT);
        rightDoor.lineStyle(2, 0x3a3f55, 1);
        rightDoor.lineBetween(0, 0, 0, HEIGHT);
        rightDoor.x = WIDTH / 2;

        this.time.delayedCall(600, () => {
            this.tweens.add({
                targets: leftDoor,
                x: 0,
                duration: 1100,
                ease: "Sine.easeInOut"
            });
            this.tweens.add({
                targets: rightDoor,
                x: WIDTH,
                duration: 1100,
                ease: "Sine.easeInOut",
                onComplete: () => {
                    leftDoor.destroy();
                    rightDoor.destroy();
                    onComplete();
                }
            });
        });
    }

    showEndCard() {
        const overlay = this.add.container(0, 0).setDepth(950).setAlpha(0);

        const backdrop = this.add.graphics();
        backdrop.fillStyle(0x000000, 0.82);
        backdrop.fillRect(0, 0, WIDTH, HEIGHT);
        overlay.add(backdrop);

        overlay.add(this.add.text(WIDTH / 2, 180, "FIM DO CAPÍTULO 1", {
            fontFamily: "VCR",
            fontSize: "48px",
            color: "#f7f7f7"
        }).setOrigin(0.5));

        overlay.add(this.add.text(WIDTH / 2, 240, "VARIÁVEIS — CONCLUÍDO", {
            fontFamily: "VCR",
            fontSize: "22px",
            color: "#51e36b"
        }).setOrigin(0.5));

        SUMMARY_LINES.forEach((line, index) => {
            const text = this.add.text(WIDTH / 2, 320 + index * 40, line, {
                fontFamily: "VCR",
                fontSize: "24px",
                color: "#4ad6ff"
            }).setOrigin(0.5).setAlpha(0);
            overlay.add(text);

            this.tweens.add({
                targets: text,
                alpha: 1,
                duration: 400,
                delay: 600 + index * 350
            });
        });

        const hint = this.add.text(WIDTH / 2, HEIGHT - 80, "[ESPAÇO] CONTINUAR", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#5b6178"
        }).setOrigin(0.5);
        overlay.add(hint);

        this.tweens.add({
            targets: hint,
            alpha: { from: 1, to: 0.25 },
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.tweens.add({ targets: overlay, alpha: 1, duration: 600 });

        this.time.delayedCall(800, () => {
            this.input.keyboard.once("keydown-SPACE", () => {
                this.cameras.main.fadeOut(700, 0, 0, 0);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    // O capítulo 2 começa na recepção do térreo, logo depois deste saguão.
                    this.scene.start("cap2-recepcao");
                });
            });
        });
    }
}
