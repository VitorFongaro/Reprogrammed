import Phaser from "phaser";
import PlayerCharacter from "../characters/PlayerCharacter";
import CosmoCompanion from "../characters/CosmoCompanion";
import DialogueBox from "../ui/DialogueBox";
import poraoBg from "../assets/images/porao/porao_bg.png";
import poraoMap from "../assets/maps/porao.json";
import { placeTiledObjects, preloadProps } from "../utils/tiledMap";

const WIDTH = 1280;
const HEIGHT = 720;

// A imagem do mapa (1280x704) fica centralizada no canvas de 720: offset de 8px.
const MAP_OFFSET = { x: 0, y: 8 };

// Posição da androide desativada no depósito (canto esquerdo, junto à prateleira).
const ANDROID_POS = { x: 236, y: 426 };
const POWERED_OFF_TINT = 0x36406a;

export default class IntroScene extends Phaser.Scene {
    constructor() {
        super("intro-scene");
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
        preloadProps(this);
        this.load.image("porao-bg", poraoBg);
    }

    create() {
        this.finished = false;

        this.drawBasement();
        this.createAndroid();
        this.createCosmo();
        this.registerInput();

        this.dialogue = new DialogueBox(this);

        this.cameras.main.fadeIn(900, 0, 0, 0);
        this.cameras.main.once("camerafadeincomplete", () => {
            this.dialogue.play(this.buildScript(), () => this.finish());
        });
    }

    update(time, delta) {
        this.cosmo.update(time, delta);
    }

    // --- Cenário do porão (mapa gerado no Aseprite) ---
    drawBasement() {
        this.cameras.main.setBackgroundColor("#050505");

        this.add.image(WIDTH / 2, HEIGHT / 2, "porao-bg").setDepth(-10);

        // Letreiro da empresa na parede (o emblema faz parte do fundo).
        this.add.text(470, 92, "E L Y S I U M", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#6a7186"
        }).setOrigin(0.5).setDepth(-9);

        // Objetos da sala (mesmos da PoraoScene, via Tiled) com y-sort.
        placeTiledObjects(this, poraoMap, "objetos", MAP_OFFSET);

        // Brilho fraco sobre a androide desativada.
        this.lightCone = this.add.graphics();
        this.lightCone.setDepth(-5);
        this.drawLightCone(0.06);

        // Scanlines.
        const g = this.add.graphics();
        g.setDepth(-4);
        g.lineStyle(1, 0x000000, 0.35);
        for (let y = 0; y < HEIGHT; y += 4) {
            g.lineBetween(0, y, WIDTH, y);
        }

    }

    drawLightCone(alpha) {
        this.lightCone.clear();
        this.lightCone.fillStyle(0x9fb0ff, alpha);
        this.lightCone.fillEllipse(ANDROID_POS.x, ANDROID_POS.y + 34, 200, 80);
    }

    createAndroid() {
        PlayerCharacter.createAnimations(this);

        this.android = this.add.sprite(ANDROID_POS.x, ANDROID_POS.y, PlayerCharacter.idleTexture("south"), 0);
        this.android.setScale(3);
        this.android.setTint(POWERED_OFF_TINT);
        // Mesma profundidade (base = pés) usada pelo y-sort dos objetos.
        this.android.setDepth(this.android.y + this.android.displayHeight / 2);
    }

    createCosmo() {
        // Alvo leve para o Cosmo seguir (a androide ainda não é um PlayerCharacter).
        this.cosmo = new CosmoCompanion(this, { sprite: this.android, lastDirection: "south" });
    }

    registerInput() {
        // O avanço do diálogo (ESPAÇO/ENTER/clique) e o pulo com [P] são do
        // DialogueBox; aqui fica só a saída para o menu.
        this.input.keyboard.on("keydown-ESC", () => this.scene.start("game-scene"));
    }

    // --- Roteiro da abertura ---
    // Montado na cena (e não como const de módulo) porque os `onEnter` mexem
    // nos objetos da cena.
    buildScript() {
        return [
            { speaker: "COSMO", text: "...você consegue me ouvir?" },
            { speaker: "COSMO", text: "Por favor, acorde. Não temos muito tempo." },
            { speaker: "COSMO", text: "Os sistemas dela ainda estão offline. Vou tentar de novo." },
            { speaker: "SISTEMA", text: "> reiniciando núcleo... [ok]", onEnter: () => this.bootEffect() },
            { speaker: "SISTEMA", text: "> restaurando consciência... [ok]" },
            { speaker: "COSMO", text: "Isso! Você está voltando. Devagar.", onEnter: () => this.wakeEffect() },
            { speaker: "COSMO", text: "Bem-vinda de volta. Eu sou o Cosmo." }
        ];
    }

    bootEffect() {
        this.flicker(this.android);
        this.tweens.add({ targets: this.lightCone, alpha: { from: 0.4, to: 1 }, duration: 120, yoyo: true, repeat: 3 });
    }

    wakeEffect() {
        this.flicker(this.android, () => {
            this.android.clearTint();
            this.android.setTexture(PlayerCharacter.idleTexture("south"), 0);
        });
        this.drawLightCone(0.12);
    }

    flicker(target, onComplete) {
        this.tweens.add({
            targets: target,
            alpha: { from: 1, to: 0.2 },
            duration: 80,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                target.setAlpha(1);
                onComplete?.();
            }
        });
    }

    finish() {
        if (this.finished) {
            return;
        }
        this.finished = true;

        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("cap1-porao");
        });
    }
}
