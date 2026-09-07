import Phaser from "phaser";
import PlayerCharacter from "../../characters/PlayerCharacter";
import CosmoCompanion from "../../characters/CosmoCompanion";
import DialogueBox from "../../ui/DialogueBox";
import Music from "../../ui/Music";
import { tiledColliders, placeTiledObjects, preloadProps } from "../../utils/tiledMap";
import { enterScene } from "../../state/progress";
import { getHp, getMaxHp, damage as damageVitals, heal as healVitals, fullHeal, enterChapterScene } from "../../state/vitals";
import fxHealUrl from "../../assets/sprites/effects/fx_heal.png";

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

// Combate na sala (salas com `hp`): dano por contato/tiro, melee [F] e reinício.
const PLAYER_IFRAME_MS = 800;
const ENEMY_BULLET_SPEED = 190;
const ENEMY_BULLET_DAMAGE = 3;
const ENERGY_BALL_SPEED = 210;      // bolas do slam do biped (quicam nas paredes).
const ENERGY_BALL_LIFESPAN = 4500;  // até sumirem (ms).
const MELEE_RANGE = 110;
const HP_BAR = { x: 70, y: 46, w: 200, h: 10 };

export default class BaseRoomScene extends Phaser.Scene {
    constructor(key, config = {}) {
        super(key);
        this.roomTitle = config.title ?? "";
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
        // Sala com combate? Liga o dano por contato/tiro dos inimigos. O HP em si
        // é GLOBAL (state/vitals) — a MESMA vida dentro e fora de batalha; aqui só
        // decidimos se esta sala causa dano. (Aceita o antigo `hp` como fallback.)
        this.combatEnabled = config.combat ?? (config.hp ?? 0) > 0;
    }

    preload() {
        PlayerCharacter.preload(this);
        CosmoCompanion.preload(this);
        preloadProps(this);

        if (this.bgUrl && !this.textures.exists(this.bgKey)) {
            this.load.image(this.bgKey, this.bgUrl);
        }
        // Efeito de cura (Super Pixel Effects Gigapack — spell_heal, 16 quadros
        // 128x128); tocado sobre a Artemis quando ela usa um item de cura na sala.
        if (!this.textures.exists("fx-heal")) {
            this.load.spritesheet("fx-heal", fxHealUrl, { frameWidth: 128, frameHeight: 128 });
        }
        Music.preload(this, "cap1");
    }

