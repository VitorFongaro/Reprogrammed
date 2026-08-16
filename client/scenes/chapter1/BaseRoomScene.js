import Phaser from "phaser";
import PlayerCharacter from "../../characters/PlayerCharacter";
import CosmoCompanion from "../../characters/CosmoCompanion";
import DialogueBox from "../../ui/DialogueBox";
import { tiledColliders, placeTiledObjects, preloadProps } from "../../utils/tiledMap";
import { enterScene } from "../../state/progress";

// Cena-base das salas do capítulo 1: desenha a sala (mapa em imagem ou grade),
// cria jogador/Cosmo/diálogo, gerencia interagíveis ([E] no mais próximo), a
// porta de saída (trancada até `unlockDoor()`) e, quando a config traz `map`,
// instancia objetos e colisões autorados no Tiled.

const WIDTH = 1280;
const HEIGHT = 720;

const DEFAULT_BOUNDS = { x: 48, y: 96, w: WIDTH - 96, h: HEIGHT - 144 };
const DEFAULT_MAP_OFFSET = { x: 0, y: 8 };
const DOOR_W = 16;
const DOOR_H = 110;
const DOOR_RADIUS = 120;

// Modo de REPROGRAMAÇÃO REMOTA (estilo câmara lenta de Touhou Luna Nights):
// [R] desacelera o tempo e destaca os alvos registrados via
// registerReprogrammable(...). A Artemis continua se movendo em TEMPO NORMAL
// (WASD, com rastro de imagens residuais); [←]/[→] alternam o alvo e [E] abre
// o console à distância — dá até para desativar torretas atirando. Fator < 1 =
// mais lento.
const REPROGRAM_SLOW = 0.2;
const REPROGRAM_DURATION = 5000;   // duração do modo (ms REAIS — o clock da cena fica lento).
const REPROGRAM_COOLDOWN = 6000;   // recarga após o uso (ms reais).
const AFTERIMAGE_INTERVAL = 110;   // ms reais entre imagens residuais.
const AFTERIMAGE_FADE = 220;       // fade do rastro (alonga junto com a câmara lenta).

export default class BaseRoomScene extends Phaser.Scene {
    constructor(key, config = {}) {
        super(key);
        this.roomTitle = config.title ?? "";
        this.footerHint = config.footer ?? "";
        this.nextSceneKey = config.nextScene ?? null;
        this.spawn = config.spawn ?? { x: 180, y: HEIGHT / 2 };
        this.doorLabel = config.doorLabel ?? "[E] SEGUIR";
        this.bounds = config.bounds ?? DEFAULT_BOUNDS;
        // Porta customizada ({ x, y }) para salas cuja porta já está desenhada na
        // arte do mapa: o código só renderiza a luz da fechadura e o prompt.
        this.doorPos = config.door ?? null;
        // Ordena a protagonista por y (passa na frente/atrás de objetos com y-sort).
        this.ySort = config.ySort ?? false;
        // Sala com mapa em imagem + Tiled: `bg` (URL do PNG de fundo), `map`
        // (JSON do Tiled importado) e `mapOffset` (mapa 1280x704 centralizado).
        this.bgUrl = config.bg ?? null;
        this.bgKey = config.bgKey ?? `bg-${key}`;
        this.mapData = config.map ?? null;
        this.mapOffset = config.mapOffset ?? DEFAULT_MAP_OFFSET;
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
        preloadProps(this);

        if (this.bgUrl && !this.textures.exists(this.bgKey)) {
            this.load.image(this.bgKey, this.bgUrl);
        }
    }

