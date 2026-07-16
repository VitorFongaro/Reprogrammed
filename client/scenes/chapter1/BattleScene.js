import Phaser from "phaser";
import EniacBoss from "../../characters/EniacBoss";
import BattleMenu from "../../ui/BattleMenu";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";

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

const WIDTH = 1280;
const HEIGHT = 720;

const BOSS_POS = { x: 640, y: 150, scale: 2.5 };
const BOX = { x: 640, y: 415, w: 480, h: 300 };
const MENU_Y = 624;
const STATUS_Y = 582;
const HUD_DEPTH = 40;

// --- Calibragem do combate ---
const BOSS_MAX_HP = 60;
const PLAYER_MAX_HP = 20;
const BASE_DAMAGE = 5;              // ataque padrão, sem a variável forca.
const FORCA_INICIAL = 10;           // criada no primeiro REPROGRAMAR.
const PROJECTILE_DAMAGE = 3;
const DEFENSE_FAIL_DAMAGE = 5;      // dano ao falhar a sequência de defesa.
const DEFENSE_TIME_LIMIT = 15000;   // tempo limite da defesa (ms).
const DODGE_DURATION = 5000;        // duração do bullet hell (ms).
const PROJECTILE_INTERVAL = 300;
const PROJECTILE_SPEED = { min: 170, max: 260 };
const PROJECTILE_DRIFT = 50;
const AIMED_CHANCE = 0.4;           // chance do projétil nascer sobre a alma.
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

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super("cap1-batalha");
    }

    preload() {
        EniacBoss.preload(this);
        BlockProgrammingConsole.preload(this);
    }

    create() {
        this.bossHp = BOSS_MAX_HP;
        this.hp = PLAYER_MAX_HP;
        this.forca = null;
        this.bossAttackIndex = 0;
        this.dodgeActive = false;
        this.invulnUntil = 0;

        this.drawBackdrop();
        this.createTextures();
        this.boss = new EniacBoss(this, BOSS_POS.x, BOSS_POS.y, { scale: BOSS_POS.scale });
        this.drawBox();
        this.drawHud();
        this.createSoul();

        this.menu = new BattleMenu(this, {
            x: WIDTH / 2,
            y: MENU_Y,
            actions: [
                { id: "atacar", label: "ATACAR" },
                { id: "reprogramar", label: "REPROGRAMAR" },
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

        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.setBattleStatus("O ENIAC BLOQUEIA O CAMINHO", "#7a8099");
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

        // Projéteis que cruzaram a caixa somem na borda de baixo.
        if (this.projectiles) {
            this.projectiles.getChildren().slice().forEach((proj) => {
                if (proj.y > BOX.y + BOX.h / 2 - 6) {
                    proj.destroy();
                }
            });
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
        this.add.text(WIDTH / 2, 36, "ENIAC", {
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
        const ratio = this.bossHp / BOSS_MAX_HP;

        this.bossHpGraphics.clear();
        this.bossHpGraphics.lineStyle(1, 0xff4545, 0.7);
        this.bossHpGraphics.strokeRect(x, 52, w, 12);
        this.bossHpGraphics.fillStyle(0xff4545, 0.9);
        this.bossHpGraphics.fillRect(x + 1, 53, (w - 2) * ratio, 10);
        this.bossHpText.setText(`${this.bossHp}/${BOSS_MAX_HP}`);
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
        this.forcaText.setText(this.forca === null ? "FORÇA: --" : `FORÇA: ${this.forca}`);
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

        if (!this.textures.exists("eniac-bit")) {
            const g = this.add.graphics();
            g.fillStyle(0xff4545, 1);
            g.fillRect(3, 3, 8, 8);
            g.lineStyle(2, 0x7a1020, 1);
            g.strokeRect(3, 3, 8, 8);
            g.generateTexture("eniac-bit", 14, 14);
            g.destroy();
        }
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
        } else {
            this.analyze();
        }
    }

    attack() {
        const damage = this.forca ?? BASE_DAMAGE;

        this.boss.hit();
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
        const puzzle = this.forca === null ? CREATE_FORCA_PUZZLE : DOUBLE_FORCA_PUZZLE;
        let solvedThisRun = false;

        this.console = new BlockProgrammingConsole(this, puzzle, {
            singleAttempt: true,
            onSolved: () => {
                solvedThisRun = true;
            },
            onClose: () => {
                if (solvedThisRun) {
                    this.forca = this.forca === null ? FORCA_INICIAL : this.forca * 2;
                    this.updateForca();
                    this.setBattleStatus(`> ATAQUE REPROGRAMADO: FORÇA = ${this.forca}`, "#51e36b");
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
        const hintLine = this.forca === null
            ? "Dica: REPROGRAMAR cria a variável forca."
            : "Dica: REPROGRAMAR dobra a força (forca = forca * 2).";

        this.analysisText.setText([
            "ENIAC — UNIDADE DE CUSTÓDIA, 1946.",
            `INTEGRIDADE: ${this.bossHp}/${BOSS_MAX_HP}`,
            forcaLine,
            hintLine
        ].join("\n")).setVisible(true);

        this.time.delayedCall(3800, () => {
            this.analysisText.setVisible(false);
            this.bossTurn();
        });
    }

    // --- Turno do ENIAC: bullet hell OU sequência de defesa com tempo ---
    bossTurn() {
        const useDodge = this.bossAttackIndex === 0 || Math.random() < 0.5;
        this.bossAttackIndex += 1;

        if (useDodge) {
            this.dodgeTurn();
        } else {
            this.defenseTurn();
        }
    }

    dodgeTurn() {
        this.setBattleStatus("> TURNO DO ENIAC — DESVIE COM WASD!", "#ff4545");
        this.soul.body.reset(BOX.x, BOX.y);
        this.soul.setVisible(true);
        this.dodgeActive = true;

        this.boss.attackAnim(() => {
            if (!this.dodgeActive) {
                return;
            }
            this.spawnTimer = this.time.addEvent({
                delay: PROJECTILE_INTERVAL,
                loop: true,
                callback: () => this.spawnProjectile()
            });
            this.dodgeTimer = this.time.delayedCall(DODGE_DURATION, () => this.endDodge());
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
        this.projectiles?.clear(true, true);
        this.soul?.setVisible(false);
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
            "eniac-bit"
        );
        proj.setDepth(28);
        proj.body.setVelocity(
            Phaser.Math.Between(-PROJECTILE_DRIFT, PROJECTILE_DRIFT),
            Phaser.Math.Between(PROJECTILE_SPEED.min, PROJECTILE_SPEED.max)
        );
        this.tweens.add({ targets: proj, angle: 360, duration: 900, repeat: -1 });
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

    defenseTurn() {
        this.setBattleStatus("> O ENIAC LANÇA UMA SEQUÊNCIA HOSTIL — DEFENDA-SE!", "#ff4545");
        const puzzle = Phaser.Utils.Array.GetRandom(DEFENSE_PUZZLES);

        this.boss.attackAnim(() => {
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
        this.hp = Math.max(0, this.hp - amount);
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
            this.hp = PLAYER_MAX_HP;
            this.bossHp = BOSS_MAX_HP;
            this.forca = null;
            this.bossAttackIndex = 0;
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
        this.boss.powerDown();
        this.cameras.main.shake(600, 0.006);
        this.setBattleStatus("> ENIAC DESLIGADO", "#51e36b");

        this.time.delayedCall(1800, () => {
            this.scene.stop();
            this.scene.resume("cap1-seguranca", { victory: true });
        });
    }
}