    create() {
        // O save grava a sala onde o jogador está; registrar aqui vale para
        // todas as salas de uma vez.
        enterScene(this.scene.key);
        // Troca de capítulo cura por completo (única cura automática); passar de
        // sala dentro do mesmo capítulo NÃO cura.
        enterChapterScene(this.scene.key);
        // A música do capítulo normalmente já vem tocando desde a intro; esta
        // chamada é IDEMPOTENTE (não reinicia) e existe para quem entrou direto
        // numa sala pelo CONTINUAR, sem passar pela abertura.
        Music.play(this, "cap1");

        this.interactables = [];
        this.reprogrammables = [];
        this.enemies = [];
        this.mapColliders = [];
        this.reprogramMode = false;
        this.reprogramCooldownLeft = 0;
        this.afterimageAccumulator = 0;
        this.doorUnlocked = false;
        this.transitioning = false;
        this.maxHp = getMaxHp();
        this.hp = getHp();
        this.playerInvulnUntil = 0;

        this.drawRoom();
        this.createDoor();

        this.player = new PlayerCharacter(this, this.spawn.x, this.spawn.y);
        this.cosmo = new CosmoCompanion(this, this.player);
        this.dialogue = new DialogueBox(this);

        if (this.combatEnabled) {
            this.setupCombat();
        }
        // HP é global: mostra a barra nas salas de combate e também quando a
        // Artemis chega ferida a uma sala tranquila (para saber que precisa curar).
        if (this.combatEnabled || this.hp < this.maxHp) {
            this.drawHpBar();
        }
        // Ao voltar de uma sub-cena (batalha, reprograma, inventário), o vitals
        // pode ter mudado: ressincroniza a barra. `on` (não `once`) para sobreviver
        // ao resume do menu de pausa (que consome listeners de uso único).
        this.events.on("resume", this.resyncHp, this);
        this.events.once("shutdown", () => this.events.off("resume", this.resyncHp, this));

        if (this.mapData) {
            this.addObjectsFromTiled(this.mapData, "objetos", this.mapOffset);
            this.addCollidersFromTiled(this.mapData, "colisao", this.mapOffset);
        }

        this.input.keyboard.on("keydown-E", () => this.tryInteract());
        this.input.keyboard.on("keydown", (event) => this.handleRoomKey(event));
        // No modo [R] a mira é pelo mouse: clique confirma o alvo apontado.
        this.input.on("pointerdown", () => {
            if (this.reprogramMode) {
                this.confirmReprogram();
            }
        });

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
        this.enemies.forEach((enemy) => enemy.update(time, delta));
        this.cullEnemyBullets();
        this.updateBulletTrails();

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
            this.mapColliders.push(zone);
            // Inimigos batem nos mesmos obstáculos do mapa que o player. Cobre o
            // caso de colisores criados DEPOIS dos inimigos (o registro cobre o
            // caso inverso).
            this.enemies.forEach((enemy) => {
                if (enemy.sprite) {
                    this.physics.add.collider(enemy.sprite, zone);
                }
            });
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
                // Mira pelo mouse + destaque acompanha alvos em movimento.
                this.updateReprogramSelectionFromPointer();
                this.renderReprogramOverlay();
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

        if (event.code === "KeyF") {
            this.tryMelee();
            return;
        }

        if (event.code === "KeyI") {
            this.openInventory();
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

    // Seleciona o alvo mais próximo do ponteiro do mouse (mira livre, sem ordem).
    updateReprogramSelectionFromPointer() {
        const targets = this.availableReprogrammables();
        if (targets.length === 0) {
            return;
        }
        const p = this.input.activePointer;
        let best = 0;
        let bestDist = Infinity;
        targets.forEach((target, index) => {
            const tx = target.sprite ? target.sprite.x : target.x;
            const ty = target.sprite ? target.sprite.y : target.y;
            const d = Phaser.Math.Distance.Between(p.worldX, p.worldY, tx, ty);
            if (d < bestDist) {
                bestDist = d;
                best = index;
            }
        });
        this.reprogramIndex = best;
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
            "WASD mover   MOUSE mira o alvo   CLIQUE/[E] reprogramar   [R] cancelar",
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
            // Alvos móveis (inimigos) expõem `sprite`; máquinas fixas usam x/y.
            const tx = target.sprite ? target.sprite.x : target.x;
            const ty = target.sprite ? target.sprite.y : target.y;
            const left = tx - target.w / 2 - pad;
            const top = ty - target.h / 2 - pad;
            const w = target.w + pad * 2;
            const h = target.h + pad * 2;

            this.reprogramGraphics.lineStyle(selected ? 3 : 2, selected ? 0xf7f7f7 : 0x4ad6ff, selected ? 1 : 0.55);
            this.reprogramGraphics.strokeRect(left, top, w, h);
            if (selected) {
                this.reprogramGraphics.fillStyle(0x4ad6ff, 0.1);
                this.reprogramGraphics.fillRect(left, top, w, h);
            }

            const label = this.add.text(tx, top - 12, target.label, {
                fontFamily: "VCR",
                fontSize: selected ? "17px" : "14px",
                color: selected ? "#ffffff" : "#4ad6ff"
            }).setOrigin(0.5, 1);
            this.reprogramContainer.add(label);
            this.reprogramLabels.push(label);
        });
    }