    create() {
        // O save grava a sala onde o jogador está; registrar aqui vale para
        // todas as salas de uma vez.
        enterScene(this.scene.key);

        this.interactables = [];
        this.reprogrammables = [];
        this.reprogramMode = false;
        this.reprogramCooldownLeft = 0;
        this.afterimageAccumulator = 0;
        this.doorUnlocked = false;
        this.transitioning = false;

        this.drawRoom();
        this.createDoor();

        this.player = new PlayerCharacter(this, this.spawn.x, this.spawn.y);
        this.cosmo = new CosmoCompanion(this, this.player);
        this.dialogue = new DialogueBox(this);

        if (this.mapData) {
            this.addObjectsFromTiled(this.mapData, "objetos", this.mapOffset);
            this.addCollidersFromTiled(this.mapData, "colisao", this.mapOffset);
        }

        this.input.keyboard.on("keydown-E", () => this.tryInteract());
        this.input.keyboard.on("keydown", (event) => this.handleRoomKey(event));

        // Restaura a dilatação temporal se a sala fechar/reiniciar com o modo
        // ativo: anims é global e Clock/tweens persistem num scene.restart.
        // NÃO tocar em physics.world aqui — o plugin de física desliga antes
        // deste handler (world já é null) e o mundo é recriado na próxima cena.
        this.events.once("shutdown", () => {
            this.anims.globalTimeScale = 1;
            this.time.timeScale = 1;
            this.tweens.timeScale = 1;
        });

        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.onRoomCreate();
    }

    update(time, delta) {
        this.player.update();
        this.cosmo.update(time, delta);
        this.updatePrompts();
        this.updateReprogramState(delta);

        if (this.ySort) {
            // Profundidade = pés visíveis da protagonista, para casar com os objetos.
            this.player.sprite.setDepth(this.player.feetY);
        }

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
        this.addColliders(tiledColliders(mapData, layerName, offset));
    }

    // Instancia os objetos (tile objects) de uma camada do Tiled como sprites,
    // com profundidade por y (y-sort). Os PNGs precisam estar carregados em
    // preload como `prop-<nome>`.
    addObjectsFromTiled(mapData, layerName = "objetos", offset = { x: 0, y: 0 }) {
        placeTiledObjects(this, mapData, layerName, offset);
    }

