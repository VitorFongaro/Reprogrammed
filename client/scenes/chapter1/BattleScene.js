import Phaser from "phaser";
import EniacBoss from "../../characters/EniacBoss";
import BattleMenu from "../../ui/BattleMenu";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import projetilUrl from "../../assets/sprites/projetil/projetil.png";
import { MAX_HP, getHp, setHp, fullHeal } from "../../state/vitals";
import fxLightningUrl from "../../assets/sprites/effects/fx_lightning.png";
import fxWarpUrl from "../../assets/sprites/effects/fx_warp.png";
import fxExplosionUrl from "../../assets/sprites/effects/fx_explosion.png";
import fxChargeUrl from "../../assets/sprites/effects/fx_charge.png";
import fxSparkUrl from "../../assets/sprites/effects/fx_spark.png";

// Tela de COMBATE POR TURNOS contra o ENIAC (estilo Undertale), aberta pela
// SalaSegurancaScene via scene.launch + pause. Layout: boss no topo (com barra
// de HP), caixa de combate no centro e três escolhas embaixo:
//   ATACAR      — causa dano igual à variável `forca` (sem ela, ataque padrão fraco);
//   REPROGRAMAR — console de blocos: 1ª vez cria `forca = 10`, depois
//                 `forca = forca * 2` (o jogador decide quando investir o turno);
//   ANALISAR    — descrição do boss + estado das variáveis + dica.
// No turno do ENIAC alternam dois ataques: bullet hell na caixa (a alma se move
// com WASD) e uma sequência lógica de DEFESA com tempo limite no console.
// Vitória: scene.resume("cap1-seguranca", { victory: true }). Derrota: o embate
// reinicia do zero (HP, boss e variáveis).
//
// HP: a Artemis tem UMA vida só (state/vitals) — entra na batalha com o HP que
// trouxe das salas e sai com o que sobrou. A derrota restaura o HP para o
// recomeço do embate (reset de checkpoint, não cura de jogo).

const WIDTH = 1280;
const HEIGHT = 720;

const BOSS_POS = { x: 640, y: 150, scale: 2.5 };
const BOX = { x: 640, y: 415, w: 480, h: 300 };
const MENU_Y = 624;
const STATUS_Y = 582;
const HUD_DEPTH = 40;

// --- Calibragem do combate ---
const BOSS_MAX_HP = 60;
const PLAYER_MAX_HP = MAX_HP;       // HP global da Artemis (state/vitals).
const BASE_DAMAGE = 5;              // ataque padrão, sem a variável forca.
const FORCA_INICIAL = 10;           // criada no primeiro REPROGRAMAR.
const MAX_REPROGRAMS = 2;           // limite de reprogramações por embate: o núcleo
                                    // da Artemis sobrecarrega e trava (anti-snowball
                                    // da forca dobrando). Cresce nos próximos capítulos
                                    // via config.maxReprograms (cap. 1 = 2).
const PROJECTILE_DAMAGE = 3;
const DEFENSE_FAIL_DAMAGE = 5;      // dano ao falhar a sequência de defesa.
const DEFENSE_TIME_LIMIT = 15000;   // tempo limite da defesa (ms).
const DEFENSE_CHANCE = 0.35;        // a defesa (puzzle) é OCASIONAL: os padrões de
                                    // bullet hell dominam e a defesa aparece de vez em
                                    // quando (nunca no 1º turno nem duas seguidas).
const DODGE_DURATION = 5000;        // duração do bullet hell (ms).
const PROJECTILE_INTERVAL = 300;
const PROJECTILE_SPEED = { min: 170, max: 260 };
const PROJECTILE_DRIFT = 50;
const AIMED_CHANCE = 0.4;           // chance do projétil nascer sobre a alma.

// Efeitos do Super Pixel Effects Gigapack (Will Tice / unTied Games) usados pelos
// padrões novos do ENIAC: [chave, url, tamanho do quadro, nº de quadros, fps].
const BOSS_FX = [
    ["fx-lightning", fxLightningUrl, 128, 7, 20],
    ["fx-warp", fxWarpUrl, 128, 10, 16],
    ["fx-explosion", fxExplosionUrl, 64, 8, 18],
    ["fx-charge", fxChargeUrl, 96, 12, 15],
    ["fx-spark", fxSparkUrl, 128, 12, 26]
];
const IFRAME_MS = 700;
const SOUL_SPEED = 240;

// --- Puzzles de REPROGRAMAR (tentativa única; errar consome o turno) ---
const CREATE_FORCA_PUZZLE = {
    title: "REPROGRAMAR // CRIAR VARIÁVEL",
    briefing: [
        "Seu ataque padrão mal arranha o ENIAC.",
        "Crie a sua variável de ataque:",
        "forca recebe 10 (inteiro)."
    ],
    hint: "monte:  forca = 10",
    blockSequence: [
        { category: "nome", label: "forca" },
        { category: "op", label: "=" },
        { category: "valor", label: "10" }
    ],
    blockDistractors: {
        nome: ["dano", "energia"],
        op: ["=="],
        valor: ['"10"', "0"]
    },
    successMessage: "VARIÁVEL forca CRIADA: ATAQUE = 10"
};

const DOUBLE_FORCA_PUZZLE = {
    title: "REPROGRAMAR // DOBRAR EFEITO",
    briefing: [
        "Modifique o efeito do ataque usando a",
        "própria variável:",
        "forca recebe forca vezes 2."
    ],
    hint: "monte:  forca = forca * 2",
    blockSequence: [
        { category: "nome", label: "forca" },
        { category: "op", label: "=" },
        { category: "nome", label: "forca" },
        { category: "op", label: "*" },
        { category: "valor", label: "2" }
    ],
    blockDistractors: {
        nome: ["dano"],
        op: ["+", "=="],
        valor: ["10", '"2"']
    },
    successMessage: "EFEITO DOBRADO"
};