    // --- Combate na sala (inimigos, HP, melee) ---
    setupCombat() {
        if (!this.textures.exists("enemy-bullet")) {
            const g = this.add.graphics();
            g.fillStyle(0xff4545, 1);
            g.fillCircle(9, 9, 8);
            g.fillStyle(0xffb0b0, 1);
            g.fillCircle(9, 9, 3);
            g.lineStyle(2, 0x7a1020, 1);
            g.strokeCircle(9, 9, 8);
            g.generateTexture("enemy-bullet", 18, 18);
            g.destroy();
        }
        if (!this.textures.exists("energy-ball")) {
            const g = this.add.graphics();
            g.fillStyle(0xb14aff, 0.35);
            g.fillCircle(10, 10, 9);
            g.fillStyle(0xd98cff, 1);
            g.fillCircle(10, 10, 6);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(10, 10, 3);
            g.generateTexture("energy-ball", 20, 20);
            g.destroy();
        }

        this.enemyBullets = this.physics.add.group();
        this.physics.add.overlap(this.player.sprite, this.enemyBullets, (_, bullet) => {
            bullet.destroy();
            this.damagePlayer(ENEMY_BULLET_DAMAGE);
        });

        // Rastro de partículas dos projéteis: uma faísca é emitida na posição de
        // cada bala a cada frame (ver updateBulletTrails) e some sozinha, deixando
        // um risco luminoso atrás. Quente para as balas, roxo para as bolas de
        // energia. Emissores compartilhados (não um por bala).
        if (!this.textures.exists("enemy-spark")) {
            const g = this.add.graphics();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(4, 4, 4);
            g.generateTexture("enemy-spark", 8, 8);
            g.destroy();
        }
        this.bulletTrail = this.add.particles(0, 0, "enemy-spark", {
            lifespan: 240, speed: 0, scale: { start: 1, end: 0 },
            alpha: { start: 0.7, end: 0 }, tint: 0xff7a4d, blendMode: Phaser.BlendModes.ADD, emitting: false
        }).setDepth(755);
        this.energyTrail = this.add.particles(0, 0, "enemy-spark", {
            lifespan: 300, speed: 0, scale: { start: 1.2, end: 0 },
            alpha: { start: 0.6, end: 0 }, tint: 0xc98cff, blendMode: Phaser.BlendModes.ADD, emitting: false
        }).setDepth(755);

        // Retorno da batalha de reprogramação (scene.resume com dados). Usa `on`
        // (não `once`): o menu de pausa também dá resume e consumiria o listener.
        this.onSceneResume = (_sys, data) => this.handleSceneResume(data);
        this.events.on("resume", this.onSceneResume);
        this.events.once("shutdown", () => this.events.off("resume", this.onSceneResume));
    }

    // Inimigo se registra aqui (cria a colisão de contato com a Artemis).
    registerEnemy(enemy) {
        this.enemies.push(enemy);
        // Colisão SÓLIDA com a Artemis (ela não atravessa mais o inimigo); o toque
        // ainda tira HP. Colisor, não overlap — assim os dois se bloqueiam de fato.
        this.physics.add.collider(this.player.sprite, enemy.sprite, () => {
            if (!enemy.disabled) {
                this.damagePlayer(enemy.def.contactDamage ?? ENEMY_BULLET_DAMAGE);
            }
        });
        // Colide com os obstáculos do mapa já registrados (props/paredes).
        this.mapColliders.forEach((zone) => this.physics.add.collider(enemy.sprite, zone));
        return enemy;
    }

    spawnEnemyBullet(x, y, angle, texture = "enemy-bullet", scale = 1) {
        if (!this.enemyBullets) {
            return;
        }
        const bullet = this.enemyBullets.create(x, y, texture).setDepth(760).setScale(scale);
        // Projéteis com animação própria (ex.: o do carro) tocam `<textura>-anim`.
        const animKey = `${texture}-anim`;
        if (this.anims.exists(animKey)) {
            bullet.play(animKey);
        }
        bullet.body.setVelocity(Math.cos(angle) * ENEMY_BULLET_SPEED, Math.sin(angle) * ENEMY_BULLET_SPEED);
    }

    // Bola de energia do slam do biped: quica nas paredes (bounce + world bounds)
    // e some após a vida útil. Vai no mesmo grupo — o dano ao jogador é o do
    // overlap de enemyBullets.
    spawnEnergyBall(x, y, angle) {
        if (!this.enemyBullets) {
            return;
        }
        const ball = this.enemyBullets.create(x, y, "energy-ball").setDepth(760);
        ball.body.setVelocity(Math.cos(angle) * ENERGY_BALL_SPEED, Math.sin(angle) * ENERGY_BALL_SPEED);
        ball.body.setBounce(1, 1);
        ball.body.setCollideWorldBounds(true);
        this.tweens.add({ targets: ball, angle: 360, duration: 700, repeat: -1 });
        this.time.delayedCall(ENERGY_BALL_LIFESPAN, () => ball.destroy());
    }

    // Emite uma faísca na posição de cada projétil ativo (rastro). As partículas
    // expiram sozinhas; os emissores são compartilhados e vivem com a cena.
    updateBulletTrails() {
        if (!this.enemyBullets || !this.bulletTrail) {
            return;
        }
        this.enemyBullets.getChildren().forEach((b) => {
            if (!b.active) {
                return;
            }
            const trail = b.texture.key === "energy-ball" ? this.energyTrail : this.bulletTrail;
            trail.emitParticleAt(b.x, b.y);
        });
    }