    tryInteract() {
        // No modo de reprogramação o [E] confirma o alvo selecionado (ver
        // handleReprogramKey), não o interagível mais próximo.
        if (!this.player.enabled || this.transitioning || this.reprogramMode) {
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
        const nearest = this.player.enabled && !this.transitioning && !this.reprogramMode
            ? this.nearestAvailable()
            : null;
        this.interactables.forEach((item) => {
            item.promptObj?.setVisible(item === nearest);
        });
    }

    // --- Reprogramação remota ([R]: tempo desacelerado + seleção de alvo) ---
    // Formato do alvo: { x, y, w, h, label, isAvailable(), onReprogram() }.
    registerReprogrammable(item) {
        this.reprogrammables.push(item);
        return item;
    }

    availableReprogrammables() {
        return this.reprogrammables.filter((item) => item.isAvailable());
    }

    canEnterReprogramMode() {
        return this.player.enabled
            && !this.transitioning
            && this.reprogramCooldownLeft <= 0
            && this.availableReprogrammables().length > 0;
    }

    // Tique do modo/recarga com delta REAL (os timers da cena ficam
    // desacelerados durante o modo, então duração e recarga são contadas aqui).
    updateReprogramState(delta) {
        if (this.reprogramMode) {
            this.reprogramTimeLeft -= delta;
            if (this.reprogramTimeLeft <= 0) {
                this.exitReprogramMode();
            } else {
                const seconds = this.reprogramTimeLeft / 1000;
                this.reprogramTimerText
                    ?.setText(`${seconds.toFixed(1)}s`)
                    .setColor(seconds <= 1.5 ? "#ff4545" : "#4ad6ff");
                this.updateAfterimages(delta);
            }
        } else if (this.reprogramCooldownLeft > 0) {
            this.reprogramCooldownLeft = Math.max(0, this.reprogramCooldownLeft - delta);
        }

        if (!this.reprogramHint) {
            return;
        }

        if (this.reprogramMode) {
            this.reprogramHint.setVisible(false);
        } else if (this.reprogramCooldownLeft > 0) {
            this.reprogramHint.setVisible(true)
                .setText(`recarregando [R]... ${(this.reprogramCooldownLeft / 1000).toFixed(1)}s`)
                .setColor("#5b6178");
        } else {
            this.reprogramHint.setVisible(this.canEnterReprogramMode())
                .setText("[R] reprogramação remota")
                .setColor("#4ad6ff");
        }
    }

    // Clock/tweens/anims usam multiplicador (< 1 = mais lento); o mundo arcade
    // usa divisor (2 = metade da velocidade), por isso o inverso.
    setTimeDilation(factor) {
        this.time.timeScale = factor;
        this.tweens.timeScale = factor;
        this.anims.globalTimeScale = factor;
        this.physics.world.timeScale = 1 / factor;
    }

    // Teclas gerais da sala. No modo remoto tudo vai para handleReprogramKey
    // (lá o ESC cancela o modo); fora dele, ESC abre a pausa e [R] entra no modo.
    handleRoomKey(event) {
        if (this.reprogramMode) {
            this.handleReprogramKey(event);
            return;
        }

        if (event.code === "Escape") {
            this.openPauseMenu();
            return;
        }

        if (event.code === "KeyR" && this.canEnterReprogramMode()) {
            this.enterReprogramMode();
        }
    }

    handleReprogramKey(event) {
        // WASD segue livre para o movimento; as SETAS alternam o alvo.
        switch (event.code) {
            case "ArrowLeft":
                this.cycleReprogramTarget(-1);
                return;
            case "ArrowRight":
                this.cycleReprogramTarget(1);
                return;
            case "KeyE":
            case "Enter":
                this.confirmReprogram();
                return;
            case "KeyR":
            case "Escape":
                this.exitReprogramMode();
        }
    }

    enterReprogramMode() {
        this.reprogramMode = true;
        this.reprogramIndex = 0;
        this.reprogramTimeLeft = REPROGRAM_DURATION;
        this.afterimageAccumulator = 0;
        this.setTimeDilation(REPROGRAM_SLOW);
        // A Artemis fica FORA da câmara lenta (estilo Luna Nights): compensa a
        // dilatação na velocidade e na animação dela.
        this.player.setTimeCompensation(1 / REPROGRAM_SLOW);
        this.buildReprogramOverlay();
        this.renderReprogramOverlay();
        this.setStatus("> REPROGRAMAÇÃO REMOTA — TEMPO DESACELERADO", "#4ad6ff");
    }

    // Sai do modo; com `target`, abre o console dele (o tempo volta ao normal
    // antes — o puzzle acontece fora da câmara lenta).
    exitReprogramMode(target = null) {
        this.reprogramMode = false;
        this.reprogramCooldownLeft = REPROGRAM_COOLDOWN;
        this.setTimeDilation(1);
        this.player.setTimeCompensation(1);
        this.reprogramContainer?.destroy();
        this.reprogramContainer = null;
        this.reprogramLabels = null;
        this.reprogramTimerText = null;
        this.setStatus("");

        if (target) {
            target.onReprogram();
        }
    }

    cycleReprogramTarget(direction) {
        const total = this.availableReprogrammables().length;
        if (total === 0) {
            return;
        }
        this.reprogramIndex = Phaser.Math.Wrap(this.reprogramIndex + direction, 0, total);
        this.renderReprogramOverlay();
    }

    confirmReprogram() {
        const target = this.availableReprogrammables()[this.reprogramIndex];
        if (target) {
            this.exitReprogramMode(target);
        }
    }

    buildReprogramOverlay() {
        this.reprogramContainer = this.add.container(0, 0).setDepth(940);

        const backdrop = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x03060c, 0.45);
        this.reprogramGraphics = this.add.graphics();

        const hint = this.add.text(
            WIDTH / 2,
            HEIGHT - 56,
            "WASD mover   [←]/[→] alternar alvo   [E] reprogramar   [R] cancelar",
            { fontFamily: "VCR", fontSize: "18px", color: "#e7e9f2" }
        ).setOrigin(0.5);

        // Contagem regressiva da duração do modo (atualizada no update).
        this.reprogramTimerText = this.add.text(WIDTH / 2, 116, "", {
            fontFamily: "VCR",
            fontSize: "22px",
            color: "#4ad6ff"
        }).setOrigin(0.5);

        this.reprogramContainer.add([backdrop, this.reprogramGraphics, hint, this.reprogramTimerText]);
        this.reprogramLabels = [];
    }

