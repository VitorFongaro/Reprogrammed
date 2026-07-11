import Phaser from "phaser";
import PlayerCharacter from "../../characters/PlayerCharacter";
import CosmoCompanion from "../../characters/CosmoCompanion";
import DialogueBox from "../../ui/DialogueBox";

// Cena-base das salas do capítulo 1: desenha a sala (grade + título + rodapé),
// cria jogador/Cosmo/diálogo, gerencia interagíveis ([E] no mais próximo) e a
// porta de saída na parede direita (trancada até `unlockDoor()`).

const WIDTH = 1280;
const HEIGHT = 720;

const DEFAULT_BOUNDS = { x: 48, y: 96, w: WIDTH - 96, h: HEIGHT - 144 };
const DOOR_W = 16;
const DOOR_H = 110;
const DOOR_RADIUS = 120;

export default class BaseRoomScene extends Phaser.Scene {
    constructor(key, config = {}) {
        super(key);
        this.roomTitle = config.title ?? "";
        this.footerHint = config.footer ?? "WASD MOVE  |  E INTERAGE  |  ESPAÇO AVANÇA DIÁLOGO";
        this.nextSceneKey = config.nextScene ?? null;
        this.spawn = config.spawn ?? { x: 180, y: HEIGHT / 2 };
        this.doorLabel = config.doorLabel ?? "[E] SEGUIR";
        this.bounds = config.bounds ?? DEFAULT_BOUNDS;
        // Porta customizada ({ x, y }) para salas cuja porta já está desenhada na
        // arte do mapa: o código só renderiza a luz da fechadura e o prompt.
        this.doorPos = config.door ?? null;
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
    }

    create() {
        this.interactables = [];
        this.doorUnlocked = false;
        this.transitioning = false;

        this.drawRoom();
        this.createDoor();

        this.player = new PlayerCharacter(this, this.spawn.x, this.spawn.y);
        this.cosmo = new CosmoCompanion(this, this.player);
        this.dialogue = new DialogueBox(this);

        this.input.keyboard.on("keydown-E", () => this.tryInteract());

        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.onRoomCreate();
    }

    update(time, delta) {
        this.player.update();
        this.cosmo.update(time, delta);
        this.updatePrompts();
        this.onRoomUpdate(time, delta);
    }

    // Pontos de extensão para as salas.
    onRoomCreate() {}
    onRoomUpdate() {}

    // --- Interagíveis ---
    registerInteractable(item) {
        this.interactables.push(item);
        return item;
    }

    // Colisores estáticos invisíveis para objetos desenhados na arte do mapa.
    // Recebe retângulos { x, y, w, h } (canto superior esquerdo, em px de tela).
    addColliders(rects) {
        rects.forEach(({ x, y, w, h }) => {
            const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
            this.physics.add.existing(zone, true);
            this.physics.add.collider(this.player.sprite, zone);
        });
    }

    // Colisores vindos de um mapa do Tiled (camada de objetos com retângulos).
    // Edite o .json no Tiled; `offset` converte coordenadas do mapa para a tela.
    addCollidersFromTiled(mapData, layerName = "colisao", offset = { x: 0, y: 0 }) {
        const layer = mapData.layers?.find(
            (candidate) => candidate.type === "objectgroup" && candidate.name === layerName
        );

        if (!layer) {
            console.warn(`Camada de objetos "${layerName}" não encontrada no mapa Tiled.`);
            return;
        }

        this.addColliders(layer.objects.map((object) => ({
            x: object.x + offset.x,
            y: object.y + offset.y,
            w: object.width,
            h: object.height
        })));
    }

    tryInteract() {
        if (!this.player.enabled || this.transitioning) {
            return;
        }

        const target = this.nearestAvailable();
        target?.onInteract();
    }

    nearestAvailable() {
        let best = null;
        let bestDistance = Infinity;

        this.interactables.forEach((item) => {
            if (!item.isAvailable()) {
                return;
            }

            const distance = Phaser.Math.Distance.Between(
                this.player.sprite.x, this.player.sprite.y, item.x, item.y
            );

            if (distance <= item.radius && distance < bestDistance) {
                best = item;
                bestDistance = distance;
            }
        });

        return best;
    }

    updatePrompts() {
        const nearest = this.player.enabled && !this.transitioning ? this.nearestAvailable() : null;
        this.interactables.forEach((item) => {
            item.promptObj?.setVisible(item === nearest);
        });
    }