    cullEnemyBullets() {
        if (!this.enemyBullets) {
            return;
        }
        const { x, y, w, h } = this.bounds;
        this.enemyBullets.getChildren().slice().forEach((b) => {
            if (b.x < x - 30 || b.x > x + w + 30 || b.y < y - 30 || b.y > y + h + 30) {
                b.destroy();
            }
        });
    }

    damagePlayer(amount) {
        if (!this.combatEnabled || !this.player.enabled || this.time.now < this.playerInvulnUntil) {
            return;
        }
        this.playerInvulnUntil = this.time.now + PLAYER_IFRAME_MS;

        this.hp = damageVitals(amount);
        this.updateHpBar();
        this.cameras.main.shake(150, 0.004);
        this.tweens.add({
            targets: this.player.sprite,
            alpha: 0.3, duration: 90, yoyo: true, repeat: 3,
            onComplete: () => this.player.sprite.setAlpha(1)
        });

        if (this.hp <= 0) {
            this.onPlayerDowned();
        }
    }

    // HP zerado: reinicia a Artemis no spawn (sem reiniciar a sala inteira). A
    // "derrota" restaura o HP — é o reset do checkpoint, não uma cura de jogo.
    onPlayerDowned() {
        this.player.setEnabled(false);
        this.cameras.main.flash(400, 255, 40, 40);
        this.setStatus("> SISTEMAS CRÍTICOS — REINICIANDO", "#ff4545");
        this.time.delayedCall(900, () => {
            this.player.sprite.setPosition(this.spawn.x, this.spawn.y);
            this.hp = fullHeal();
            this.updateHpBar();
            this.playerInvulnUntil = this.time.now + PLAYER_IFRAME_MS;
            this.player.setEnabled(true);
            this.setStatus("");
        });
    }

    drawHpBar() {
        this.add.text(HP_BAR.x, HP_BAR.y - 12, "ARTEMIS :: HP", {
            fontFamily: "VCR", fontSize: "14px", color: "#7a8099"
        }).setOrigin(0, 0.5).setDepth(900);
        this.hpText = this.add.text(HP_BAR.x + HP_BAR.w + 12, HP_BAR.y + HP_BAR.h / 2, "", {
            fontFamily: "VCR", fontSize: "16px", color: "#e7e9f2"
        }).setOrigin(0, 0.5).setDepth(900);
        this.hpBarGraphics = this.add.graphics().setDepth(900);
        this.updateHpBar();
    }

    // Volta de uma sub-cena que mexeu no HP global (batalha/reprograma/inventário):
    // alinha o this.hp e a barra com o vitals, desenhando a barra se a Artemis
    // voltou ferida a uma sala que estava sem ela.
    resyncHp() {
        if (this.hp !== getHp()) {
            this.hp = getHp();
            if (!this.hpBarGraphics && this.hp < this.maxHp) {
                this.drawHpBar();
            } else {
                this.updateHpBar();
            }
        }
        // Efeito de cura pendente do inventário: a cura rodou com a sala pausada,
        // então toca o efeito agora, com a sala ativa e sobre a Artemis.
        if (this.pendingHealFx) {
            this.pendingHealFx = false;
            this.playHealFx();
        }
    }

    // Efeito de cura (coração do pack) sobre a Artemis, tingido no verde da cura.
    playHealFx() {
        if (!this.player || !this.textures.exists("fx-heal")) {
            return;
        }
        if (!this.anims.exists("fx-heal-anim")) {
            this.anims.create({
                key: "fx-heal-anim",
                frames: this.anims.generateFrameNumbers("fx-heal", { start: 0, end: 15 }),
                frameRate: 20,
                repeat: 0
            });
        }
        const fx = this.add.sprite(this.player.sprite.x, this.player.sprite.y - 6, "fx-heal")
            .setDepth(850)
            .setScale(0.9)
            .setTint(0x51e36b);
        fx.play("fx-heal-anim");
        fx.once("animationcomplete", () => fx.destroy());
    }

