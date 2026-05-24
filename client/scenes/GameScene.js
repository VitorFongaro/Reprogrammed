import Phaser from "phaser";

const WIDTH = 1280;
const HEIGHT = 720;
const CARD_WIDTH = 178;
const CARD_HEIGHT = 220;
const LOWER_DIVIDER_Y = 470;
const DROP_ZONE = {
    x: WIDTH / 2,
    y: 295,
    width: 280,
    height: 258
};

const MENU_ITEMS = [
    {
        id: "start",
        label: "INICIAR",
        icon: "play",
        accent: 0xdadf97,
        executeText: "CARREGANDO JOGO..."
    },
    {
        id: "options",
        label: "OPÇÕES",
        icon: "gear",
        accent: 0x86d8c7,
        executeText: "ABRINDO OPÇÕES..."
    },
    {
        id: "exit",
        label: "SAIR",
        icon: "exit",
        accent: 0xd84b4b,
        executeText: "ENCERRANDO SESSAO..."
    }
];

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("game-scene");
    }

    create() {
        this.cards = [];
        this.activeCard = null;

        this.drawBackground();
        this.drawDropZone();
        this.drawMenuCards();
        this.drawStatusPanel();
        this.registerDragEvents();
    }

    drawBackground() {
        this.cameras.main.setBackgroundColor("#172f31");

        const background = this.add.graphics();
        background.fillStyle(0x172f31, 1);
        background.fillRect(0, 0, WIDTH, HEIGHT);

        background.lineStyle(2, 0xb8f5e8, 0.45);
        background.lineBetween(0, 86, WIDTH, 86);
        background.lineBetween(0, LOWER_DIVIDER_Y, WIDTH, LOWER_DIVIDER_Y);

        background.lineStyle(1, 0x0f2224, 0.85);
        for (let y = 0; y < HEIGHT; y += 8) {
            background.lineBetween(0, y, WIDTH, y);
        }

        background.lineStyle(1, 0xffffff, 0.05);
        for (let x = 0; x < WIDTH; x += 16) {
            background.lineBetween(x, 0, x, HEIGHT);
        }

        this.add.text(WIDTH / 2, 44, "- MENU -", {
            fontFamily: "VCR",
            fontSize: "34px",
            color: "#e7ebb2",
            align: "center"
        }).setOrigin(0.5);

    }

    drawDropZone() {
        this.dropZoneGraphic = this.add.graphics();
        this.renderDropZone(false);

        this.dropText = this.add.text(DROP_ZONE.x, DROP_ZONE.y + DROP_ZONE.height / 2 + 21, "EXECUTAR", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#9edfd2"
        }).setOrigin(0.5);
    }

    renderDropZone(isArmed) {
        this.dropZoneGraphic.clear();
        this.dropZoneGraphic.lineStyle(3, isArmed ? 0xe7ebb2 : 0x9edfd2, isArmed ? 1 : 0.65);
        this.dropZoneGraphic.strokeRect(
            DROP_ZONE.x - DROP_ZONE.width / 2,
            DROP_ZONE.y - DROP_ZONE.height / 2,
            DROP_ZONE.width,
            DROP_ZONE.height
        );

        this.dropZoneGraphic.fillStyle(isArmed ? 0xe7ebb2 : 0x9edfd2, isArmed ? 0.13 : 0.055);
        this.dropZoneGraphic.fillRect(
            DROP_ZONE.x - DROP_ZONE.width / 2 + 10,
            DROP_ZONE.y - DROP_ZONE.height / 2 + 10,
            DROP_ZONE.width - 20,
            DROP_ZONE.height - 20
        );

        this.dropZoneGraphic.lineStyle(2, 0x061012, 0.9);
        this.dropZoneGraphic.strokeRect(
            DROP_ZONE.x - DROP_ZONE.width / 2 + 16,
            DROP_ZONE.y - DROP_ZONE.height / 2 + 16,
            DROP_ZONE.width - 32,
            DROP_ZONE.height - 32
        );
    }

    drawMenuCards() {
        const spacing = 228;
        const startX = WIDTH / 2 - spacing;
        const y = 592;

        MENU_ITEMS.forEach((item, index) => {
            const card = this.createCard(startX + spacing * index, y, item);
            this.cards.push(card);
        });
    }

    createCard(x, y, item) {
        const card = this.add.container(x, y);
        card.setSize(CARD_WIDTH, CARD_HEIGHT);
        card.originalX = x;
        card.originalY = y;
        card.floatDelay = Phaser.Math.Between(0, 700);
        card.floatX = Phaser.Math.Between(-8, 8);
        card.floatY = Phaser.Math.Between(-8, 8);
        card.item = item;

        const shadow = this.add.rectangle(10, 12, CARD_WIDTH, CARD_HEIGHT, 0x061012, 0.7).setOrigin(0.5);
        const outer = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, item.accent, 1).setOrigin(0.5);
        const inner = this.add.rectangle(0, 0, CARD_WIDTH - 14, CARD_HEIGHT - 14, 0x182426, 1).setOrigin(0.5);
        const face = this.add.rectangle(0, -16, CARD_WIDTH - 36, CARD_HEIGHT - 72, 0x11181c, 1).setOrigin(0.5);

        const label = this.add.text(0, 82, item.label, {
            fontFamily: "VCR",
            fontSize: "25px",
            color: "#eef3b8",
            align: "center"
        }).setOrigin(0.5);

        card.add([shadow, outer, inner, face]);
        this.drawCardIcon(card, item);
        card.add(label);

        const dragArea = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0.001).setOrigin(0.5);
        dragArea.cardOwner = card;
        card.add(dragArea);

        dragArea.setInteractive();
        this.input.setDraggable(dragArea);
        this.startCardFloat(card);

        return card;
    }

    drawCardIcon(card, item) {
        const icon = this.add.graphics();
        icon.lineStyle(8, item.accent, 1);
        icon.fillStyle(item.accent, 1);

        if (item.icon === "play") {
            icon.fillTriangle(-32, -54, -32, 28, 42, -12);
            icon.lineStyle(4, 0x061012, 1);
            icon.strokeTriangle(-32, -54, -32, 28, 42, -12);
        }

        if (item.icon === "gear") {
            icon.strokeCircle(0, -16, 34);
            icon.strokeCircle(0, -16, 11);
            for (let i = 0; i < 8; i += 1) {
                const angle = Phaser.Math.DegToRad(i * 45);
                const x = Math.cos(angle) * 44;
                const y = -16 + Math.sin(angle) * 44;
                icon.fillRect(x - 6, y - 6, 12, 12);
            }
        }

        if (item.icon === "exit") {
            icon.strokeRect(-44, -58, 62, 86);
            icon.lineBetween(-4, -14, 50, -14);
            icon.lineBetween(28, -38, 52, -14);
            icon.lineBetween(28, 10, 52, -14);
            icon.fillRect(-30, -20, 8, 8);
        }

        card.add(icon);
    }

    drawStatusPanel() {
        this.statusBox = this.add.rectangle(WIDTH / 2, 130, 690, 44, 0x071315, 0.72)
            .setStrokeStyle(2, 0x9edfd2, 0.7);

        this.statusText = this.add.text(WIDTH / 2, 130, "SELECIONE UM BLOCO", {
            fontFamily: "VCR",
            fontSize: "24px",
            color: "#eef3b8",
            align: "center"
        }).setOrigin(0.5);
    }

    registerDragEvents() {
        this.input.on("dragstart", (pointer, target) => {
            const card = target.cardOwner;
            this.activeCard = card;
            this.stopCardFloat(card);
            this.children.bringToTop(card);
            card.setScale(1.06);
            card.setAlpha(0.94);
            this.statusText.setText(`BLOCO: ${card.item.label}`);
        });

        this.input.on("drag", (pointer, target, dragX, dragY) => {
            const card = target.cardOwner;
            const localPoint = card.parentContainer
                ? card.parentContainer.getLocalPoint(pointer.x, pointer.y)
                : pointer;
            card.x = Phaser.Math.Clamp(localPoint.x, CARD_WIDTH / 2, WIDTH - CARD_WIDTH / 2);
            card.y = Phaser.Math.Clamp(localPoint.y, CARD_HEIGHT / 2, HEIGHT - CARD_HEIGHT / 2);
            this.renderDropZone(this.isInsideDropZone(card.x, card.y));
        });

        this.input.on("dragend", (pointer, target) => {
            const card = target.cardOwner;
            const shouldExecute = this.isInsideDropZone(card.x, card.y);
            card.setScale(1);
            card.setAlpha(1);
            this.renderDropZone(false);

            if (shouldExecute) {
                this.executeCard(card);
                return;
            }

            this.returnCard(card);
            this.statusText.setText("SOLTE NO CENTRO PARA EXECUTAR");
        });
    }

    isInsideDropZone(x, y) {
        return (
            x >= DROP_ZONE.x - DROP_ZONE.width / 2 &&
            x <= DROP_ZONE.x + DROP_ZONE.width / 2 &&
            y >= DROP_ZONE.y - DROP_ZONE.height / 2 &&
            y <= DROP_ZONE.y + DROP_ZONE.height / 2
        );
    }

    executeCard(card) {
        this.stopCardFloat(card);
        const dragArea = card.list.find((child) => child.cardOwner === card);
        dragArea.disableInteractive();
        this.input.setDraggable(dragArea, false);

        this.tweens.add({
            targets: card,
            x: DROP_ZONE.x,
            y: DROP_ZONE.y - 2,
            scale: 0.88,
            duration: 180,
            ease: "Power2",
            onComplete: () => {
                this.statusText.setText(card.item.executeText);
                this.flashDropZone(card.item.accent);
                this.time.delayedCall(700, () => this.finishExecution(card));
            }
        });
    }

    finishExecution(card) {
        if (card.item.id === "start") {
            this.statusText.setText("JOGO INICIADO");
        }

        if (card.item.id === "options") {
            this.statusText.setText("ABRINDO CONFIGURAÇÕES");
            this.time.delayedCall(350, () => {
                this.scene.start("options-scene");
            });
            return;
        }

        if (card.item.id === "exit") {
            this.statusText.setText("VOLTANDO AO INICIO");
            this.time.delayedCall(500, () => {
                window.location.href = "../index.html";
            });
        }

        if (card.item.id !== "exit") {
            this.time.delayedCall(800, () => this.returnCard(card, false));
        }
    }

    flashDropZone(color) {
        this.tweens.add({
            targets: this.dropZoneGraphic,
            alpha: 0.35,
            yoyo: true,
            repeat: 3,
            duration: 80,
            onComplete: () => {
                this.dropZoneGraphic.setAlpha(1);
                this.renderDropZone(false);
            }
        });

        this.statusBox.setStrokeStyle(2, color, 1);
        this.time.delayedCall(600, () => {
            this.statusBox.setStrokeStyle(2, 0x9edfd2, 0.7);
        });
    }

    returnCard(card, shouldResetStatus = true) {
        this.tweens.add({
            targets: card,
            x: card.originalX,
            y: card.originalY,
            scale: 1,
            duration: 220,
            ease: "Back.easeOut",
            onComplete: () => {
                const dragArea = card.list.find((child) => child.cardOwner === card);
                dragArea.setInteractive();
                this.input.setDraggable(dragArea);
                this.startCardFloat(card);
                if (shouldResetStatus && card.item.id !== "exit") {
                    this.statusText.setText("SELECIONE UM BLOCO");
                }
            }
        });
    }

    startCardFloat(card) {
        this.stopCardFloat(card);
        card.floatTween = this.tweens.add({
            targets: card,
            x: card.originalX + card.floatX,
            y: card.originalY + card.floatY,
            duration: Phaser.Math.Between(1200, 1700),
            delay: card.floatDelay,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: -1
        });
    }

    stopCardFloat(card) {
        if (!card.floatTween) {
            return;
        }

        card.floatTween.stop();
        card.floatTween = null;
    }
}