// --- Sequências de DEFESA (turno do boss; tentativa única + tempo limite) ---
const DEFENSE_PUZZLES = [
    {
        title: "DEFESA // ESCUDO",
        briefing: [
            "Rotina hostil a caminho!",
            "Levante o escudo antes do impacto:",
            "escudo recebe true (booleano)."
        ],
        hint: "monte:  escudo = true",
        variable: "escudo",
        expected: true,
        successMessage: "IMPACTO BLOQUEADO",
        blockDistractors: {
            nome: ["campo"],
            op: ["=="],
            valor: ["false", '"true"']
        }
    },
    {
        title: "DEFESA // FIREWALL",
        briefing: [
            "Pacote corrompido a caminho!",
            "Suba o firewall na potência máxima:",
            "firewall recebe 100 (inteiro)."
        ],
        hint: "monte:  firewall = 100",
        variable: "firewall",
        expected: 100,
        successMessage: "PACOTE FILTRADO",
        blockDistractors: {
            nome: ["parede"],
            op: ["=="],
            valor: ['"100"', "50"]
        }
    }
];

// Configuração padrão (boss ENIAC). Outras cenas podem lançar a batalha com
// overrides: scene.launch("cap1-batalha", { config: { name, maxHp, ... } }) —
// é assim que a sentinela de treino reusa esta cena com números mais brandos.
//
// IMPORTANTE: SEMPRE lance com um objeto de dados ({ config: {} } no mínimo).
// O Phaser retém o settings.data do launch anterior quando o launch vem sem
// dados — um launch "seco" herdaria o config do combate anterior.
const DEFAULT_CONFIG = {
    name: "ENIAC",
    maxHp: BOSS_MAX_HP,
    returnScene: "cap1-seguranca",
    defenseEnabled: true,
    dodgeDuration: DODGE_DURATION,
    projectileInterval: PROJECTILE_INTERVAL,
    projectileSpeed: PROJECTILE_SPEED,
    bossTint: null,
    analysisLine: "ENIAC — UNIDADE DE CUSTÓDIA, 1946.",
    // Padrão do bullet hell: "rain" (chuva vertical, ENIAC) ou "sweep"
    // (varredura lateral em fileiras com brecha, sentinela).
    dodgePattern: "rain",
    // O ENIAC (boss final) CICLA quatro padrões a cada turno de esquiva: a chuva
    // clássica + três com os efeitos do pack (raios, fendas que explodem e a nova
    // carregada).
    dodgePatterns: ["rain", "lightning", "warpMines", "nova"]
};

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super("cap1-batalha");
    }

    init(data) {
        this.config = { ...DEFAULT_CONFIG, ...(data?.config ?? {}) };
    }

    preload() {
        EniacBoss.preload(this);
        BlockProgrammingConsole.preload(this);
        if (!this.textures.exists("projetil")) {
            this.load.spritesheet("projetil", projetilUrl, { frameWidth: 32, frameHeight: 32 });
        }
        BOSS_FX.forEach(([key, url, size]) => {
            if (!this.textures.exists(key)) {
                this.load.spritesheet(key, url, { frameWidth: size, frameHeight: size });
            }
        });
        // Combatentes customizados (ex.: dupla de sentinelas): sheets via config.
        (this.config.combatants ?? []).forEach((c) => {
            if (!this.textures.exists(`${c.key}-walk`)) {
                this.load.spritesheet(`${c.key}-walk`, c.walkUrl, { frameWidth: 32, frameHeight: 32 });
            }
            if (!this.textures.exists(`${c.key}-disabled`)) {
                this.load.spritesheet(`${c.key}-disabled`, c.disabledUrl, { frameWidth: 32, frameHeight: 32 });
            }
        });
    }

    create() {
        this.bossHp = this.config.maxHp;
        this.hp = getHp();              // entra com o HP que trouxe das salas.
        this.forca = null;
        this.reprogramCount = 0;
        this.maxReprograms = this.config.maxReprograms ?? MAX_REPROGRAMS;
        this.bossAttackIndex = 0;
        this.lastWasDefense = false;
        this.dodgeActive = false;
        this.invulnUntil = 0;
        this.itemUsedThisTurn = false;
        this.dodgeIndex = 0;
        this.dodgePatterns = this.config.dodgePatterns ?? [this.config.dodgePattern];
        this.bounceBalls = [];
        this.patternFx = [];   // efeitos/telegrafos ativos dos padrões (limpos no stopDodge)
        this.hazards = [];     // zonas de perigo ativas (coluna do raio / raio da explosão)

        this.drawBackdrop();
        this.createTextures();
        // Boss único (ENIAC) ou vários combatentes (dupla de sentinelas): quando a
        // config traz `combatants`, o topo mostra esses sprites e o HP é um pool
        // combinado (a dupla luta "de uma vez").
        if (this.config.combatants) {
            this.createCombatants();
        } else {
            this.boss = new EniacBoss(this, BOSS_POS.x, BOSS_POS.y, {
                scale: BOSS_POS.scale,
                tint: this.config.bossTint
            });
        }
        this.drawBox();
        this.drawHud();
        this.createSoul();

        this.menu = new BattleMenu(this, {
            x: WIDTH / 2,
            y: MENU_Y,
            actions: [
                { id: "atacar", label: "ATACAR" },
                { id: "reprogramar", label: "REPROGRAMAR" },
                { id: "itens", label: "ITENS" },
                { id: "analisar", label: "ANALISAR" }
            ],
            onSelect: (id) => this.handleAction(id)
        });

        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Retorno do inventário (ação ITENS): usar item consome o turno.
        this.onInventoryResume = () => this.handleInventoryResume();
        this.events.on("resume", this.onInventoryResume);
        this.events.once("shutdown", () => this.events.off("resume", this.onInventoryResume));

        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.setBattleStatus(`${this.config.name} :: COMBATE INICIADO`, "#7a8099");
        this.time.delayedCall(700, () => this.playerTurn());
    }

    update() {
        // Movimento da alma (WASD) durante o bullet hell.
        if (this.dodgeActive && this.soul.visible) {
            let vx = 0;
            let vy = 0;
            if (this.keys.left.isDown) vx -= 1;
            if (this.keys.right.isDown) vx += 1;
            if (this.keys.up.isDown) vy -= 1;
            if (this.keys.down.isDown) vy += 1;
            const norm = vx !== 0 && vy !== 0 ? Math.SQRT1_2 : 1;
            this.soul.body.setVelocity(vx * SOUL_SPEED * norm, vy * SOUL_SPEED * norm);
        } else if (this.soul.body) {
            this.soul.body.setVelocity(0, 0);
        }

        // Projéteis que saíram da caixa somem (qualquer borda, para os padrões
        // radiais). As bolas quicantes são poupadas — elas quicam (updateSplitBounce).
        if (this.projectiles) {
            const left = BOX.x - BOX.w / 2;
            const right = BOX.x + BOX.w / 2;
            const top = BOX.y - BOX.h / 2;
            const bottom = BOX.y + BOX.h / 2;
            const m = 26;
            this.projectiles.getChildren().slice().forEach((proj) => {
                if (proj.bouncing) {
                    return;
                }
                if (proj.x < left - m || proj.x > right + m || proj.y < top - m || proj.y > bottom + m) {
                    proj.destroy();
                }
            });
        }

        if (this.dodgeActive) {
            this.updateSplitBounce();
            this.updateHazards();
        }
    }

    // --- Cenário e HUD ---
    drawBackdrop() {
        this.cameras.main.setBackgroundColor("#050505");

        const scan = this.add.graphics();
        scan.lineStyle(1, 0x000000, 0.35);
        for (let sy = 0; sy < HEIGHT; sy += 4) {
            scan.lineBetween(0, sy, WIDTH, sy);
        }
        scan.setDepth(-4);
    }

    drawBox() {
        const box = this.add.graphics();
        box.fillStyle(0x000000, 1);
        box.fillRect(BOX.x - BOX.w / 2, BOX.y - BOX.h / 2, BOX.w, BOX.h);
        box.lineStyle(3, 0xf7f7f7, 0.95);
        box.strokeRect(BOX.x - BOX.w / 2, BOX.y - BOX.h / 2, BOX.w, BOX.h);

        // Texto de análise (aparece dentro da caixa ao usar ANALISAR).
        this.analysisText = this.add.text(BOX.x, BOX.y, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#e7e9f2",
            align: "center",
            lineSpacing: 12
        }).setOrigin(0.5).setDepth(25).setVisible(false);
    }

    drawHud() {
        // HP do boss (topo).
        this.add.text(WIDTH / 2, 36, this.config.name, {
            fontFamily: "VCR",
            fontSize: "20px",
            color: "#ff4545"
        }).setOrigin(0.5).setDepth(HUD_DEPTH);
        this.bossHpText = this.add.text(WIDTH / 2 + 170, 58, "", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#e7e9f2"
        }).setOrigin(0, 0.5).setDepth(HUD_DEPTH);
        this.bossHpGraphics = this.add.graphics().setDepth(HUD_DEPTH);
        this.updateBossHp();

        // HP da Artemis (rodapé, esquerda).
        this.add.text(70, 666, "ARTEMIS :: HP", {
            fontFamily: "VCR",
            fontSize: "14px",
            color: "#7a8099"
        }).setOrigin(0, 0.5).setDepth(HUD_DEPTH);
        this.hpText = this.add.text(282, 687, "", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#e7e9f2"
        }).setOrigin(0, 0.5).setDepth(HUD_DEPTH);
        this.hpGraphics = this.add.graphics().setDepth(HUD_DEPTH);
        this.updateHpBar();

        // Estado da variável de ataque (rodapé, direita).
        this.forcaText = this.add.text(WIDTH - 70, 682, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(1, 0.5).setDepth(HUD_DEPTH);
        this.updateForca();

        // Linha de status do combate.
        this.statusText = this.add.text(WIDTH / 2, STATUS_Y, "", {
            fontFamily: "VCR",
            fontSize: "17px",
            color: "#7a8099"
        }).setOrigin(0.5).setDepth(HUD_DEPTH);
    }

    updateBossHp() {
        const w = 320;
        const x = WIDTH / 2 - w / 2;
        const ratio = this.bossHp / this.config.maxHp;

        this.bossHpGraphics.clear();
        this.bossHpGraphics.lineStyle(1, 0xff4545, 0.7);
        this.bossHpGraphics.strokeRect(x, 52, w, 12);
        this.bossHpGraphics.fillStyle(0xff4545, 0.9);
        this.bossHpGraphics.fillRect(x + 1, 53, (w - 2) * ratio, 10);
        this.bossHpText.setText(`${this.bossHp}/${this.config.maxHp}`);
    }

    updateHpBar() {
        const bar = { x: 70, y: 682, w: 200, h: 10 };
        const ratio = this.hp / PLAYER_MAX_HP;
        const color = ratio > 0.5 ? 0x51e36b : ratio > 0.25 ? 0xffb347 : 0xff4545;

        this.hpGraphics.clear();
        this.hpGraphics.lineStyle(1, 0x4ad6ff, 0.6);
        this.hpGraphics.strokeRect(bar.x, bar.y, bar.w, bar.h);
        this.hpGraphics.fillStyle(color, 0.9);
        this.hpGraphics.fillRect(bar.x + 1, bar.y + 1, (bar.w - 2) * ratio, bar.h - 2);
        this.hpText.setText(`${this.hp}/${PLAYER_MAX_HP}`);
    }

    updateForca() {
        const forca = this.forca === null ? "FORÇA: --" : `FORÇA: ${this.forca}`;
        this.forcaText.setText(`${forca}   REPROG: ${this.reprogramCount}/${this.maxReprograms}`);
    }

    setBattleStatus(text, color = "#7a8099") {
        this.statusText.setText(text).setColor(color);
    }

    // --- Alma (avatar do jogador no bullet hell) e projéteis ---
    createTextures() {
        if (!this.textures.exists("battle-soul")) {
            const g = this.add.graphics();
            g.fillStyle(0x4ad6ff, 1);
            g.fillPoints([
                { x: 7, y: 0 },
                { x: 14, y: 7 },
                { x: 7, y: 14 },
                { x: 0, y: 7 }
            ], true);
            g.generateTexture("battle-soul", 14, 14);
            g.destroy();
        }

        // Orbe de energia (bola grande dos padrões espiral e quicante).
        if (!this.textures.exists("battle-orb")) {
            const g = this.add.graphics();
            g.fillStyle(0xff7a1f, 0.30); g.fillCircle(20, 20, 20);
            g.fillStyle(0xff9d4d, 1); g.fillCircle(20, 20, 13);
            g.fillStyle(0xffe0b0, 1); g.fillCircle(20, 20, 6);
            g.lineStyle(2, 0x7a3810, 1); g.strokeCircle(20, 20, 18);
            g.generateTexture("battle-orb", 40, 40);
            g.destroy();
        }

        // Projétil animado do dev (assets/sprites/projetil, 8 quadros 32x32).
        if (!this.anims.exists("projetil-anim")) {
            this.anims.create({
                key: "projetil-anim",
                frames: this.anims.generateFrameNumbers("projetil", { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }

        // Efeitos do pack (tocam uma vez): raio, portal, explosão, carga, faísca.
        BOSS_FX.forEach(([key, , , frames, rate]) => {
            if (!this.anims.exists(`${key}-anim`)) {
                this.anims.create({
                    key: `${key}-anim`,
                    frames: this.anims.generateFrameNumbers(key, { start: 0, end: frames - 1 }),
                    frameRate: rate,
                    repeat: 0
                });
            }
        });
    }

    createSoul() {
        this.soul = this.physics.add.image(BOX.x, BOX.y, "battle-soul")
            .setDepth(30)
            .setVisible(false);
        this.soul.body.setCollideWorldBounds(true);
        this.soul.body.setBoundsRectangle(new Phaser.Geom.Rectangle(
            BOX.x - BOX.w / 2 + 8,
            BOX.y - BOX.h / 2 + 8,
            BOX.w - 16,
            BOX.h - 16
        ));

        this.projectiles = this.physics.add.group();
        this.physics.add.overlap(this.soul, this.projectiles, (_, proj) => {
            this.handleProjectileHit(proj);
        });
    }

    // --- Combatentes (dupla de sentinelas) e dispatch de reações ---
    // Sem EniacBoss: renderiza um sprite por combatente no topo, com HP combinado.
    createCombatants() {
        this.combatantSprites = [];
        this.config.combatants.forEach((c) => {
            const walkKey = `${c.key}-walk`;
            const disabledKey = `${c.key}-disabled`;
            if (!this.anims.exists(walkKey)) {
                this.anims.create({ key: walkKey, frames: this.anims.generateFrameNumbers(walkKey, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
            }
            if (!this.anims.exists(disabledKey)) {
                this.anims.create({ key: disabledKey, frames: this.anims.generateFrameNumbers(disabledKey, { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
            }
            const s = this.add.sprite(c.x, c.y ?? BOSS_POS.y, walkKey, 0)
                .setScale(c.scale ?? 3)
                .setDepth(HUD_DEPTH - 1);
            s.play(walkKey);
            s.baseY = c.y ?? BOSS_POS.y;
            s.disabledKey = disabledKey;
            this.combatantSprites.push(s);
        });
    }

    // Reação ao levar dano (piscar branco). Boss ou dupla.
    foeHit() {
        if (this.boss) {
            this.boss.hit();
            return;
        }
        this.combatantSprites.forEach((s) => {
            s.setTintFill(0xffffff);
            this.time.delayedCall(90, () => { if (s.active) s.clearTint(); });
        });
    }

    // Telegrafo do ataque; chama `cb` quando pode começar o bullet hell.
    foeAttackAnim(cb) {
        if (this.boss) {
            this.boss.attackAnim(cb);
            return;
        }
        this.combatantSprites.forEach((s) => {
            this.tweens.add({ targets: s, y: s.baseY + 18, duration: 140, yoyo: true, ease: "Quad.easeOut" });
            s.setTintFill(0xffb347);
            this.time.delayedCall(160, () => { if (s.active) s.clearTint(); });
        });
        this.time.delayedCall(320, cb);
    }

    foePowerDown() {
        if (this.boss) {
            this.boss.powerDown();
            return;
        }
        this.combatantSprites.forEach((s) => {
            s.play(s.disabledKey);
            this.tweens.add({ targets: s, y: s.baseY + 8, alpha: 0.75, duration: 500, ease: "Quad.easeOut" });
        });
    }

    // --- Turno do jogador ---
    playerTurn() {
        this.setBattleStatus("> SEU TURNO — ESCOLHA UMA AÇÃO", "#4ad6ff");
        this.menu.show();
    }

    handleAction(id) {
        if (id === "atacar") {
            this.attack();
        } else if (id === "reprogramar") {
            this.reprogram();
        } else if (id === "itens") {
            this.openItems();
        } else {
            this.analyze();
        }
    }

    // --- Itens (inventário na batalha) ---
    openItems() {
        this.itemUsedThisTurn = false;
        this.scene.launch("inventory", {
            config: {
                returnScene: this.scene.key,
                battle: true,
                status: [
                    { label: "HP", value: this.hp, max: PLAYER_MAX_HP, color: 0x51e36b },
                    { label: "FORÇA", value: this.forca ?? 0, text: this.forca === null ? "--" : String(this.forca) }
                ],
                useItem: (item) => this.useBattleItem(item)
            }
        });
        this.scene.pause();
    }

    useBattleItem(item) {
        if (item.category === "cura") {
            if (this.hp >= PLAYER_MAX_HP) {
                return { ok: false, message: "HP já está cheio" };
            }
            this.hp = setHp(this.hp + (item.heal ?? 0));
            this.updateHpBar();
            this.itemUsedThisTurn = true;
            return { ok: true, message: `+${item.heal} HP` };
        }
        if (item.category === "reprogramacao") {
            // Efeito real depende do design dos itens; por ora, consome o turno.
            this.itemUsedThisTurn = true;
            return { ok: true, message: "módulo ativado" };
        }
        return { ok: false, message: "não dá para usar isto em batalha" };
    }

    // Inventário fechou: usar item passa o turno para o boss; só olhar volta ao menu.
    handleInventoryResume() {
        this.input.keyboard.resetKeys?.();
        if (this.itemUsedThisTurn) {
            this.itemUsedThisTurn = false;
            this.setBattleStatus("> ITEM USADO", "#51e36b");
            this.time.delayedCall(700, () => this.bossTurn());
        } else {
            this.playerTurn();
        }
    }

    attack() {
        const damage = this.forca ?? BASE_DAMAGE;

        this.foeHit();
        this.cameras.main.shake(220, 0.004);
        this.bossHp = Math.max(0, this.bossHp - damage);
        this.updateBossHp();

        this.setBattleStatus(
            this.forca === null
                ? `> ATAQUE PADRÃO: -${damage} HP  (REPROGRAMAR aumenta o dano)`
                : `> GOLPE COM FORÇA ${this.forca}: -${damage} HP`,
            "#51e36b"
        );

        if (this.bossHp <= 0) {
            this.time.delayedCall(700, () => this.victory());
        } else {
            this.time.delayedCall(1100, () => this.bossTurn());
        }
    }

    reprogram() {
        // Limite anti-sobrecarga: o núcleo da Artemis não aguenta reprogramar
        // indefinidamente. Bater no teto NÃO gasta o turno — volta ao menu.
        if (this.reprogramCount >= this.maxReprograms) {
            this.setBattleStatus("> NÚCLEO EM SOBRECARGA — REPROGRAMAÇÃO BLOQUEADA", "#ff4545");
            this.time.delayedCall(1100, () => this.playerTurn());
            return;
        }

        const puzzle = this.forca === null ? CREATE_FORCA_PUZZLE : DOUBLE_FORCA_PUZZLE;
        let solvedThisRun = false;

        this.console = new BlockProgrammingConsole(this, puzzle, {
            singleAttempt: true,
            onSolved: () => {
                solvedThisRun = true;
            },
            // Mudou de ideia antes de montar a instrução: [ESC] volta ao menu de
            // ações SEM perder o turno (só cancela quem não chegou a tentar).
            onCancel: () => {
                this.playerTurn();
            },
            onClose: () => {
                if (solvedThisRun) {
                    this.reprogramCount += 1;
                    this.forca = this.forca === null ? FORCA_INICIAL : this.forca * 2;
                    this.updateForca();
                    const left = this.maxReprograms - this.reprogramCount;
                    const tail = left > 0
                        ? `  (mais ${left})`
                        : "  (LIMITE: núcleo em sobrecarga)";
                    this.setBattleStatus(`> ATAQUE REPROGRAMADO: FORÇA = ${this.forca}${tail}`, "#51e36b");
                } else {
                    this.setBattleStatus("> REPROGRAMAÇÃO FALHOU — TURNO PERDIDO", "#ff4545");
                }
                this.time.delayedCall(1000, () => this.bossTurn());
            }
        });
        this.console.open();
    }

    analyze() {
        this.setBattleStatus("> ANALISANDO...", "#4ad6ff");

        const forcaLine = this.forca === null
            ? "Nenhuma variável de ataque na memória."
            : `Sua variável forca vale ${this.forca}.`;
        const reprogLeft = this.maxReprograms - this.reprogramCount;
        const hintLine = reprogLeft <= 0
            ? "Núcleo em sobrecarga: sem mais REPROGRAMAR neste embate."
            : this.forca === null
                ? "Dica: REPROGRAMAR cria a variável forca."
                : "Dica: REPROGRAMAR dobra a força (forca = forca * 2).";

        this.analysisText.setText([
            this.config.analysisLine,
            `INTEGRIDADE: ${this.bossHp}/${this.config.maxHp}`,
            forcaLine,
            `REPROGRAMAÇÕES: ${this.reprogramCount}/${this.maxReprograms}`,
            hintLine
        ].join("\n")).setVisible(true);

        this.time.delayedCall(3800, () => {
            this.analysisText.setVisible(false);
            this.bossTurn();
        });
    }

    // --- Turno do ENIAC: bullet hell (padrão) OU, de vez em quando, a sequência
    // de defesa com tempo. Os padrões de esquiva DOMINAM; a defesa é OCASIONAL —
    // nunca no 1º turno e nunca duas seguidas, para não virar "só o puzzle". ---
    bossTurn() {
        const canDefend = this.config.defenseEnabled
            && this.bossAttackIndex > 0
            && !this.lastWasDefense;
        const useDefense = canDefend && Math.random() < DEFENSE_CHANCE;
        this.bossAttackIndex += 1;
        this.lastWasDefense = useDefense;

        if (useDefense) {
            this.defenseTurn();
        } else {
            this.dodgeTurn();
        }
    }

    dodgeTurn() {
        const pattern = this.dodgePatterns[this.dodgeIndex % this.dodgePatterns.length];
        this.dodgeIndex += 1;
        this.currentPattern = pattern;

        this.setBattleStatus(`> TURNO DE ${this.config.name} — DESVIE COM WASD!`, "#ff4545");
        // Espiral e nova nascem no centro: começa a alma mais embaixo, longe do foco.
        const startY = pattern === "spiral" || pattern === "nova" ? BOX.y + BOX.h / 2 - 30 : BOX.y;
        this.soul.body.reset(BOX.x, startY);
        this.soul.setVisible(true);
        this.dodgeActive = true;

        this.foeAttackAnim(() => {
            if (!this.dodgeActive) {
                return;
            }
            // Agenda o fim do turno ANTES de montar o padrão: assim o turno sempre
            // termina e volta para o menu, mesmo se um padrão específico falhar.
            this.dodgeTimer = this.time.delayedCall(this.config.dodgeDuration, () => this.endDodge());
            this.startPattern(pattern);
        });
    }

    endDodge() {
        this.stopDodge();
        if (this.hp > 0) {
            this.time.delayedCall(400, () => this.playerTurn());
        }
    }

    stopDodge() {
        this.dodgeActive = false;
        this.spawnTimer?.remove();
        this.spawnTimer = null;
        this.dodgeTimer?.remove();
        this.dodgeTimer = null;
        this.crossTimer?.remove();
        this.crossTimer = null;
        if (this.centralBall) {
            this.tweens.killTweensOf(this.centralBall);
            this.centralBall.destroy();
            this.centralBall = null;
        }
        this.bounceBalls = [];
        this.patternFx?.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); });
        this.patternFx = [];
        this.hazards = [];
        this.projectiles?.clear(true, true);
        this.soul?.setVisible(false);
    }

    // Prepara o padrão do turno. Os padrões antigos (rain/sweep) usam um timer de
    // spawn por intervalo; os novos montam os próprios timers/estado.
    startPattern(name) {
        if (name === "spiral") {
            this.startSpiral();
            return;
        }
        if (name === "splitBounce") {
            this.startSplitBounce();
            return;
        }
        if (name === "touhouCross") {
            this.startTouhouCross();
            return;
        }
        if (name === "lightning") {
            this.startLightning();
            return;
        }
        if (name === "warpMines") {
            this.startWarpMines();
            return;
        }
        if (name === "nova") {
            this.startNova();
            return;
        }
        const spawn = name === "sweep" ? () => this.spawnSweepWave() : () => this.spawnProjectile();
        this.spawnTimer = this.time.addEvent({
            delay: this.config.projectileInterval,
            loop: true,
            callback: spawn
        });
    }

    // Bala radial genérica (padrões espiral e cruz): sai de (x,y) num ângulo.
    spawnRadial(x, y, angle, speed) {
        const proj = this.projectiles.create(x, y, "projetil");
        proj.setDepth(28).setScale(0.6);
        proj.play("projetil-anim");
        proj.body.setSize(18, 18, true);
        proj.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        return proj;
    }

    // PADRÃO 1 — Espiral: uma orbe grande gira no centro e cospe balas em braços
    // que giram (o ângulo de emissão avança a cada tique).
    startSpiral() {
        this.spiralAngle = 0;
        this.centralBall = this.add.image(BOX.x, BOX.y, "battle-orb").setDepth(27).setScale(1.4);
        this.tweens.add({ targets: this.centralBall, angle: 360, duration: 1400, repeat: -1 });
        this.tweens.add({ targets: this.centralBall, scale: 1.65, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.spawnTimer = this.time.addEvent({ delay: 115, loop: true, callback: () => this.spiralTick() });
    }

    spiralTick() {
        const arms = 3;
        const speed = 150;
        for (let i = 0; i < arms; i += 1) {
            const a = this.spiralAngle + (i / arms) * Math.PI * 2;
            this.spawnRadial(BOX.x, BOX.y, a, speed);
        }
        this.spiralAngle += 0.42;
    }

    // PADRÃO 2 — Quicar e dividir: bolas grandes quicam nas bordas e a cada quicada
    // se dividem em duas menores (até um tamanho mínimo). Movimento/quique tratados
    // à mão em updateSplitBounce.
    startSplitBounce() {
        this.bounceBalls = [];
        for (let i = 0; i < 2; i += 1) {
            const angle = Phaser.Math.FloatBetween(0.6, Math.PI - 0.6) + (i * Math.PI);
            const x = Phaser.Math.Between(BOX.x - BOX.w / 2 + 70, BOX.x + BOX.w / 2 - 70);
            const y = Phaser.Math.Between(BOX.y - BOX.h / 2 + 60, BOX.y + BOX.h / 2 - 60);
            this.spawnBounceBall(x, y, angle, 0);
        }
    }

    spawnBounceBall(x, y, angle, gen) {
        const speed = 110 + gen * 35;
        const scale = 1.5 - gen * 0.45;         // grande no gen 0, menor a cada divisão.
        const ball = this.projectiles.create(x, y, "battle-orb").setDepth(28).setScale(scale);
        ball.bouncing = true;
        ball.gen = gen;
        ball.radius = 20 * scale;
        ball.body.setSize(34, 34, true);
        ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.bounceBalls.push(ball);
        return ball;
    }

    updateSplitBounce() {
        if (!this.bounceBalls || this.bounceBalls.length === 0) {
            return;
        }
        const left = BOX.x - BOX.w / 2;
        const right = BOX.x + BOX.w / 2;
        const top = BOX.y - BOX.h / 2;
        const bottom = BOX.y + BOX.h / 2;
        const maxGen = 2;

        this.bounceBalls.slice().forEach((ball) => {
            if (!ball.active) {
                this.removeBounceBall(ball);
                return;
            }
            const r = ball.radius;
            let bounced = false;
            if (ball.x - r <= left) { ball.body.velocity.x = Math.abs(ball.body.velocity.x); ball.x = left + r; bounced = true; }
            else if (ball.x + r >= right) { ball.body.velocity.x = -Math.abs(ball.body.velocity.x); ball.x = right - r; bounced = true; }
            if (ball.y - r <= top) { ball.body.velocity.y = Math.abs(ball.body.velocity.y); ball.y = top + r; bounced = true; }
            else if (ball.y + r >= bottom) { ball.body.velocity.y = -Math.abs(ball.body.velocity.y); ball.y = bottom - r; bounced = true; }

            if (bounced && ball.gen < maxGen) {
                const base = Math.atan2(ball.body.velocity.y, ball.body.velocity.x);
                const px = ball.x;
                const py = ball.y;
                const gen = ball.gen;
                this.removeBounceBall(ball);
                ball.destroy();
                this.spawnBounceBall(px, py, base - 0.5, gen + 1);
                this.spawnBounceBall(px, py, base + 0.5, gen + 1);
            }
        });
    }

    removeBounceBall(ball) {
        const i = this.bounceBalls.indexOf(ball);
        if (i >= 0) {
            this.bounceBalls.splice(i, 1);
        }
    }

    // PADRÃO 3 — Cruz Touhou: um "+" de balas surge em volta da alma e converge
    // para dentro; as diagonais são as aberturas por onde escapar. Some e reaparece
    // na posição atual da alma, sucessivamente.
    startTouhouCross() {
        this.spawnCross();
        this.crossTimer = this.time.addEvent({ delay: 1150, loop: true, callback: () => this.spawnCross() });
    }

    spawnCross() {
        if (!this.dodgeActive) {
            return;
        }
        const cx = this.soul.x;
        const cy = this.soul.y;
        const arms = [0, Math.PI / 2, Math.PI, -Math.PI / 2];   // direita/baixo/esquerda/cima.
        const count = 4;
        const rStart = 66;
        const rStep = 22;
        const speed = 74;
        arms.forEach((base) => {
            for (let k = 0; k < count; k += 1) {
                const r = rStart + k * rStep;
                this.spawnRadial(cx + Math.cos(base) * r, cy + Math.sin(base) * r, base + Math.PI, speed);
            }
        });
    }

    // Varredura (sentinela): uma fileira vertical de fragmentos entra por um dos
    // lados da caixa (alternando) e cruza na horizontal; a brecha de 2 fileiras
    // é a passagem — o desvio é vertical, o oposto da chuva do ENIAC.
    spawnSweepWave() {
        const fromLeft = (this.sweepCount ?? 0) % 2 === 0;
        this.sweepCount = (this.sweepCount ?? 0) + 1;

        const spacing = 36;
        const top = BOX.y - BOX.h / 2 + 16;
        const rows = Math.floor((BOX.h - 32) / spacing) + 1;
        const gapStart = Phaser.Math.Between(0, rows - 2);
        const speed = Phaser.Math.Between(this.config.projectileSpeed.min, this.config.projectileSpeed.max);
        const x = fromLeft ? BOX.x - BOX.w / 2 + 10 : BOX.x + BOX.w / 2 - 10;

        for (let row = 0; row < rows; row += 1) {
            if (row === gapStart || row === gapStart + 1) {
                continue;
            }
            const proj = this.projectiles.create(x, top + row * spacing, "projetil");
            proj.setDepth(28).setScale(0.75);
            proj.play("projetil-anim");
            proj.body.setSize(20, 20, true);
            proj.body.setVelocity(fromLeft ? speed : -speed, 0);
        }
    }

    spawnProjectile() {
        const left = BOX.x - BOX.w / 2 + 14;
        const right = BOX.x + BOX.w / 2 - 14;
        const aimed = Math.random() < AIMED_CHANCE;
        const px = aimed
            ? this.soul.x + Phaser.Math.Between(-24, 24)
            : Phaser.Math.Between(left, right);

        const proj = this.projectiles.create(
            Phaser.Math.Clamp(px, left, right),
            BOX.y - BOX.h / 2 + 12,
            "projetil"
        );
        proj.setDepth(28).setScale(0.75);
        proj.play("projetil-anim");
        proj.body.setSize(20, 20, true);
        proj.body.setVelocity(
            Phaser.Math.Between(-PROJECTILE_DRIFT, PROJECTILE_DRIFT),
            Phaser.Math.Between(this.config.projectileSpeed.min, this.config.projectileSpeed.max)
        );
    }

    handleProjectileHit(proj) {
        if (!this.dodgeActive) {
            return;
        }
        proj.destroy();

        if (this.time.now < this.invulnUntil) {
            return;
        }
        this.invulnUntil = this.time.now + IFRAME_MS;

        this.tweens.add({
            targets: this.soul,
            alpha: 0.25,
            duration: 90,
            yoyo: true,
            repeat: 3,
            onComplete: () => this.soul.setAlpha(1)
        });

        this.damagePlayer(PROJECTILE_DAMAGE);
    }

    // === Padrões novos do ENIAC (usam os efeitos do pack) ======================

    // Toca um efeito do pack (spritesheet) uma vez e some sozinho. Rastreado em
    // patternFx para o stopDodge limpar o que ainda estiver na tela.
    spawnFx(key, x, y, { scale = 1, scaleY = null, depth = 26 } = {}) {
        const spr = this.add.sprite(x, y, key).setDepth(depth);
        spr.setScale(scale, scaleY ?? scale);
        spr.play(`${key}-anim`);
        spr.once("animationcomplete", () => this.destroyFx(spr));
        this.patternFx.push(spr);
        return spr;
    }

    // Remove um efeito/telegrafo rastreado, matando antes qualquer tween nele (o
    // pulso infinito da faixa/linha-guia erraria ao rodar sobre um objeto morto).
    destroyFx(obj) {
        const i = this.patternFx.indexOf(obj);
        if (i >= 0) {
            this.patternFx.splice(i, 1);
        }
        this.tweens.killTweensOf(obj);
        obj.destroy();
    }

    // Zonas de perigo dos padrões de área (raio/explosão): enquanto ativas, a alma
    // dentro delas leva dano (com i-frames, igual aos projéteis). "column" = faixa
    // vertical do raio; "circle" = raio da explosão.
    updateHazards() {
        if (!this.hazards.length) {
            return;
        }
        const now = this.time.now;
        this.hazards = this.hazards.filter((h) => now <= h.until);
        if (now < this.invulnUntil) {
            return;
        }
        const sx = this.soul.x;
        const sy = this.soul.y;
        const hit = this.hazards.some((h) => {
            if (now < h.from) {
                return false;
            }
            return h.shape === "column"
                ? Math.abs(sx - h.x) <= h.halfW
                : (sx - h.x) ** 2 + (sy - h.y) ** 2 <= h.r * h.r;
        });
        if (!hit) {
            return;
        }
        this.invulnUntil = now + IFRAME_MS;
        this.tweens.add({
            targets: this.soul, alpha: 0.25, duration: 90, yoyo: true, repeat: 3,
            onComplete: () => this.soul.setAlpha(1)
        });
        this.damagePlayer(PROJECTILE_DAMAGE);
    }

    // PADRÃO 4 — RAIOS: uma coluna é telegrafada (faixa violeta) e um relâmpago cai
    // ali; o clarão é a zona de dano por um instante. Desvio horizontal.
    startLightning() {
        this.spawnLightning();
        this.spawnTimer = this.time.addEvent({ delay: 900, loop: true, callback: () => this.spawnLightning() });
    }

    spawnLightning() {
        if (!this.dodgeActive) {
            return;
        }
        const margin = 44;
        const colX = Phaser.Math.Between(BOX.x - BOX.w / 2 + margin, BOX.x + BOX.w / 2 - margin);
        const halfW = 26;

        const tele = this.add.rectangle(colX, BOX.y, halfW * 2, BOX.h - 14, 0xb14aff, 0.14)
            .setStrokeStyle(1, 0xb14aff, 0.55).setDepth(24);
        this.patternFx.push(tele);
        this.tweens.add({ targets: tele, alpha: 0.30, duration: 190, yoyo: true, repeat: -1 });

        this.time.delayedCall(600, () => {
            if (!this.dodgeActive) {
                this.destroyFx(tele);
                return;
            }
            this.spawnFx("fx-lightning", colX, BOX.y, {
                depth: 27,
                scale: (halfW * 2 + 18) / 128,
                scaleY: (BOX.h + 24) / 128
            });
            this.hazards.push({ shape: "column", x: colX, halfW, from: this.time.now, until: this.time.now + 240 });
            this.tweens.add({
                targets: tele, alpha: 0, duration: 200,
                onComplete: () => this.destroyFx(tele)
            });
        });
    }

    // PADRÃO 5 — FENDAS: portais sci-fi se abrem (aviso) e EXPLODEM; o estouro é uma
    // zona de dano circular. Fuja do raio da explosão.
    startWarpMines() {
        this.spawnWarpMine();
        this.spawnTimer = this.time.addEvent({ delay: 760, loop: true, callback: () => this.spawnWarpMine() });
    }

    spawnWarpMine() {
        if (!this.dodgeActive) {
            return;
        }
        const margin = 56;
        const x = Phaser.Math.Between(BOX.x - BOX.w / 2 + margin, BOX.x + BOX.w / 2 - margin);
        const y = Phaser.Math.Between(BOX.y - BOX.h / 2 + margin, BOX.y + BOX.h / 2 - margin);

        this.spawnFx("fx-warp", x, y, { depth: 24, scale: 0.7 });
        this.time.delayedCall(470, () => {
            if (!this.dodgeActive) {
                return;
            }
            this.spawnFx("fx-explosion", x, y, { depth: 29, scale: 1.9 });
            this.hazards.push({ shape: "circle", x, y, r: 48, from: this.time.now + 30, until: this.time.now + 330 });
        });
    }

    // PADRÃO 6 — NOVA CARREGADA: o núcleo carrega (aviso + linha-guia do corredor
    // seguro) e dispara um anel de balas com UMA abertura que gira a cada nova.
    startNova() {
        this.novaGap = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.chargeNova();
        this.spawnTimer = this.time.addEvent({ delay: 1500, loop: true, callback: () => this.chargeNova() });
    }

    chargeNova() {
        if (!this.dodgeActive) {
            return;
        }
        this.spawnFx("fx-charge", BOX.x, BOX.y, { depth: 26, scale: 0.95 });

        // Linha-guia verde apontando para a abertura segura do próximo anel.
        const gx = BOX.x + Math.cos(this.novaGap) * (BOX.w / 2 + 10);
        const gy = BOX.y + Math.sin(this.novaGap) * (BOX.h / 2 + 10);
        const guide = this.add.graphics().setDepth(25);
        guide.lineStyle(2, 0x51e36b, 0.5);
        guide.lineBetween(BOX.x, BOX.y, gx, gy);
        this.patternFx.push(guide);
        this.tweens.add({ targets: guide, alpha: 0.15, duration: 220, yoyo: true, repeat: -1 });

        this.time.delayedCall(800, () => {
            this.destroyFx(guide);
            if (!this.dodgeActive) {
                return;
            }
            this.spawnFx("fx-spark", BOX.x, BOX.y, { depth: 27, scale: 0.9 });
            this.fireNovaRing();
            this.novaGap += 0.9;
        });
    }

    fireNovaRing() {
        const n = 20;
        const gapHalf = Math.PI / 5;   // ~36° de cada lado do centro do corredor.
        const speed = 130;
        for (let i = 0; i < n; i += 1) {
            const a = (i / n) * Math.PI * 2;
            if (Math.abs(Phaser.Math.Angle.Wrap(a - this.novaGap)) < gapHalf) {
                continue;
            }
            this.spawnRadial(BOX.x, BOX.y, a, speed);
        }
    }

    defenseTurn() {
        this.setBattleStatus("> SEQUÊNCIA HOSTIL A CAMINHO — DEFENDA-SE!", "#ff4545");
        const puzzle = Phaser.Utils.Array.GetRandom(DEFENSE_PUZZLES);

        this.foeAttackAnim(() => {
            let solvedThisRun = false;

            this.console = new BlockProgrammingConsole(this, puzzle, {
                singleAttempt: true,
                timeLimitMs: DEFENSE_TIME_LIMIT,
                onSolved: () => {
                    solvedThisRun = true;
                },
                onClose: () => {
                    if (solvedThisRun) {
                        this.setBattleStatus("> SEQUÊNCIA BLOQUEADA!", "#51e36b");
                    } else {
                        this.setBattleStatus(`> A SEQUÊNCIA ACERTOU: -${DEFENSE_FAIL_DAMAGE} HP`, "#ff4545");
                        this.cameras.main.shake(250, 0.006);
                        if (this.damagePlayer(DEFENSE_FAIL_DAMAGE)) {
                            return;
                        }
                    }
                    this.time.delayedCall(1000, () => this.playerTurn());
                }
            });
            this.console.open();
        });
    }

    // Aplica dano à Artemis; retorna true se ela foi derrotada.
    damagePlayer(amount) {
        this.hp = setHp(this.hp - amount);
        this.updateHpBar();
        this.cameras.main.shake(150, 0.004);

        if (this.hp <= 0) {
            this.defeat();
            return true;
        }
        return false;
    }

    // --- Fim de combate ---
    // Derrota: o embate reinicia do zero (HP, boss e variáveis).
    defeat() {
        this.stopDodge();
        this.menu.hide();
        this.cameras.main.flash(500, 255, 40, 40);
        this.setBattleStatus("> UNIDADE NEUTRALIZADA — REINICIANDO SISTEMAS...", "#ff4545");

        this.time.delayedCall(2200, () => {
            this.hp = fullHeal();
            this.bossHp = this.config.maxHp;
            this.forca = null;
            this.reprogramCount = 0;
            this.bossAttackIndex = 0;
            this.lastWasDefense = false;
            this.invulnUntil = 0;
            this.updateHpBar();
            this.updateBossHp();
            this.updateForca();
            this.setBattleStatus("> SISTEMAS RESTAURADOS — O EMBATE RECOMEÇA", "#4ad6ff");
            this.time.delayedCall(900, () => this.playerTurn());
        });
    }

    victory() {
        this.menu.hide();
        this.stopDodge();
        this.foePowerDown();
        this.cameras.main.shake(600, 0.006);
        this.setBattleStatus(`> ${this.config.name} OFFLINE`, "#51e36b");

        this.time.delayedCall(1800, () => {
            this.scene.stop();
            this.scene.resume(this.config.returnScene, { victory: true });
        });
    }
}