    updateHpBar() {
        if (!this.hpBarGraphics) {
            return;
        }
        const ratio = this.hp / this.maxHp;
        const color = ratio > 0.5 ? 0x51e36b : ratio > 0.25 ? 0xffb347 : 0xff4545;
        this.hpBarGraphics.clear();
        this.hpBarGraphics.lineStyle(1, 0x4ad6ff, 0.6);
        this.hpBarGraphics.strokeRect(HP_BAR.x, HP_BAR.y, HP_BAR.w, HP_BAR.h);
        this.hpBarGraphics.fillStyle(color, 0.9);
        this.hpBarGraphics.fillRect(HP_BAR.x + 1, HP_BAR.y + 1, (HP_BAR.w - 2) * ratio, HP_BAR.h - 2);
        this.hpText.setText(`${this.hp}/${this.maxHp}`);
    }

    // Melee [F]: golpeia o inimigo mais próximo em alcance (placeholder até a
    // animação de ataque da Artemis ficar pronta).
    tryMelee() {
        if (!this.player.enabled || this.transitioning || this.reprogramMode) {
            return;
        }
        let best = null;
        let bestDist = MELEE_RANGE;
        this.enemies.forEach((enemy) => {
            if (enemy.disabled) {
                return;
            }
            const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, enemy.x, enemy.y);
            if (d < bestDist) {
                best = enemy;
                bestDist = d;
            }
        });
        if (!best) {
            return;
        }
        // Lunge curto da Artemis na direção do inimigo (placeholder de ataque).
        const angle = Phaser.Math.Angle.Between(this.player.sprite.x, this.player.sprite.y, best.x, best.y);
        this.tweens.add({
            targets: this.player.sprite,
            x: this.player.sprite.x + Math.cos(angle) * 14,
            y: this.player.sprite.y + Math.sin(angle) * 14,
            duration: 80, yoyo: true
        });
        best.takeMeleeHit();
    }

    // Modo [R] confirmou um inimigo: abre a batalha de reprogramação.
    startEnemyReprogram(enemy) {
        const index = this.enemies.indexOf(enemy);
        this.player.setEnabled(false);
        this.scene.launch("cap1-reprograma", {
            config: {
                type: enemy.type,
                name: enemy.def.name,
                puzzle: enemy.reprogramPuzzle(),
                dodge: enemy.def.dodge,          // padrão do bullet hell do inimigo.
                stages: enemy.def.reprogramStages ?? 1,  // quantas camadas até cair.
                returnScene: this.scene.key,
                enemyIndex: index
            }
        });
        this.scene.pause();
    }

    handleSceneResume(data) {
        this.input.keyboard.resetKeys();
        if (!data?.enemyReprogram) {
            return;
        }
        const { index, disabled } = data.enemyReprogram;
        if (disabled) {
            // Sem texto de status: ele é desenhado no topo da sala, em cima da
            // porta. O robô caindo já é o retorno, e a própria batalha de
            // reprogramação avisa antes de fechar.
            this.enemies[index]?.disable();
        }
        this.player.setEnabled(true);
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

    // --- Inventário ([I]) ---
    // Abre por cima da sala (que fica pausada). Só enquanto a Artemis anda — nunca
    // em diálogo/console/transição (mesma regra da pausa).
    openInventory() {
        if (!this.canPause()) {
            return;
        }
        this.scene.launch("inventory", {
            config: {
                returnScene: this.scene.key,
                status: [{ label: "HP", value: this.hp, max: this.maxHp, color: 0x51e36b }],
                useItem: (item) => this.useInventoryItem(item)
            }
        });
        this.scene.pause();
    }

    // Aplica o efeito do item na Artemis. Curar mexe no HP GLOBAL (state/vitals),
    // então funciona em QUALQUER sala — de combate ou não.
    useInventoryItem(item) {
        if (item.category === "cura") {
            if (this.hp >= this.maxHp) {
                return { ok: false, message: "HP já está cheio" };
            }
            this.hp = healVitals(item.heal ?? 0);
            // A sala pode não ter barra (chegou cheia a uma sala tranquila): então
            // desenha uma agora, para a cura ter retorno visual.
            if (!this.hpBarGraphics) {
                this.drawHpBar();
            } else {
                this.updateHpBar();
            }
            // A cura acontece com a sala PAUSADA (inventário aberto); marca para
            // tocar o efeito sobre a Artemis quando a sala voltar (ver resyncHp).
            this.pendingHealFx = true;
            return { ok: true, message: `+${item.heal} HP` };
        }
        return { ok: false, message: "não dá para usar isto aqui" };
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
    }

    setStatus(text, color = "#7a8099") {
        this.statusText.setText(text).setColor(color);
    }
}
