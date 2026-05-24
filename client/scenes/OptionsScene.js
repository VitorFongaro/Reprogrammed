import Phaser from "phaser";

const WIDTH = 1280;
const HEIGHT = 720;
const TABS = ["Tela", "Controles", "Audio", "Legenda"];

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super("options-scene");
    }

    create() {
        this.activeTab = "Tela";
        this.tabButtons = [];

        this.drawBackground();
        this.drawHeader();
        this.drawTabs();
        this.drawPanel();
        this.renderTabContent();
    }

    drawBackground() {
        this.cameras.main.setBackgroundColor("#13282b");

        const background = this.add.graphics();
        background.fillStyle(0x13282b, 1);
        background.fillRect(0, 0, WIDTH, HEIGHT);

        background.lineStyle(2, 0xb8f5e8, 0.45);
        background.lineBetween(0, 88, WIDTH, 88);
        background.lineBetween(0, 630, WIDTH, 630);

        background.lineStyle(1, 0x0b1b1d, 0.85);
        for (let y = 0; y < HEIGHT; y += 8) {
            background.lineBetween(0, y, WIDTH, y);
        }

        background.lineStyle(1, 0xffffff, 0.045);
        for (let x = 0; x < WIDTH; x += 16) {
            background.lineBetween(x, 0, x, HEIGHT);
        }
    }

    drawHeader() {
        this.add.text(WIDTH / 2, 45, "- OPÇÕES -", {
            fontFamily: "VCR",
            fontSize: "34px",
            color: "#e7ebb2"
        }).setOrigin(0.5);

        const backButton = this.add.container(112, 45);
        const backBox = this.add.rectangle(0, 0, 158, 46, 0x071315, 0.92)
            .setStrokeStyle(2, 0x9edfd2, 0.9);
        const backText = this.add.text(0, 0, "VOLTAR", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#d6f6ec"
        }).setOrigin(0.5);

        backButton.add([backBox, backText]);
        backButton.setSize(158, 46);
        backButton.setInteractive(
            new Phaser.Geom.Rectangle(-79, -23, 158, 46),
            Phaser.Geom.Rectangle.Contains
        );
        backButton.on("pointerover", () => backBox.setFillStyle(0x12383b, 1));
        backButton.on("pointerout", () => backBox.setFillStyle(0x071315, 0.92));
        backButton.on("pointerdown", () => this.scene.start("game-scene"));
    }

    drawTabs() {
        const startX = 280;
        const spacing = 190;

        TABS.forEach((tabName, index) => {
            const button = this.add.container(startX + spacing * index, 138);
            const box = this.add.rectangle(0, 0, 164, 52, 0x071315, 0.9)
                .setStrokeStyle(2, 0x547b78, 1);
            const label = this.add.text(0, 1, tabName.toUpperCase(), {
                fontFamily: "VCR",
                fontSize: "19px",
                color: "#d6f6ec"
            }).setOrigin(0.5);

            button.tabName = tabName;
            button.box = box;
            button.add([box, label]);
            button.setSize(164, 52);
            button.setInteractive(
                new Phaser.Geom.Rectangle(-82, -26, 164, 52),
                Phaser.Geom.Rectangle.Contains
            );
            button.on("pointerdown", () => {
                this.activeTab = tabName;
                this.updateTabButtons();
                this.renderTabContent();
            });

            this.tabButtons.push(button);
        });

        this.updateTabButtons();
    }

    drawPanel() {
        this.panel = this.add.container(WIDTH / 2, 380);
        const outer = this.add.rectangle(0, 0, 820, 386, 0x9edfd2, 0.14)
            .setStrokeStyle(3, 0x9edfd2, 0.78);
        const inner = this.add.rectangle(0, 0, 784, 350, 0x071315, 0.72)
            .setStrokeStyle(2, 0x061012, 0.95);

        this.panel.add([outer, inner]);
        this.panelContent = this.add.container(0, 0);
        this.panel.add(this.panelContent);
    }

    updateTabButtons() {
        this.tabButtons.forEach((button) => {
            const isActive = button.tabName === this.activeTab;
            button.box.setFillStyle(isActive ? 0x1b4545 : 0x071315, isActive ? 1 : 0.9);
            button.box.setStrokeStyle(2, isActive ? 0xe7ebb2 : 0x547b78, 1);
        });
    }

    renderTabContent() {
        this.panelContent.removeAll(true);

        if (this.activeTab === "Tela") {
            this.renderDisplayTab();
            return;
        }

        this.addPanelTitle(this.activeTab.toUpperCase());
        this.panelContent.add(this.add.text(0, 30, "EM BREVE", {
            fontFamily: "VCR",
            fontSize: "28px",
            color: "#8eb6af"
        }).setOrigin(0.5));
    }

    renderDisplayTab() {
        this.addPanelTitle("TELA");

        this.panelContent.add(this.add.text(0, -52, "MODO DE EXIBIÇÃO", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#8eb6af"
        }).setOrigin(0.5));

        const fullscreenButton = this.add.container(0, 35);
        const box = this.add.rectangle(0, 0, 330, 70, 0x182426, 1)
            .setStrokeStyle(3, 0xe7ebb2, 0.95);
        const label = this.add.text(0, 1, "TELA CHEIA", {
            fontFamily: "VCR",
            fontSize: "26px",
            color: "#eef3b8"
        }).setOrigin(0.5);

        fullscreenButton.add([box, label]);
        fullscreenButton.setSize(330, 70);
        fullscreenButton.setInteractive(
            new Phaser.Geom.Rectangle(-165, -35, 330, 70),
            Phaser.Geom.Rectangle.Contains
        );
        fullscreenButton.on("pointerover", () => box.setFillStyle(0x273738, 1));
        fullscreenButton.on("pointerout", () => box.setFillStyle(0x182426, 1));
        fullscreenButton.on("pointerdown", () => this.toggleFullscreen());

        this.panelContent.add(fullscreenButton);
    }

    addPanelTitle(text) {
        this.panelContent.add(this.add.text(0, -126, text, {
            fontFamily: "VCR",
            fontSize: "32px",
            color: "#eef3b8"
        }).setOrigin(0.5));
    }

    toggleFullscreen() {
        if (!this.scale.isFullscreen) {
            this.scale.startFullscreen();
            return;
        }

        this.scale.stopFullscreen();
    }
}