    // Rastro da Artemis na câmara lenta (estilo Touhou): silhuetas ciano que
    // ficam para trás enquanto ela se move. Roda no update com delta REAL (os
    // timers da cena estão desacelerados); o fade usa tween, que também está
    // lento — por isso o rastro persiste um pouco e some rápido ao sair do modo.
    updateAfterimages(delta) {
        const body = this.player.sprite.body;
        if (!body || (body.velocity.x === 0 && body.velocity.y === 0)) {
            this.afterimageAccumulator = 0;
            return;
        }

        this.afterimageAccumulator += delta;
        if (this.afterimageAccumulator < AFTERIMAGE_INTERVAL) {
            return;
        }
        this.afterimageAccumulator = 0;

        const sprite = this.player.sprite;
        const ghost = this.add.image(sprite.x, sprite.y, sprite.texture.key)
            .setScale(sprite.scaleX, sprite.scaleY)
            .setDepth(sprite.depth - 1)
            .setAlpha(0.45);
        ghost.setTintFill(0x4ad6ff);

        this.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: AFTERIMAGE_FADE,
            onComplete: () => ghost.destroy()
        });
    }

    renderReprogramOverlay() {
        const targets = this.availableReprogrammables();
        if (targets.length === 0) {
            this.exitReprogramMode();
            return;
        }
        this.reprogramIndex = Phaser.Math.Wrap(this.reprogramIndex, 0, targets.length);

        this.reprogramGraphics.clear();
        this.reprogramLabels.forEach((label) => label.destroy());
        this.reprogramLabels = [];

        targets.forEach((target, index) => {
            const selected = index === this.reprogramIndex;
            const pad = 10;
            const left = target.x - target.w / 2 - pad;
            const top = target.y - target.h / 2 - pad;
            const w = target.w + pad * 2;
            const h = target.h + pad * 2;

            this.reprogramGraphics.lineStyle(selected ? 3 : 2, selected ? 0xf7f7f7 : 0x4ad6ff, selected ? 1 : 0.55);
            this.reprogramGraphics.strokeRect(left, top, w, h);
            if (selected) {
                this.reprogramGraphics.fillStyle(0x4ad6ff, 0.1);
                this.reprogramGraphics.fillRect(left, top, w, h);
            }

            const label = this.add.text(target.x, top - 12, target.label, {
                fontFamily: "VCR",
                fontSize: selected ? "17px" : "14px",
                color: selected ? "#ffffff" : "#4ad6ff"
            }).setOrigin(0.5, 1);
            this.reprogramContainer.add(label);
            this.reprogramLabels.push(label);
        });
    }

    // --- Menu de pausa (ESC) ---
    // Só andando: diálogo, console de puzzle e transição de sala desabilitam o
    // controle da Artemis, e em combate a sala já está pausada (o teclado nem
    // chega aqui). O modo remoto é tratado antes, em handleRoomKey.
    canPause() {
        return Boolean(this.player?.enabled) && !this.transitioning;
    }

    openPauseMenu() {
        if (!this.canPause()) {
            return;
        }

        // Data explícito: o Phaser retém o data do launch anterior quando o
        // launch vem sem dados (mesmo cuidado do launch da BattleScene).
        this.scene.launch("pause-menu", { roomScene: this.scene.key });
        this.scene.pause();
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
        }).setOrigin(0.5).setDepth(800).setVisible(false);

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

    // Cenário: mapa em imagem (quando config traz `bg`) ou grade padrão.
    drawBackdrop() {
        if (this.bgUrl) {
            this.add.image(WIDTH / 2, HEIGHT / 2, this.bgKey).setDepth(-10);

            // Scanlines.
            const scan = this.add.graphics();
            scan.setDepth(-4);
            scan.lineStyle(1, 0x000000, 0.35);
            for (let sy = 0; sy < HEIGHT; sy += 4) {
                scan.lineBetween(0, sy, WIDTH, sy);
            }
            return;
        }

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

        // Dica do modo remoto — visível quando há alvo disponível (ver update).
        this.reprogramHint = this.add.text(WIDTH - 28, HEIGHT - 28, "[R] reprogramação remota", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#5b6178"
        }).setOrigin(1, 0.5).setDepth(900).setVisible(false);

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