    // --- Diálogo (desabilita o jogador enquanto fala) ---
    playDialogue(script, onComplete) {
        this.player.setEnabled(false);
        this.dialogue.play(script, () => {
            if (!this.transitioning) {
                this.player.setEnabled(true);
            }
            onComplete?.();
        });
    }

    // --- Porta de saída (parede direita) ---
    createDoor() {
        if (!this.nextSceneKey) {
            return;
        }

        if (this.doorPos) {
            this.doorX = this.doorPos.x;
            this.doorY = this.doorPos.y;
        } else {
            const { x, y, w, h } = this.bounds;
            this.doorX = x + w;
            this.doorY = y + h / 2;
        }

        this.doorGraphics = this.add.graphics();
        this.drawDoor();

        const promptX = this.doorPos ? this.doorX : this.doorX - 40;
        const promptY = this.doorPos ? this.doorY + 54 : this.doorY - DOOR_H / 2 - 28;
        this.doorPrompt = this.add.text(promptX, promptY, this.doorLabel, {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setVisible(false);

        this.registerInteractable({
            x: this.doorX,
            y: this.doorY,
            radius: DOOR_RADIUS,
            promptObj: this.doorPrompt,
            isAvailable: () => this.doorUnlocked,
            onInteract: () => this.goNext()
        });
    }

    drawDoor() {
        const color = this.doorUnlocked ? 0x51e36b : 0xff4545;

        this.doorGraphics.clear();

        // Porta na arte do mapa: só a luz da fechadura.
        if (!this.doorPos) {
            const top = this.doorY - DOOR_H / 2;
            this.doorGraphics.fillStyle(0x0c0d14, 1);
            this.doorGraphics.fillRect(this.doorX - DOOR_W / 2, top, DOOR_W, DOOR_H);
            this.doorGraphics.lineStyle(2, color, 0.9);
            this.doorGraphics.strokeRect(this.doorX - DOOR_W / 2, top, DOOR_W, DOOR_H);
        }

        // Luz da fechadura.
        this.doorGraphics.fillStyle(color, 1);
        this.doorGraphics.fillCircle(this.doorX, this.doorY, 5);
        this.doorGraphics.fillStyle(color, 0.25);
        this.doorGraphics.fillCircle(this.doorX, this.doorY, 10);
    }

    unlockDoor() {
        if (this.doorUnlocked || !this.doorGraphics) {
            return;
        }
        this.doorUnlocked = true;
        this.drawDoor();
    }

    goNext() {
        if (this.transitioning || !this.nextSceneKey) {
            return;
        }

        this.transitioning = true;
        this.player.setEnabled(false);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start(this.nextSceneKey);
        });
    }

    // --- Cenário base ---
    drawRoom() {
        const { x, y, w, h } = this.bounds;

        this.cameras.main.setBackgroundColor("#050505");
        this.physics.world.setBounds(x, y, w, h);

        this.drawBackdrop();
        this.drawHud();
    }

    // Cenário padrão (grade); salas com mapa em imagem sobrescrevem este método.
    drawBackdrop() {
        const { x, y, w, h } = this.bounds;

        const background = this.add.graphics();
        background.setDepth(-10);
        background.fillStyle(0x050505, 1);
        background.fillRect(0, 0, WIDTH, HEIGHT);

        background.lineStyle(2, 0xf7f7f7, 0.42);
        background.strokeRect(x, y, w, h);

        background.lineStyle(1, 0x2a2a2a, 0.82);
        for (let gy = y; gy <= y + h; gy += 30) {
            background.lineBetween(x, gy, x + w, gy);
        }
        for (let gx = x; gx <= x + w; gx += 30) {
            background.lineBetween(gx, y, gx, y + h);
        }
    }

    drawHud() {
        if (this.roomTitle) {
            this.add.text(WIDTH / 2, 44, this.roomTitle, {
                fontFamily: "VCR",
                fontSize: "34px",
                color: "#f7f7f7",
                align: "center"
            }).setOrigin(0.5);
        }

        this.statusText = this.add.text(WIDTH / 2, 78, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#7a8099",
            align: "center"
        }).setOrigin(0.5);

        if (this.footerHint) {
            this.add.text(WIDTH / 2, HEIGHT - 28, this.footerHint, {
                fontFamily: "VCR",
                fontSize: "20px",
                color: "#d9d9d9",
                align: "center"
            }).setOrigin(0.5);
        }
    }

    setStatus(text, color = "#7a8099") {
        this.statusText.setText(text).setColor(color);
    }
}
