import Phaser from "phaser";
import { API_BASE_URL } from "../config";
import { setSfxVolume } from "../state/audio";
import Sfx from "../ui/Sfx";
import keyboardLetters from "../assets/icons/keys/keyboard-letters.png";
import keyboardExtras from "../assets/icons/keys/keyboard-extras.png";

const WIDTH = 1280;
const HEIGHT = 720;
const TABS = ["Tela", "Controles", "Áudio", "Legenda"];

// Sheet "Keyboard Letters and Symbols": grid 8 colunas x 14 linhas de 16x16px.
// Linhas 0-6 = glifo branco, linhas 7-13 repetem em azul-claro (não usadas aqui).
// Frame = linha * 8 + coluna.
const KEY_SHEET_COLS = 8;
const KEY_FRAME = {
    A: 2 * KEY_SHEET_COLS + 0,
    D: 2 * KEY_SHEET_COLS + 3,
    E: 2 * KEY_SHEET_COLS + 4,
    F: 2 * KEY_SHEET_COLS + 5,
    P: 3 * KEY_SHEET_COLS + 7,
    R: 4 * KEY_SHEET_COLS + 1,
    S: 4 * KEY_SHEET_COLS + 2,
    W: 4 * KEY_SHEET_COLS + 6
};

// Sheet "Keyboard Extras": grid 4 colunas x 8 linhas de 32x16px (teclas largas:
// TAB, ESC, SHIFT, ENTER, SPACE, etc). Linhas 0-3 = glifo branco (usadas aqui).
const EXTRA_SHEET_COLS = 4;
const EXTRA_FRAME = {
    SHIFT: 1 * EXTRA_SHEET_COLS + 0
};
const AUTH_STORAGE_KEY = "reprogrammed.auth";
const MIN_VOLUME = 1;
const MAX_VOLUME = 100;
const POINTER_CURSOR = "url('../assets/cursors/pointer.png'), pointer";
const DEFAULT_CURSOR = "url('../assets/cursors/default.png'), auto";
const VOLUME_TRACK_X = 92;
const VOLUME_TRACK_WIDTH = 366;

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super("options-scene");
    }

    preload() {
        this.load.spritesheet("key-letters", keyboardLetters, { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet("key-extras", keyboardExtras, { frameWidth: 32, frameHeight: 16 });
        // Carrega os SFX para tocar uma amostra ao mexer no slider de efeitos.
        Sfx.preload(this);
    }

    create(data) {
        // `returnTo` é a cena que reabre no VOLTAR (o menu de pausa, quando as
        // opções são abertas durante o jogo). Sem ele, volta ao menu principal.
        this.returnTo = data?.returnTo ?? null;
        this.activeTab = "Tela";
        this.tabButtons = [];
        this.settings = {
            music_volume: 80,
            sfx_volume: 80
        };
        this.settingsMessage = "";

        // Aberta por cima de uma sala pausada (via pausa), esta cena precisa
        // renderizar acima dela — as salas vêm depois na lista do main.js.
        this.scene.bringToTop();

        this.drawBackground();
        this.drawHeader();
        this.drawTabs();
        this.drawPanel();
        this.renderTabContent();
        this.loadSettings();

        const onEnterFullscreen = () => {
            this.lockEscapeKey();
            refreshDisplayTab();
        };
        const onLeaveFullscreen = () => {
            this.unlockEscapeKey();
            refreshDisplayTab();
        };
        const refreshDisplayTab = () => {
            if (this.sys.isActive() && this.activeTab === "Tela") {
                this.renderTabContent();
            }
        };
        this.scale.on("enterfullscreen", onEnterFullscreen);
        this.scale.on("leavefullscreen", onLeaveFullscreen);
        this.events.once("shutdown", () => {
            this.scale.off("enterfullscreen", onEnterFullscreen);
            this.scale.off("leavefullscreen", onLeaveFullscreen);
        });
    }

    // Impede que um toque em ESC saia da tela cheia (Chrome/Edge).
    // O navegador passa a entregar o ESC ao jogo; para sair, segure ESC.
    lockEscapeKey() {
        if (navigator.keyboard?.lock) {
            navigator.keyboard.lock(["Escape"]).catch(() => {});
        }
    }

    unlockEscapeKey() {
        navigator.keyboard?.unlock?.();
    }

    drawBackground() {
        this.cameras.main.setBackgroundColor("#050505");

        const background = this.add.graphics();
        background.fillStyle(0x050505, 1);
        background.fillRect(0, 0, WIDTH, HEIGHT);

        background.lineStyle(2, 0xf7f7f7, 0.45);
        background.lineBetween(0, 88, WIDTH, 88);
        background.lineBetween(0, 630, WIDTH, 630);
    }

    drawHeader() {
        this.add.text(WIDTH / 2, 45, "- OPÇÕES -", {
            fontFamily: "VCR",
            fontSize: "34px",
            color: "#f7f7f7"
        }).setOrigin(0.5);

        const backButton = this.add.container(112, 45);
        const backBox = this.add.rectangle(0, 0, 158, 46, 0x0b0b0b, 0.92)
            .setStrokeStyle(2, 0x7a7a7a, 0.9);
        const backText = this.add.text(0, 0, "VOLTAR", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#f7f7f7"
        }).setOrigin(0.5);
        const hitArea = this.add.rectangle(0, 0, 158, 46, 0xffffff, 0.001).setOrigin(0.5);

        backButton.add([backBox, backText, hitArea]);
        backButton.setSize(158, 46);
        hitArea.setInteractive();
        hitArea.on("pointerover", () => backBox.setFillStyle(0x2a2a2a, 1));
        hitArea.on("pointerout", () => backBox.setFillStyle(0x0b0b0b, 0.92));
        hitArea.on("pointerdown", () => this.goBack());
    }

    goBack() {
        // Aberta pelo menu de pausa (que ficou dormindo com a sala pausada por
        // baixo): acorda a pausa em vez de largar o jogador no menu principal.
        if (this.returnTo && this.scene.isSleeping(this.returnTo)) {
            this.scene.stop();
            this.scene.wake(this.returnTo);
            return;
        }

        this.scene.start("game-scene");
    }

    drawTabs() {
        const startX = 280;
        const spacing = 190;

        TABS.forEach((tabName, index) => {
            const button = this.add.container(startX + spacing * index, 138);
            const box = this.add.rectangle(0, 0, 164, 52, 0x0b0b0b, 0.9)
                .setStrokeStyle(2, 0x7a7a7a, 1);
            const label = this.add.text(0, 1, tabName.toUpperCase(), {
                fontFamily: "VCR",
                fontSize: "19px",
                color: "#f7f7f7"
            }).setOrigin(0.5);
            const hitArea = this.add.rectangle(0, 0, 164, 52, 0xffffff, 0.001).setOrigin(0.5);

            button.tabName = tabName;
            button.box = box;
            button.add([box, label, hitArea]);
            button.setSize(164, 52);
            hitArea.setInteractive();
            hitArea.on("pointerdown", () => {
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
        const outer = this.add.rectangle(0, 0, 820, 386, 0x7a7a7a, 0.14)
            .setStrokeStyle(3, 0x7a7a7a, 0.78);
        const inner = this.add.rectangle(0, 0, 784, 350, 0x0b0b0b, 0.72)
            .setStrokeStyle(2, 0x000000, 0.95);

        this.panel.add([outer, inner]);
        this.panelContent = this.add.container(0, 0);
        this.panel.add(this.panelContent);
    }

    updateTabButtons() {
        this.tabButtons.forEach((button) => {
            const isActive = button.tabName === this.activeTab;
            button.box.setFillStyle(isActive ? 0x2a2a2a : 0x0b0b0b, isActive ? 1 : 0.9);
            button.box.setStrokeStyle(2, isActive ? 0xf7f7f7 : 0x7a7a7a, 1);
        });
    }

    renderTabContent() {
        this.panelContent.removeAll(true);

        if (this.activeTab === "Tela") {
            this.renderDisplayTab();
            return;
        }

        if (this.activeTab === "Áudio") {
            this.renderAudioTab();
            return;
        }

        if (this.activeTab === "Controles") {
            this.renderControlsTab();
            return;
        }

        this.panelContent.add(this.add.text(0, 0, "EM BREVE", {
            fontFamily: "VCR",
            fontSize: "28px",
            color: "#7a7a7a"
        }).setOrigin(0.5));
    }

    renderDisplayTab() {
        this.panelContent.add(this.add.text(0, -52, "MODO DE EXIBIÇÃO", {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#d9d9d9"
        }).setOrigin(0.5));

        const isFullscreen = this.scale.isFullscreen;
        const fullscreenButton = this.add.container(0, 35);
        const box = this.add.rectangle(0, 0, 330, 70, isFullscreen ? 0xf7f7f7 : 0x111111, 1)
            .setStrokeStyle(3, 0xf7f7f7, 0.95);
        const label = this.add.text(0, 1, "TELA CHEIA", {
            fontFamily: "VCR",
            fontSize: "26px",
            color: isFullscreen ? "#111111" : "#f7f7f7"
        }).setOrigin(0.5);
        const hitArea = this.add.rectangle(0, 0, 330, 70, 0xffffff, 0.001).setOrigin(0.5);

        fullscreenButton.add([box, label, hitArea]);
        fullscreenButton.setSize(330, 70);
        hitArea.setInteractive();
        hitArea.on("pointerover", () => box.setFillStyle(isFullscreen ? 0xd9d9d9 : 0x2a2a2a, 1));
        hitArea.on("pointerout", () => box.setFillStyle(isFullscreen ? 0xf7f7f7 : 0x111111, 1));
        hitArea.on("pointerdown", () => this.toggleFullscreen());

        this.panelContent.add(fullscreenButton);
    }

    renderControlsTab() {
        // Duas colunas: movimento à esquerda, ações à direita — usa a largura
        // toda do painel em vez de empilhar tudo colado na borda esquerda.
        const movementBindings = [
            { texture: "key-letters", frame: KEY_FRAME.W, action: "CIMA" },
            { texture: "key-letters", frame: KEY_FRAME.A, action: "ESQUERDA" },
            { texture: "key-letters", frame: KEY_FRAME.S, action: "BAIXO" },
            { texture: "key-letters", frame: KEY_FRAME.D, action: "DIREITA" }
        ];

        const actionBindings = [
            { texture: "key-letters", frame: KEY_FRAME.E, action: "INTERAGIR" },
            { texture: "key-letters", frame: KEY_FRAME.R, action: "REPROGRAMAR REMOTO" },
            { texture: "key-letters", frame: KEY_FRAME.F, action: "GOLPEAR" },
            { texture: "key-extras", frame: EXTRA_FRAME.SHIFT, action: "CORRER", wide: true },
            { texture: "key-letters", frame: KEY_FRAME.P, action: "PULAR DIÁLOGO" }
        ];

        // As linhas das duas colunas se alinham: o startY sai da coluna MAIS
        // LONGA, então a mais curta só termina antes. Espaçamento de 62 para as
        // 5 ações caberem nos 350px de altura do painel.
        const rowSpacing = 62;
        const linhas = Math.max(movementBindings.length, actionBindings.length);
        const startY = -((linhas - 1) * rowSpacing) / 2 + 8;

        this.renderBindingColumn(movementBindings, -300, -256, startY, rowSpacing);
        this.renderBindingColumn(actionBindings, 70, 145, startY, rowSpacing);
    }

    renderBindingColumn(bindings, iconX, labelX, startY, rowSpacing) {
        bindings.forEach((binding, index) => {
            const y = startY + rowSpacing * index;
            this.panelContent.add(this.createKeyCap(iconX, y, binding.texture, binding.frame, binding.wide));
            this.panelContent.add(this.add.text(labelX, y, binding.action, {
                fontFamily: "VCR",
                fontSize: "22px",
                color: "#d9d9d9"
            }).setOrigin(0, 0.5));
        });
    }

    // Teclas normais (key-letters) são quadradas; teclas largas (key-extras,
    // ex. SHIFT) mantêm a mesma altura mas ficam com o dobro da largura.
    createKeyCap(x, y, texture, frame, wide = false) {
        const height = 48;
        const width = wide ? height * 2 : height;
        return this.add.image(x, y, texture, frame).setDisplaySize(width, height);
    }

    renderAudioTab() {
        this.createVolumeControl("MÚSICA", "music_volume", -50);
        this.createVolumeControl("EFEITOS SONOROS", "sfx_volume", 55);

        if (this.settingsMessage) {
            this.panelContent.add(this.add.text(0, 128, this.settingsMessage, {
                fontFamily: "VCR",
                fontSize: "16px",
                color: "#d9d9d9"
            }).setOrigin(0.5));
        }
    }

    createVolumeControl(labelText, field, y) {
        const control = this.add.container(0, y);
        const label = this.add.text(-350, 0, labelText, {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#d9d9d9"
        }).setOrigin(0, 0.5);
        const minusButton = this.createVolumeButton(-120, 0, "−", () => {
            this.setVolume(field, this.settings[field] - 1, true);
        });
        const track = this.add.rectangle(
            VOLUME_TRACK_X,
            0,
            VOLUME_TRACK_WIDTH,
            18,
            0x111111,
            1
        ).setStrokeStyle(2, 0x7a7a7a, 1);
        const fill = this.add.rectangle(
            VOLUME_TRACK_X - VOLUME_TRACK_WIDTH / 2,
            0,
            0,
            12,
            0xf7f7f7,
            1
        ).setOrigin(0, 0.5);
        const hitArea = this.add.rectangle(
            VOLUME_TRACK_X,
            0,
            VOLUME_TRACK_WIDTH,
            42,
            0xffffff,
            0.001
        ).setInteractive({ cursor: POINTER_CURSOR });
        const valueText = this.add.text(305, 0, String(this.settings[field]), {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#f7f7f7"
        }).setOrigin(0.5);
        const plusButton = this.createVolumeButton(350, 0, "+", () => {
            this.setVolume(field, this.settings[field] + 1, true);
        });

        control.add([label, minusButton, track, fill, hitArea, valueText, plusButton]);
        control.valueText = valueText;
        control.fill = fill;
        control.field = field;
        this.panelContent.add(control);
        this.updateVolumeControl(control);

        const updateFromPointer = (pointer) => {
            const trackStartX = WIDTH / 2 + VOLUME_TRACK_X - VOLUME_TRACK_WIDTH / 2;
            const localX = Phaser.Math.Clamp(
                pointer.x - trackStartX,
                0,
                VOLUME_TRACK_WIDTH
            );
            const volume = Math.round(
                MIN_VOLUME +
                (localX / VOLUME_TRACK_WIDTH) * (MAX_VOLUME - MIN_VOLUME)
            );
            this.setVolume(field, volume, false);
        };

        hitArea.on("pointerdown", (pointer) => {
            this.game.canvas.style.cursor = POINTER_CURSOR;
            updateFromPointer(pointer);
        });
        hitArea.on("pointermove", (pointer) => {
            if (pointer.isDown) {
                updateFromPointer(pointer);
            }
        });
        const finishDrag = () => {
            this.game.canvas.style.cursor = DEFAULT_CURSOR;
            this.saveSettings({ [field]: this.settings[field] });
        };
        hitArea.on("pointerup", finishDrag);
        hitArea.on("pointerupoutside", finishDrag);
    }

    createVolumeButton(x, y, text, onClick) {
        const button = this.add.container(x, y);
        const box = this.add.rectangle(0, 0, 42, 42, 0x111111, 1)
            .setStrokeStyle(2, 0x7a7a7a, 1);
        const label = this.add.text(0, -1, text, {
            fontFamily: "VCR",
            fontSize: "24px",
            color: "#f7f7f7"
        }).setOrigin(0.5);
        const hitArea = this.add.rectangle(0, 0, 42, 42, 0xffffff, 0.001)
            .setInteractive({ cursor: POINTER_CURSOR });

        hitArea.on("pointerover", () => box.setFillStyle(0x2a2a2a, 1));
        hitArea.on("pointerout", () => box.setFillStyle(0x111111, 1));
        hitArea.on("pointerdown", onClick);
        button.add([box, label, hitArea]);
        return button;
    }

    setVolume(field, value, shouldSave) {
        this.settings[field] = Phaser.Math.Clamp(
            Math.round(value),
            MIN_VOLUME,
            MAX_VOLUME
        );

        const control = this.panelContent.list.find((item) => item.field === field);
        if (control) {
            this.updateVolumeControl(control);
        }

        // Reflete o volume dos efeitos no player de SFX na hora (o slider passa a
        // controlar de verdade os sons do jogo) e toca uma AMOSTRA no volume novo,
        // para o usuário OUVIR o ajuste (com throttle, para não empilhar sons no
        // arraste).
        if (field === "sfx_volume") {
            setSfxVolume(this.settings.sfx_volume);
            if (this.time.now - (this.lastSfxPreviewAt ?? 0) > 140) {
                this.lastSfxPreviewAt = this.time.now;
                Sfx.play(this, "select");
            }
        }

        if (shouldSave) {
            this.saveSettings({ [field]: this.settings[field] });
        }
    }

    updateVolumeControl(control) {
        const value = this.settings[control.field];
        const progress = (value - MIN_VOLUME) / (MAX_VOLUME - MIN_VOLUME);
        control.valueText.setText(String(value));
        control.fill.width = VOLUME_TRACK_WIDTH * progress;
    }

    getAccessToken() {
        return this.getAuthData()?.accessToken || null;
    }

    getAuthData() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
        } catch (error) {
            return null;
        }
    }

    saveAuthData(data) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            accessToken: data.session?.access_token || null,
            refreshToken: data.session?.refresh_token || null,
            user: data.user || null
        }));
    }

    async refreshSession() {
        const refreshToken = this.getAuthData()?.refreshToken;

        if (!refreshToken) {
            throw new Error("Sessão expirada. Faça login novamente.");
        }

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ refreshToken })
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || "Sessão expirada. Faça login novamente.");
        }

        this.saveAuthData(data);
        return data.session.access_token;
    }

    normalizeSettings(settings) {
        return {
            music_volume: Phaser.Math.Clamp(
                Math.round(Number(settings?.music_volume) || 80),
                MIN_VOLUME,
                MAX_VOLUME
            ),
            sfx_volume: Phaser.Math.Clamp(
                Math.round(Number(settings?.sfx_volume) || 80),
                MIN_VOLUME,
                MAX_VOLUME
            )
        };
    }

    async requestSettings(method = "GET", payload, allowRefresh = true) {
        const token = this.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/game/settings`, {
            method,
            headers: {
                ...(payload ? { "Content-Type": "application/json" } : {}),
                Authorization: `Bearer ${token}`
            },
            ...(payload ? { body: JSON.stringify(payload) } : {})
        });
        const data = await response.json().catch(() => null);

        if (response.status === 401 && allowRefresh) {
            await this.refreshSession();
            return this.requestSettings(method, payload, false);
        }

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Reinicie o backend para carregar as novas rotas.");
            }

            throw new Error(data?.error || "Não foi possível acessar as configurações.");
        }

        return data.settings;
    }

    async loadSettings() {
        try {
            this.settings = this.normalizeSettings(await this.requestSettings());
            this.settingsMessage = "";
            setSfxVolume(this.settings.sfx_volume);   // aplica o volume salvo aos efeitos
        } catch (error) {
            this.settingsMessage = "NÃO FOI POSSÍVEL CARREGAR";
        }

        if (this.sys.isActive() && this.activeTab === "Áudio") {
            this.renderTabContent();
        }
    }

    async saveSettings(changes) {
        try {
            this.settings = this.normalizeSettings(
                await this.requestSettings("PATCH", changes)
            );
            this.settingsMessage = "";
        } catch (error) {
            console.error("Erro ao salvar configurações:", error);
            this.settingsMessage = error.message || "ERRO AO SALVAR";
        }

        if (this.sys.isActive() && this.activeTab === "Áudio") {
            this.renderTabContent();
        }
    }

    toggleFullscreen() {
        if (this.scale.isFullscreen) {
            this.scale.stopFullscreen();
        } else {
            this.scale.startFullscreen();
        }
    }
}
