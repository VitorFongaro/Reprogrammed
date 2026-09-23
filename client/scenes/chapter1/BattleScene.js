import Phaser from "phaser";
import EniacBoss from "../../characters/EniacBoss";
import BattleMenu from "../../ui/BattleMenu";
import Music from "../../ui/Music";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import { createConsole } from "../../ui/ConditionalConsole";
import projetilUrl from "../../assets/sprites/projetil/projetil.png";
import { MAX_HP, getHp, setHp, fullHeal } from "../../state/vitals";
import { addItem } from "../../state/inventory";
import { itemDef } from "../../data/items";
import Effects, { DEATH_SKULL } from "../../ui/Effects";

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
// Posição de CASA da caixa de combate. A caixa em uso é `this.box` (cópia): os
// padrões da WITCH a movem, achatam e dividem, e o stopDodge a devolve para cá.
const BOX = { x: 640, y: 415, w: 480, h: 300 };
const MENU_Y = 624;
const STATUS_Y = 582;
const HUD_DEPTH = 40;

// --- Calibragem do combate ---
// BOSS_MAX_HP calibrado para o embate durar uns 5-6 turnos MESMO na estratégia mais
// rápida possível (reprogramar até o teto e só então atacar): com MAX_REPROGRAMS=2 a
// força trava em 20 (10 -> 20), então são 2 turnos de REPROGRAMAR (sem dano) + 4
// ataques de 20 = 80 para abater — 6 turnos no total. Jogo real (misturando ataque e
// reprogramação, ou errando uma reprogramação) leva mais que isso.
const BOSS_MAX_HP = 80;
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

const IFRAME_MS = 700;
// Padrão "ifElse" (LEO): tempo para ler a lâmpada e ir para a metade segura, e
// o ciclo lâmpada -> golpe.
const IFELSE_READ_MS = 900;
const IFELSE_CYCLE_MS = 1350;
// Padrões da WITCH (boss do cap. 2). A dificuldade vem de LEITURA e POSIÇÃO —
// o passado virando armadilha, dois corpos para cuidar, ponteiros que voltam —
// não de bala mais rápida.
const CONVERGE_MS = 1600;           // das bordas até o meio: todas as lâminas chegam JUNTAS
const REWIND_BLADES = { top: 5, bottom: 5, left: 4, right: 4 };   // proporcional a cada lado
const REWIND_AIM_JITTER = 10;       // miram EM VOLTA do centro, não num ponto só
const REWIND_SPAWN_CLEAR = 60;      // nenhuma nasce em cima da alma
const REWIND_HOLD_MS = 700;         // o tempo parado, com o relógio já girando
const CLOCK_SCALE = 2.2;            // o relógio grande, atrás das lâminas
const REWIND_BACK_SPEED = 1.3;      // a volta, em vezes a velocidade da ida.
const HASTE_SPEED = 2;              // a aceleração das lâminas...
const SOUL_HASTE = 1.75;            // ...e da ALMA: o tempo acelera para todo mundo.
const SOUL_HASTE_MS = 1800;
const SOUL_TRAIL_MS = 1600;         // o rastro da alma que vira armadilha no rebobinar.
const TRAIL_MINE_R = 11;
const TRAIL_MINE_MS = 1300;
const HANDS_BOX_W = 300;            // a caixa vira um quadrado: o mostrador.
const HANDS_ARMED_MS = 700;         // ponteiros aparecem apagados (sem dano) antes.
const HANDS_REVERSE_MS = [2600, 4700];   // o ponteiro dos minutos VOLTA nesses instantes
const HAND_DROP_MS = 160;           // o ponteiro dos minutos solta uma lâmina a cada...
const HAND_DROP_LIFE_MS = 1400;     // ...que fica parada no rastro dele por esse tempo
const HAND_DROP_CLEAR = 24;         // nunca solta em cima da alma
const MIRROR_TINT = 0xff7ad9;       // a alma espelho
const SENTENCE_EVERY_MS = 620;      // uma marca 死 sob a alma a cada...
const SENTENCE_MARK_SCALE = 1.05;
const SENTENCE_R = 24;
const WITCH_TINT = 0xb48cff;        // borda da caixa sob o feitiço dela.
const TIME_TINT = 0x7dff9a;         // lâmina parada no tempo + os rastros.
const SOUL_SPEED = 240;

// --- Puzzles de REPROGRAMAR (tentativa única; errar consome o turno) ---
const CREATE_FORCA_PUZZLE = {
    title: "REPROGRAMAR // CRIAR VARIÁVEL",
    briefing: [
        "Seu ataque padrão mal arranha a blindagem.",
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
    analysisLine: "ENIAC :: UNIDADE DE CUSTÓDIA, 1946.",
    // Comentários do Cosmo no ANALISAR (um por uso, em ciclo), no espírito das
    // descrições do Undertale. Cada embate passa os SEUS: sem isso, a arena de
    // treino herdaria as falas do boss.
    analysisQuips: [
        "Quase 18 mil válvulas e nenhuma de bom humor.",
        "Pesa 27 toneladas. Não deixe ele sentar em você.",
        "É de 1946. Respeite os mais velhos... depois de desligar ele."
    ],
    // Espólio da vitória (id do catálogo de itens) ou null. Só o BOSS FINAL de
    // cada capítulo larga alguma coisa: o chip de CACHE, que libera uma
    // reprogramação extra por embate. É a peça mais forte do jogo, então a
    // escassez é o balanceamento — um por capítulo, e ponto. Arena de treino e
    // demais embates passam `reward: null`.
    reward: "cache",
    // Tema PRÓPRIO do embate (chave em ui/Music.js): entra no lugar da faixa do
    // capítulo enquanto dura o combate e devolve a anterior ao sair. Embate que
    // não é boss (a arena de treino) passa `theme: null` e deixa a faixa do
    // capítulo seguir tocando.
    theme: "boss",
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
        Music.preload(this, this.config.theme);   // só carrega se o embate tiver tema
        if (!this.textures.exists("projetil")) {
            this.load.spritesheet("projetil", projetilUrl, { frameWidth: 32, frameHeight: 32 });
        }
        Effects.preload(this);   // raio, portal, explosão, carga, faísca (ver ui/Effects).
        // Combatentes customizados (ex.: dupla de sentinelas): sheets via config.
        // Quadro 32x32 por padrão; `frameSize` para folhas maiores (a WITCH usa
        // 144). `disabledUrl` e `attackUrl` são opcionais.
        (this.config.combatants ?? []).forEach((c) => {
            const frame = { frameWidth: c.frameSize ?? 32, frameHeight: c.frameSize ?? 32 };
            [["walk", c.walkUrl], ["disabled", c.disabledUrl], ["attack", c.attackUrl]].forEach(([kind, url]) => {
                if (url && !this.textures.exists(`${c.key}-${kind}`)) {
                    this.load.spritesheet(`${c.key}-${kind}`, url, frame);
                }
            });
        });
    }

    create() {
        // Por cima da sala que abriu o combate. O Phaser desenha as cenas na
        // ordem do array do main.js, e sala registrada DEPOIS desta (o cap. 2)
        // cobria a batalha: ela rodava invisível e o jogo parecia travado.
        this.scene.bringToTop();
        this.bossHp = this.config.maxHp;
        this.hp = getHp();              // entra com o HP que trouxe das salas.
        this.forca = null;
        this.reprogramCount = 0;
        this.maxReprograms = this.config.maxReprograms ?? MAX_REPROGRAMS;
        this.bossAttackIndex = 0;
        this.analyzeCount = 0;
        this.lastWasDefense = false;
        this.dodgeActive = false;
        this.invulnUntil = 0;
        this.itemUsedThisTurn = false;
        // Efeitos de item que valem por um turno (Overclock e Dissipador).
        this.ataqueDobrado = false;
        this.danoReduzido = false;
        this.dodgeIndex = 0;
        this.dodgePatterns = this.config.dodgePatterns ?? [this.config.dodgePattern];
        this.bounceBalls = [];
        this.patternFx = [];   // efeitos/telegrafos ativos dos padrões (limpos no stopDodge)
        this.hazards = [];     // zonas de perigo ativas (coluna do raio / raio da explosão)
        this.patternTimers = [];   // delayedCalls dos padrões em etapas (ver later)
        this.box = { ...BOX };     // caixa em uso (os padrões da WITCH a deformam)
        this.split = null;         // caixa dividida em duas metades ("mirror")
        this.soulTrail = [];       // por onde a alma passou (o "rewind" da WITCH)
        this.freezeTrail = null;   // passos dados com o tempo parado (viram minas)
        this.soulHasteUntil = 0;   // alma acelerada pelo relógio da WITCH
        this.clockHands = null;    // ponteiros do padrão "hands"
        this.mirrorSoul = null;    // a segunda alma do padrão "mirror"
        this.rewindTurns = 0;      // o relógio alterna rebobinar/acelerar a cada turno

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

        // Tema próprio do embate no lugar da faixa do capítulo; ao sair, a anterior
        // volta (a derrota reinicia AQUI dentro, sem shutdown, então o tema segue
        // tocando pela nova tentativa — que é o que se quer).
        if (this.config.theme) {
            Music.playTheme(this, this.config.theme);
            this.events.once("shutdown", () => Music.restore(this));
        }

        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.setBattleStatus(`${this.config.name} :: COMBATE INICIADO`, "#7a8099");
        this.time.delayedCall(700, () => this.playerTurn());
    }

    update(time, delta) {
        // Movimento da alma (WASD) durante o bullet hell. Acelerada pelo relógio
        // da WITCH, ela anda bem mais rápido — e fica difícil de controlar.
        if (this.dodgeActive && this.soul.visible) {
            let vx = 0;
            let vy = 0;
            if (this.keys.left.isDown) vx -= 1;
            if (this.keys.right.isDown) vx += 1;
            if (this.keys.up.isDown) vy -= 1;
            if (this.keys.down.isDown) vy += 1;
            const norm = vx !== 0 && vy !== 0 ? Math.SQRT1_2 : 1;
            const speed = SOUL_SPEED * (this.time.now < this.soulHasteUntil ? SOUL_HASTE : 1);
            this.soul.body.setVelocity(vx * speed * norm, vy * speed * norm);
            this.recordSoulTrail();
        } else if (this.soul.body) {
            this.soul.body.setVelocity(0, 0);
        }

        // Projéteis que saíram da caixa somem (qualquer borda, para os padrões
        // radiais). As bolas quicantes são poupadas — elas quicam (updateSplitBounce).
        // Com a caixa dividida, vale estar dentro de QUALQUER metade: o que cai
        // no vão entre elas some.
        if (this.projectiles) {
            const rects = this.boxRects();
            const m = 26;
            const inside = (proj) => rects.some((r) => proj.x >= r.x - r.w / 2 - m && proj.x <= r.x + r.w / 2 + m
                && proj.y >= r.y - r.h / 2 - m && proj.y <= r.y + r.h / 2 + m);
            this.projectiles.getChildren().slice().forEach((proj) => {
                if (!proj.bouncing && !inside(proj)) {
                    proj.destroy();
                }
            });
        }

        if (this.dodgeActive) {
            this.updateSplitBounce();
            this.updateHazards();
            this.updateHands(delta);
            this.updateMirror();
            this.drawBladeTrails();
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
        // Redesenhável: os padrões da WITCH mexem na caixa e chamam applyBox.
        this.boxGraphics = this.add.graphics();
        this.boxColor = 0xf7f7f7;

        // Texto de análise (aparece dentro da caixa ao usar ANALISAR).
        this.analysisText = this.add.text(this.box.x, this.box.y, "", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#e7e9f2",
            align: "center",
            lineSpacing: 8,
            wordWrap: { width: this.box.w - 40 }
        }).setOrigin(0.5).setDepth(25).setVisible(false);
    }

    // Retângulos da caixa em jogo: a caixa inteira, ou as DUAS metades quando o
    // padrão "mirror" a divide (separadas por `gap`, cada uma com seu desvio vertical).
    boxRects() {
        const b = this.box;
        if (!this.split) {
            return [b];
        }
        const hw = b.w / 2;
        return [
            { x: b.x - hw / 2 - this.split.gap / 2, y: b.y + this.split.offA, w: hw, h: b.h },
            { x: b.x + hw / 2 + this.split.gap / 2, y: b.y + this.split.offB, w: hw, h: b.h }
        ];
    }

    // Redesenha a caixa e move as paredes da alma. Chamado a cada passo dos
    // tweens que deformam a caixa: as paredes empurram a alma, como no Undertale.
    // Dividida, a alma fica presa na metade em que estava (`splitSide`).
    applyBox() {
        const rects = this.boxRects();
        const g = this.boxGraphics;
        g.clear();
        rects.forEach((r) => {
            g.fillStyle(0x000000, 1);
            g.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
            g.lineStyle(3, this.boxColor, 0.95);
            g.strokeRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
        });
        const r = rects[this.split ? this.splitSide : 0];
        this.soulBounds?.setTo(r.x - r.w / 2 + 8, r.y - r.h / 2 + 8, r.w - 16, r.h - 16);
    }

    // delayedCall de padrão em etapas, rastreado: o stopDodge cancela tudo, senão
    // uma etapa atrasada de um turno disparava no meio do turno seguinte.
    later(ms, fn) {
        const timer = this.time.delayedCall(ms, () => {
            if (this.dodgeActive) {
                fn();
            }
        });
        this.patternTimers.push(timer);
        return timer;
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

        // Lâmina da WITCH: meia-lua prateada apontando para +x (gira com a
        // direção em que voa).
        if (!this.textures.exists("battle-blade")) {
            const g = this.add.graphics();
            const pts = [];
            for (let a = -100; a <= 100; a += 20) {
                const r = Phaser.Math.DegToRad(a);
                pts.push({ x: 11 + Math.cos(r) * 10, y: 12 + Math.sin(r) * 10 });
            }
            for (let a = 100; a >= -100; a -= 20) {
                const r = Phaser.Math.DegToRad(a);
                pts.push({ x: 6 + Math.cos(r) * 8, y: 12 + Math.sin(r) * 8 });
            }
            g.fillStyle(0xe8e8f0, 1);
            g.fillPoints(pts, true);
            g.lineStyle(1, WITCH_TINT, 1);
            g.strokePoints(pts, true);
            g.generateTexture("battle-blade", 24, 24);
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
        Effects.createAnimations(this);
    }

    createSoul() {
        this.soul = this.physics.add.image(this.box.x, this.box.y, "battle-soul")
            .setDepth(30)
            .setVisible(false);
        this.soul.body.setCollideWorldBounds(true);
        // O Arcade guarda o retângulo POR REFERÊNCIA: o applyBox o altera no lugar
        // e as paredes que se mexem empurram a alma junto.
        this.soulBounds = new Phaser.Geom.Rectangle();
        this.soul.body.setBoundsRectangle(this.soulBounds);
        this.applyBox();

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
            const disabledKey = c.disabledUrl ? `${c.key}-disabled` : null;
            const attackKey = c.attackUrl ? `${c.key}-attack` : null;
            // Folha em grade (a WITCH tem uma linha por direção): `walkFrames` e
            // `attackFrames` escolhem os quadros — a de frente para a câmera.
            const walkFrames = c.walkFrames ?? { start: 0, end: 5 };
            if (!this.anims.exists(walkKey)) {
                this.anims.create({ key: walkKey, frames: this.anims.generateFrameNumbers(walkKey, walkFrames), frameRate: 8, repeat: -1 });
            }
            if (disabledKey && !this.anims.exists(disabledKey)) {
                this.anims.create({ key: disabledKey, frames: this.anims.generateFrameNumbers(disabledKey, { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
            }
            if (attackKey && !this.anims.exists(attackKey)) {
                this.anims.create({ key: attackKey, frames: this.anims.generateFrameNumbers(attackKey, c.attackFrames), frameRate: 20, repeat: 0 });
            }
            const s = this.add.sprite(c.x, c.y ?? BOSS_POS.y, walkKey, walkFrames.start)
                .setScale(c.scale ?? 3)
                .setDepth(HUD_DEPTH - 1);
            s.play(walkKey);
            s.baseY = c.y ?? BOSS_POS.y;
            s.walkKey = walkKey;
            s.disabledKey = disabledKey;
            s.attackKey = attackKey;
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
            // Com animação de ataque própria (a WITCH girando a foice), ela é o
            // telegrafo; senão, o tranco + clarão âmbar de sempre.
            if (s.attackKey) {
                s.play(s.attackKey);
                s.once("animationcomplete", () => { if (s.active) s.play(s.walkKey); });
                return;
            }
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
            if (s.disabledKey) {
                s.play(s.disabledKey);
            } else {
                s.stop();
                s.setTint(0x8a8a9a);             // sem folha de "desligada": apaga a cor
            }
            this.tweens.add({ targets: s, y: s.baseY + 8, alpha: 0.75, duration: 500, ease: "Quad.easeOut" });
        });
    }

    // --- Turno do jogador ---
    playerTurn() {
        // O Dissipador protege UM turno do boss; ao voltar a vez, já foi gasto.
        this.danoReduzido = false;
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
        if (item.usableInBattle === false) {
            return { ok: false, message: "não dá para usar isto em batalha" };
        }

        if (item.category === "cura") {
            if (this.hp >= PLAYER_MAX_HP) {
                return { ok: false, message: "HP já está cheio" };
            }
            const antes = this.hp;
            this.hp = setHp(this.hp + (item.heal ?? 0));
            this.updateHpBar();
            this.itemUsedThisTurn = true;
            return { ok: true, message: `+${this.hp - antes} HP` };
        }

        if (item.category === "reprogramacao") {
            const efeito = this.applyBattleEffect(item);
            if (!efeito.ok) {
                return efeito;
            }
            this.itemUsedThisTurn = true;
            return efeito;
        }

        return { ok: false, message: "não dá para usar isto em batalha" };
    }

    // Efeitos de combate. São flags lidas no ataque, no dano e no limite de
    // reprogramações — nada aqui muda o fluxo de turno, que é do useBattleItem.
    applyBattleEffect(item) {
        if (item.battleEffect === "dobrarAtaque") {
            this.ataqueDobrado = true;
            return { ok: true, message: "próximo ataque dobrado" };
        }

        if (item.battleEffect === "reduzirDano") {
            this.danoReduzido = true;
            return { ok: true, message: "dano reduzido no próximo turno" };
        }

        if (item.battleEffect === "maisUmaReprogramacao") {
            this.maxReprograms += 1;
            this.updateForca();
            return { ok: true, message: "+1 reprogramação neste embate" };
        }

        return { ok: false, message: "sem efeito nesta batalha" };
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
        // O Overclock vale por UM ataque e some depois de gastar.
        const base = this.forca ?? BASE_DAMAGE;
        const damage = this.ataqueDobrado ? base * 2 : base;
        this.ataqueDobrado = false;

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

        const quips = this.config.analysisQuips ?? [];
        const quip = quips.length ? `COSMO: "${quips[this.analyzeCount % quips.length]}"` : null;
        this.analyzeCount += 1;

        this.analysisText.setText([
            this.config.analysisLine,
            `INTEGRIDADE: ${this.bossHp}/${this.config.maxHp}`,
            forcaLine,
            `REPROGRAMAÇÕES: ${this.reprogramCount}/${this.maxReprograms}`,
            hintLine,
            quip
        ].filter(Boolean).join("\n")).setVisible(true);

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
        // Espiral, nova e ponteiros nascem no centro: começa a alma mais embaixo,
        // longe do foco.
        const fromCenter = ["spiral", "nova", "hands"].includes(pattern);
        const startY = fromCenter ? this.box.y + this.box.h / 2 - 30 : this.box.y;
        this.soul.body.reset(this.box.x, startY);
        this.soul.setVisible(true);
        this.soulTrail = [];
        this.dodgeActive = true;

        this.foeAttackAnim(() => {
            if (!this.dodgeActive) {
                return;
            }
            // Agenda o fim do turno ANTES de montar o padrão: assim o turno sempre
            // termina e volta para o menu, mesmo se um padrão específico falhar.
            // `patternDurations` deixa um padrão longo (o relógio da WITCH) ter o
            // seu tempo sem esticar os outros.
            const duration = this.config.patternDurations?.[pattern] ?? this.config.dodgeDuration;
            this.dodgeTimer = this.time.delayedCall(duration, () => this.endDodge());
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
        this.patternTimers.forEach((t) => t.remove());
        this.patternTimers = [];
        this.projectiles?.clear(true, true);
        this.soul?.setVisible(false);
        // Caixa de volta para casa, inteira e branca (os padrões da WITCH só a
        // devolvem sozinhos se o turno durar até o fim da animação deles).
        this.tweens.killTweensOf(this.box);
        if (this.split) {
            this.tweens.killTweensOf(this.split);
        }
        Object.assign(this.box, BOX);
        this.split = null;
        this.boxColor = 0xf7f7f7;
        this.applyBox();
        // O que os padrões da WITCH deixam pendurado na alma e na caixa.
        this.soulHasteUntil = 0;
        this.soul?.clearTint();
        this.soulTrail = [];
        this.freezeTrail = null;   // o desenho dele já saiu junto com o patternFx
        this.bladeTrails = null;   // idem (rastro ao vivo das lâminas do relógio)
        this.rewindBlades = null;
        this.clockHands?.graphics.destroy();
        this.clockHands = null;
        this.mirrorSoul?.destroy();
        this.mirrorSoul = null;
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
        if (name === "ifElse") {
            this.startIfElse();
            return;
        }
        if (name === "rewind") {
            this.startRewind();
            return;
        }
        if (name === "hands") {
            this.startHands();
            return;
        }
        if (name === "mirror") {
            this.startMirror();
            return;
        }
        if (name === "sentence") {
            this.startSentence();
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
        this.centralBall = this.add.image(this.box.x, this.box.y, "battle-orb").setDepth(27).setScale(1.4);
        this.tweens.add({ targets: this.centralBall, angle: 360, duration: 1400, repeat: -1 });
        this.tweens.add({ targets: this.centralBall, scale: 1.65, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.spawnTimer = this.time.addEvent({ delay: 115, loop: true, callback: () => this.spiralTick() });
    }

    spiralTick() {
        const arms = 3;
        const speed = 150;
        for (let i = 0; i < arms; i += 1) {
            const a = this.spiralAngle + (i / arms) * Math.PI * 2;
            this.spawnRadial(this.box.x, this.box.y, a, speed);
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
            const x = Phaser.Math.Between(this.box.x - this.box.w / 2 + 70, this.box.x + this.box.w / 2 - 70);
            const y = Phaser.Math.Between(this.box.y - this.box.h / 2 + 60, this.box.y + this.box.h / 2 - 60);
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
        const left = this.box.x - this.box.w / 2;
        const right = this.box.x + this.box.w / 2;
        const top = this.box.y - this.box.h / 2;
        const bottom = this.box.y + this.box.h / 2;
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
        const top = this.box.y - this.box.h / 2 + 16;
        const rows = Math.floor((this.box.h - 32) / spacing) + 1;
        const gapStart = Phaser.Math.Between(0, rows - 2);
        const speed = Phaser.Math.Between(this.config.projectileSpeed.min, this.config.projectileSpeed.max);
        const x = fromLeft ? this.box.x - this.box.w / 2 + 10 : this.box.x + this.box.w / 2 - 10;

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
        const left = this.box.x - this.box.w / 2 + 14;
        const right = this.box.x + this.box.w / 2 - 14;
        const aimed = Math.random() < AIMED_CHANCE;
        const px = aimed
            ? this.soul.x + Phaser.Math.Between(-24, 24)
            : Phaser.Math.Between(left, right);

        const proj = this.projectiles.create(
            Phaser.Math.Clamp(px, left, right),
            this.box.y - this.box.h / 2 + 12,
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
        this.hurtSoul();
    }

    // === Padrões novos do ENIAC (usam os efeitos do pack) ======================

    // Toca um efeito do pack (spritesheet) uma vez e some sozinho. Rastreado em
    // patternFx para o stopDodge limpar o que ainda estiver na tela.
    spawnFx(key, x, y, { scale = 1, scaleY = null, depth = 26, reverse = false } = {}) {
        const spr = this.add.sprite(x, y, key).setDepth(depth);
        spr.setScale(scale, scaleY ?? scale);
        // `reverse`: a animação de trás para frente (o relógio da WITCH girando
        // para trás quando o ataque vai rebobinar).
        if (reverse) {
            spr.playReverse(`${key}-anim`);
        } else {
            spr.play(`${key}-anim`);
        }
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
        const inside = (h, px, py) => {
            if (h.shape === "rect") {
                return px >= h.x0 && px <= h.x1 && py >= h.y0 && py <= h.y1;
            }
            return h.shape === "column"
                ? Math.abs(px - h.x) <= h.halfW
                : (px - h.x) ** 2 + (py - h.y) ** 2 <= h.r * h.r;
        };
        // A alma espelho (padrão "mirror" da WITCH) também pisa nas zonas.
        const hit = this.hazards.some((h) => now >= h.from
            && (inside(h, sx, sy) || (this.mirrorSoul && inside(h, this.mirrorSoul.x, this.mirrorSoul.y))));
        if (hit) {
            this.hurtSoul();
        }
    }

    // Um acerto na alma — de projétil, zona, ponteiro ou na alma espelho:
    // i-frames, piscar e dano. Devolve false se ela ainda estava invulnerável.
    hurtSoul() {
        if (this.time.now < this.invulnUntil) {
            return false;
        }
        this.invulnUntil = this.time.now + IFRAME_MS;
        this.tweens.add({
            targets: [this.soul, this.mirrorSoul].filter(Boolean), alpha: 0.25, duration: 90, yoyo: true, repeat: 3,
            onComplete: () => {
                this.soul.setAlpha(1);
                this.mirrorSoul?.setAlpha(0.85);
            }
        });
        this.damagePlayer(PROJECTILE_DAMAGE);
        return true;
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
        const colX = Phaser.Math.Between(this.box.x - this.box.w / 2 + margin, this.box.x + this.box.w / 2 - margin);
        const halfW = 26;

        const tele = this.add.rectangle(colX, this.box.y, halfW * 2, this.box.h - 14, 0xb14aff, 0.14)
            .setStrokeStyle(1, 0xb14aff, 0.55).setDepth(24);
        this.patternFx.push(tele);
        this.tweens.add({ targets: tele, alpha: 0.30, duration: 190, yoyo: true, repeat: -1 });

        this.time.delayedCall(600, () => {
            if (!this.dodgeActive) {
                this.destroyFx(tele);
                return;
            }
            this.spawnFx("fx-lightning", colX, this.box.y, {
                depth: 27,
                scale: (halfW * 2 + 18) / 128,
                scaleY: (this.box.h + 24) / 128
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
        const x = Phaser.Math.Between(this.box.x - this.box.w / 2 + margin, this.box.x + this.box.w / 2 - margin);
        const y = Phaser.Math.Between(this.box.y - this.box.h / 2 + margin, this.box.y + this.box.h / 2 - margin);

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
        this.spawnFx("fx-charge", this.box.x, this.box.y, { depth: 26, scale: 0.95 });

        // Linha-guia verde apontando para a abertura segura do próximo anel.
        const gx = this.box.x + Math.cos(this.novaGap) * (this.box.w / 2 + 10);
        const gy = this.box.y + Math.sin(this.novaGap) * (this.box.h / 2 + 10);
        const guide = this.add.graphics().setDepth(25);
        guide.lineStyle(2, 0x51e36b, 0.5);
        guide.lineBetween(this.box.x, this.box.y, gx, gy);
        this.patternFx.push(guide);
        this.tweens.add({ targets: guide, alpha: 0.15, duration: 220, yoyo: true, repeat: -1 });

        this.time.delayedCall(800, () => {
            this.destroyFx(guide);
            if (!this.dodgeActive) {
                return;
            }
            this.spawnFx("fx-spark", this.box.x, this.box.y, { depth: 27, scale: 0.9 });
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
            this.spawnRadial(this.box.x, this.box.y, a, speed);
        }
    }

    // PADRÃO 7 — SE/SENÃO (LEO, cap. 2): a REGRA do turno fica escrita acima da
    // caixa ("se luz == VERMELHA : ataca a ESQUERDA / senão : a DIREITA", e a
    // cada turno ela pode vir invertida). Uma lâmpada acende numa cor e, logo
    // depois, a metade indicada pela regra é varrida. Não há aviso da metade:
    // o jogador precisa LER a condição e avaliá-la, que é o conteúdo do capítulo.
    startIfElse() {
        this.ifElseRedLeft = Math.random() < 0.5;
        const [ladoV, ladoS] = this.ifElseRedLeft ? ["ESQUERDA", "DIREITA"] : ["DIREITA", "ESQUERDA"];
        const rule = this.add.text(this.box.x, this.box.y - this.box.h / 2 - 34,
            `se luz == VERMELHA : ataca a ${ladoV}\nsenão : ataca a ${ladoS}`, {
                fontFamily: "VCR", fontSize: "17px", color: "#ff7ad9", align: "center", lineSpacing: 4
            }).setOrigin(0.5).setDepth(31);
        this.patternFx.push(rule);
        this.ifElseTick();
        this.spawnTimer = this.time.addEvent({ delay: IFELSE_CYCLE_MS, loop: true, callback: () => this.ifElseTick() });
    }

    ifElseTick() {
        if (!this.dodgeActive) {
            return;
        }
        const red = Math.random() < 0.5;
        const lamp = this.add.circle(this.box.x, this.box.y - this.box.h / 2 + 22, 11, red ? 0xff4545 : 0x4a8cff)
            .setStrokeStyle(3, 0xf7f7f7, 0.9).setDepth(30);
        this.patternFx.push(lamp);

        this.time.delayedCall(IFELSE_READ_MS, () => {
            this.destroyFx(lamp);
            if (!this.dodgeActive) {
                return;
            }
            const left = red === this.ifElseRedLeft;
            const x0 = left ? this.box.x - this.box.w / 2 : this.box.x;
            const slash = this.add.rectangle(x0 + this.box.w / 4, this.box.y, this.box.w / 2 - 6, this.box.h - 6, 0xff4545, 0.38)
                .setDepth(26);
            this.patternFx.push(slash);
            this.tweens.add({ targets: slash, alpha: 0, duration: 320, onComplete: () => this.destroyFx(slash) });
            this.cameras.main.shake(90, 0.004);
            this.hazards.push({
                shape: "rect", x0, x1: x0 + this.box.w / 2, y0: this.box.y - this.box.h / 2, y1: this.box.y + this.box.h / 2,
                from: this.time.now, until: this.time.now + 220
            });
        });
    }

    // === Padrões da WITCH (boss do cap. 2) =====================================
    // Quatro padrões, e em cada um a dificuldade é uma REGRA nova para ler, não
    // bala mais rápida: o passado vira armadilha (rewind), não há bala nenhuma e
    // é preciso circular (hands), dois corpos para cuidar ao mesmo tempo
    // (mirror), e parar é morrer com as paredes te empurrando (sentence).

    // Rastro da alma, amostrado a cada ~60 ms. Durante o tempo parado do relógio
    // ("rebobinar"), cada passo também vai para `freezeTrail` e aparece em verde
    // na hora: é o que vai virar mina.
    recordSoulTrail() {
        const now = this.time.now;
        const last = this.soulTrail[this.soulTrail.length - 1];
        if (!last || now - last.t >= 60) {
            this.soulTrail.push({ t: now, x: this.soul.x, y: this.soul.y });
        }
        while (this.soulTrail.length && now - this.soulTrail[0].t > SOUL_TRAIL_MS) {
            this.soulTrail.shift();
        }
        const ft = this.freezeTrail;
        if (!ft) {
            return;
        }
        const tail = ft.points[ft.points.length - 1];
        if (!tail || Phaser.Math.Distance.Between(tail.x, tail.y, this.soul.x, this.soul.y) >= 9) {
            ft.points.push({ t: now, x: this.soul.x, y: this.soul.y });
            ft.graphics.fillStyle(TIME_TINT, 0.6).fillCircle(this.soul.x, this.soul.y, 4);
        }
    }

    // RELÓGIO: lâminas nascem nas QUATRO bordas e convergem para o meio, cada
    // uma deixando um rastro verde da borda até ela. Chegam todas JUNTAS (a
    // velocidade de cada uma é a distância dela dividida por CONVERGE_MS), o
    // relógio grande surge ali e o tempo para um instante. Alterna a cada turno:
    //   - REBOBINAR: as lâminas voltam do meio para as bordas pelo MESMO caminho
    //     — o rastro vai encolhendo atrás delas, como um fio sendo enrolado — e o
    //     relógio gira para trás. Os passos que a alma deu com o tempo parado
    //     viram MINAS: trocar de fresta na hora errada custa caro.
    //   - ACELERAR: as lâminas atravessam o meio e seguem para a borda OPOSTA,
    //     mais rápidas, e a ALMA também acelera.
    // O centro é mortal na chegada (elas convergem até ele): não há esconderijo
    // no olho do relógio, só as frestas entre os raios.
    startRewind() {
        const reverse = this.rewindTurns % 2 === 0;
        this.rewindTurns += 1;
        const { x, y, w, h } = this.box;
        const spots = [];
        const side = (n, at) => {
            for (let i = 0; i < n; i += 1) {
                spots.push(at(Phaser.Math.Clamp((i + 0.5) / n + Phaser.Math.FloatBetween(-0.05, 0.05), 0.05, 0.95)));
            }
        };
        side(REWIND_BLADES.top, (t) => ({ x: x - w / 2 + t * w, y: y - h / 2 + 12 }));
        side(REWIND_BLADES.bottom, (t) => ({ x: x - w / 2 + t * w, y: y + h / 2 - 12 }));
        side(REWIND_BLADES.left, (t) => ({ x: x - w / 2 + 12, y: y - h / 2 + t * h }));
        side(REWIND_BLADES.right, (t) => ({ x: x + w / 2 - 12, y: y - h / 2 + t * h }));
        this.rewindBlades = spots
            .filter((p) => Phaser.Math.Distance.Between(p.x, p.y, this.soul.x, this.soul.y) > REWIND_SPAWN_CLEAR)
            .map((p) => this.spawnConvergingBlade(p.x, p.y));
        this.bladeTrails = this.add.graphics().setDepth(27);
        this.patternFx.push(this.bladeTrails);
        this.later(CONVERGE_MS, () => this.stopTime(reverse));
    }

    // Lâmina da borda até perto do centro. Guarda de onde saiu e a velocidade
    // da ida: é disso que o relógio precisa para desfazer o caminho.
    spawnConvergingBlade(ox, oy) {
        const tx = this.box.x + Phaser.Math.FloatBetween(-REWIND_AIM_JITTER, REWIND_AIM_JITTER);
        const ty = this.box.y + Phaser.Math.FloatBetween(-REWIND_AIM_JITTER, REWIND_AIM_JITTER);
        const angle = Phaser.Math.Angle.Between(ox, oy, tx, ty);
        const speed = Phaser.Math.Distance.Between(ox, oy, tx, ty) / (CONVERGE_MS / 1000);
        const blade = this.projectiles.create(ox, oy, "battle-blade").setDepth(28).setRotation(angle);
        blade.body.setSize(14, 14, true);
        blade.origin = { x: ox, y: oy };
        blade.v0 = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        blade.body.setVelocity(blade.v0.x, blade.v0.y);
        return blade;
    }

    // Rastro ao vivo: da borda de onde a lâmina saiu até onde ela está. Cresce na
    // ida, fica inteiro com o tempo parado e encolhe quando ela volta.
    drawBladeTrails() {
        const g = this.bladeTrails;
        if (!g || !this.rewindBlades) {
            return;
        }
        g.clear();
        g.lineStyle(2, TIME_TINT, 0.4);
        this.rewindBlades.forEach((b) => {
            if (b.active) {
                g.lineBetween(b.origin.x, b.origin.y, b.x, b.y);
            }
        });
    }

    stopTime(reverse) {
        const blades = this.projectiles.getChildren().filter((p) => p.v0);
        // Acelerar: além do rastro de onde vieram, a linha de para ONDE vão (o
        // outro lado). Rebobinar não precisa: a volta é o próprio rastro.
        const lines = this.add.graphics().setDepth(27);
        this.patternFx.push(lines);
        lines.lineStyle(2, TIME_TINT, 0.25);
        blades.forEach((b) => {
            b.body.setVelocity(0, 0);
            b.setTint(TIME_TINT);
            if (!reverse) {
                const end = this.rayToBoxEdge(b.x, b.y, b.v0.x, b.v0.y);
                lines.lineBetween(b.x, b.y, end.x, end.y);
            }
        });
        if (reverse) {
            const dots = this.add.graphics().setDepth(27);
            this.patternFx.push(dots);
            this.freezeTrail = { points: [], graphics: dots };
        }

        const clock = this.spawnFx("fx-haste", this.box.x, this.box.y, { depth: 26, scale: CLOCK_SCALE, reverse });
        clock.setAlpha(0.8);
        this.setBattleStatus(reverse
            ? "> O TEMPO VAI VOLTAR... E CADA PASSO SEU FICA"
            : "> O TEMPO VAI ACELERAR... PARA VOCÊ TAMBÉM", "#7dff9a");

        // O relógio segue girando (2,4 s); as lâminas saem bem antes de ele acabar.
        this.later(REWIND_HOLD_MS, () => {
            this.destroyFx(lines);
            blades.forEach((b) => {
                if (!b.active) {
                    return;
                }
                b.clearTint();
                const k = reverse ? -REWIND_BACK_SPEED : HASTE_SPEED;
                b.body.setVelocity(b.v0.x * k, b.v0.y * k);
                if (reverse) {
                    b.setRotation(b.rotation + Math.PI);
                }
            });
            if (reverse) {
                this.armTrailMines();
            } else {
                this.soulHasteUntil = this.time.now + SOUL_HASTE_MS;
                this.soul.setTint(TIME_TINT);
                this.later(SOUL_HASTE_MS, () => this.soul.clearTint());
            }
            this.setBattleStatus(`> TURNO DE ${this.config.name} — DESVIE COM WASD!`, "#ff4545");
        });
    }

    // Os passos dados com o tempo parado viram minas. Os do último instante
    // ficam de fora e todas armam com um respiro — senão a mina nasceria
    // embaixo da alma e acertaria sem chance de reação.
    armTrailMines() {
        const ft = this.freezeTrail;
        this.freezeTrail = null;
        if (!ft) {
            return;
        }
        const now = this.time.now;
        const points = ft.points.filter((p) => now - p.t > 150);
        ft.graphics.clear();
        points.forEach((p) => {
            ft.graphics.fillStyle(TIME_TINT, 0.25).fillCircle(p.x, p.y, TRAIL_MINE_R + 4);
            ft.graphics.fillStyle(TIME_TINT, 1).fillCircle(p.x, p.y, 5);
            this.hazards.push({ x: p.x, y: p.y, r: TRAIL_MINE_R, from: now + 250, until: now + 250 + TRAIL_MINE_MS });
        });
        this.later(250 + TRAIL_MINE_MS, () => this.destroyFx(ft.graphics));
    }

    // Ponto em que um raio saindo de (x, y) na direção (dx, dy) cruza a borda da
    // caixa — o rastro da aceleração termina na parede, não no HUD.
    rayToBoxEdge(x, y, dx, dy) {
        const b = this.box;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const tx = ux > 0 ? (b.x + b.w / 2 - x) / ux : ux < 0 ? (b.x - b.w / 2 - x) / ux : Infinity;
        const ty = uy > 0 ? (b.y + b.h / 2 - y) / uy : uy < 0 ? (b.y - b.h / 2 - y) / uy : Infinity;
        const t = Math.max(0, Math.min(tx, ty));
        return { x: x + ux * t, y: y + uy * t };
    }

    // PONTEIROS: a caixa vira um mostrador quadrado e duas foices giram em volta
    // do eixo — a dos minutos (vai até a borda, mais rápida) e a das horas
    // (curta, lenta, no sentido contrário). Nenhuma bala: a alma tem que circular
    // ATRÁS do ponteiro, por fora do alcance do das horas. Duas vezes por turno o
    // ponteiro dos minutos treme (aviso) e VOLTA — quem vinha atrás dele fica de
    // frente.
    startHands() {
        this.boxColor = WITCH_TINT;
        this.tweens.add({
            targets: this.box, w: HANDS_BOX_W, duration: 500, ease: "Quad.easeInOut",
            onUpdate: () => this.applyBox()
        });
        this.applyBox();
        // A alma começa embaixo: os ponteiros começam longe dela.
        this.clockHands = {
            graphics: this.add.graphics().setDepth(27),
            armedAt: this.time.now + HANDS_ARMED_MS,
            nextDrop: 0,
            hands: [
                // O dos minutos larga lâminas no caminho (dropFromHand).
                { len: 220, angle: -Math.PI / 2, speed: 1.45, width: 12, color: 0xe8e8f0, drops: true },
                { len: 84, angle: Math.PI, speed: -0.8, width: 16, color: WITCH_TINT }        // horas
            ]
        };
        HANDS_REVERSE_MS.forEach((ms) => {
            this.later(ms - 450, () => this.warnMinuteHand());
            this.later(ms, () => this.reverseMinuteHand());
        });
    }

    warnMinuteHand() {
        if (this.clockHands) {
            this.clockHands.hands[0].warnUntil = this.time.now + 450;
        }
    }

    reverseMinuteHand() {
        if (!this.clockHands) {
            return;
        }
        const minute = this.clockHands.hands[0];
        minute.speed = -minute.speed;
        this.spawnFx("fx-spark", this.box.x, this.box.y, { depth: 29, scale: 0.6 });
        this.setBattleStatus("> O PONTEIRO VOLTOU!", "#7dff9a");
    }

    updateHands(delta) {
        const ch = this.clockHands;
        if (!ch) {
            return;
        }
        const now = this.time.now;
        const armed = now >= ch.armedAt;
        const cx = this.box.x;
        const cy = this.box.y;
        const g = ch.graphics;
        g.clear();
        ch.hands.forEach((h) => {
            if (armed) {
                h.angle += h.speed * ((delta ?? 16) / 1000);
            }
            // O ponteiro dos minutos passa da borda: desenha e acerta só até ela.
            const tip = this.rayToBoxEdge(cx, cy, Math.cos(h.angle), Math.sin(h.angle));
            const reach = Math.min(h.len, Math.hypot(tip.x - cx, tip.y - cy));
            const ex = cx + Math.cos(h.angle) * reach;
            const ey = cy + Math.sin(h.angle) * reach;
            const warn = now < (h.warnUntil ?? 0);
            const jitter = warn ? Phaser.Math.FloatBetween(-0.06, 0.06) : 0;
            const color = warn ? 0xffffff : h.color;
            g.lineStyle(h.width, color, armed ? 0.95 : 0.3);
            g.lineBetween(cx, cy, cx + Math.cos(h.angle + jitter) * reach, cy + Math.sin(h.angle + jitter) * reach);
            g.fillStyle(color, armed ? 1 : 0.3).fillCircle(ex, ey, h.width * 0.6);
            if (armed && this.soulNearSegment(cx, cy, ex, ey, h.width / 2 + 6)) {
                this.hurtSoul();
            }
            if (armed && h.drops && now >= ch.nextDrop) {
                ch.nextDrop = now + HAND_DROP_MS;
                this.dropFromHand(cx, cy, h, reach);
            }
        });
        g.fillStyle(0x0a0b10, 1).fillCircle(cx, cy, 10);
        g.lineStyle(2, WITCH_TINT, 1).strokeCircle(cx, cy, 10);
    }

    // O ponteiro dos minutos vai largando lâminas PARADAS por onde passa. Sem
    // isso, seguir colado atrás dele resolvia o padrão; com elas, o rastro dele
    // também é perigo e a alma tem que costurar por entre as lâminas. Cada uma
    // cai numa altura sorteada do ponteiro (sobram frestas) e nunca em cima da
    // alma — o contato com o próprio ponteiro já é tratado acima.
    dropFromHand(cx, cy, hand, reach) {
        const r = Phaser.Math.FloatBetween(40, Math.max(41, reach - 10));
        const x = cx + Math.cos(hand.angle) * r;
        const y = cy + Math.sin(hand.angle) * r;
        if (Phaser.Math.Distance.Between(x, y, this.soul.x, this.soul.y) < HAND_DROP_CLEAR) {
            return;
        }
        // Deitada na direção do giro, como uma lasca que ficou para trás.
        const blade = this.projectiles.create(x, y, "battle-blade")
            .setDepth(28)
            .setRotation(hand.angle + (hand.speed > 0 ? Math.PI / 2 : -Math.PI / 2));
        blade.body.setSize(14, 14, true);
        blade.body.setVelocity(0, 0);
        this.later(HAND_DROP_LIFE_MS, () => {
            if (blade.active) {
                this.tweens.add({ targets: blade, alpha: 0, duration: 200, onComplete: () => blade.destroy() });
            }
        });
    }

    soulNearSegment(x1, y1, x2, y2, r) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len2 = dx * dx + dy * dy || 1;
        const t = Phaser.Math.Clamp(((this.soul.x - x1) * dx + (this.soul.y - y1) * dy) / len2, 0, 1);
        const px = x1 + dx * t;
        const py = y1 + dy * t;
        return (this.soul.x - px) ** 2 + (this.soul.y - py) ** 2 <= r * r;
    }

    // ESPELHO: a caixa se parte em duas metades que se afastam e sobem e descem
    // em contratempo. Na outra metade aparece uma SEGUNDA alma que copia a sua
    // espelhada no vão — e ela também leva dano. Lâminas caem nas duas metades
    // sem combinar uma com a outra: é preciso achar um lugar bom para as duas
    // almas ao mesmo tempo.
    startMirror() {
        // A alma começa o turno no centro exato: aí o lado é sorteado.
        this.splitSide = this.soul.x < this.box.x ? 0
            : this.soul.x > this.box.x ? 1 : Phaser.Math.Between(0, 1);
        this.split = { gap: 0, offA: 0, offB: 0 };
        this.boxColor = WITCH_TINT;
        this.applyBox();
        this.mirrorSoul = this.add.image(this.soul.x, this.soul.y, "battle-soul")
            .setDepth(30).setTint(MIRROR_TINT).setAlpha(0.85).setVisible(false);
        const split = this.split;
        const step = (cfg, next) => this.tweens.add({
            targets: split, ...cfg,
            onUpdate: () => this.applyBox(),
            onComplete: () => { if (this.dodgeActive) next(); }
        });
        step({ gap: 110, duration: 700, ease: "Back.easeOut" }, () => {
            step({ offA: -55, offB: 55, duration: 950, ease: "Sine.easeInOut", yoyo: true, repeat: 1 }, () => {
                step({ gap: 0, offA: 0, offB: 0, duration: 600, ease: "Quad.easeIn" }, () => {
                    this.split = null;
                    this.boxColor = 0xf7f7f7;
                    this.applyBox();
                });
            });
        });
        this.spawnTimer = this.time.addEvent({ delay: 300, loop: true, callback: () => this.spawnSplitRain() });
    }

    // A segunda alma: mesma posição relativa, espelhada no eixo do vão. Só existe
    // enquanto as metades estão separadas.
    updateMirror() {
        const mirror = this.mirrorSoul;
        if (!mirror) {
            return;
        }
        const rects = this.boxRects();
        if (rects.length < 2) {
            mirror.setVisible(false);
            return;
        }
        const mine = rects[this.splitSide];
        const other = rects[1 - this.splitSide];
        mirror.setVisible(true).setPosition(other.x - (this.soul.x - mine.x), other.y + (this.soul.y - mine.y));
        this.projectiles.getChildren().slice().forEach((p) => {
            if (p.active && !p.bouncing
                && Phaser.Math.Distance.Between(p.x, p.y, mirror.x, mirror.y) < 14) {
                p.destroy();
                this.hurtSoul();
            }
        });
    }

    // Chuva das metades: cada lâmina cai numa metade sorteada, às vezes mirada
    // na alma (ou na espelho) daquela metade.
    spawnSplitRain() {
        const rects = this.boxRects();
        const pick = Phaser.Math.Between(0, rects.length - 1);
        const r = rects[pick];
        const aimAt = rects.length > 1 && pick !== this.splitSide ? this.mirrorSoul : this.soul;
        const aimed = aimAt?.visible && Math.random() < 0.35;
        const x = aimed
            ? Phaser.Math.Clamp(aimAt.x, r.x - r.w / 2 + 14, r.x + r.w / 2 - 14)
            : Phaser.Math.Between(r.x - r.w / 2 + 14, r.x + r.w / 2 - 14);
        const blade = this.projectiles.create(x, r.y - r.h / 2 + 12, "battle-blade")
            .setDepth(28).setRotation(Math.PI / 2);
        blade.body.setSize(14, 14, true);
        blade.body.setVelocity(0, Phaser.Math.Between(this.config.projectileSpeed.min, this.config.projectileSpeed.max));
    }

    // SENTENÇA: a caixa anda (desliza, estreita, achata) e a cada
    // SENTENCE_EVERY_MS um 死 é escrito embaixo da alma — o ideograma é o aviso,
    // a caveira em chamas que sai dele é o dano. Parar é morrer, mas as paredes
    // que andam empurram a alma de volta para as marcas antigas. Uma em cada duas
    // marcas vai onde a alma VAI estar, se seguir no mesmo rumo.
    startSentence() {
        this.boxColor = WITCH_TINT;
        this.applyBox();
        this.sentenceCount = 0;
        this.later(350, () => this.moveBoxAround());
        this.spawnTimer = this.time.addEvent({ delay: SENTENCE_EVERY_MS, loop: true, callback: () => this.markSentence() });
    }

    markSentence() {
        this.sentenceCount += 1;
        const b = this.box;
        let x = this.soul.x;
        let y = this.soul.y;
        if (this.sentenceCount % 2 === 0) {
            x += this.soul.body.velocity.x * 0.5;
            y += this.soul.body.velocity.y * 0.5;
        }
        x = Phaser.Math.Clamp(x, b.x - b.w / 2 + 16, b.x + b.w / 2 - 16);
        y = Phaser.Math.Clamp(y, b.y - b.h / 2 + 16, b.y + b.h / 2 - 16);
        this.spawnFx("fx-death", x, y, { depth: 26, scale: SENTENCE_MARK_SCALE });
        const now = this.time.now;
        this.hazards.push({
            x, y, r: SENTENCE_R,
            from: now + Effects.frameMs("fx-death", DEATH_SKULL.from),
            until: now + Effects.frameMs("fx-death", DEATH_SKULL.to)
        });
    }

    // A caixa desliza para um lado, atravessa para o outro estreitando, volta
    // achatada e se endireita. As paredes empurram a alma junto.
    moveBoxAround() {
        const steps = [
            { x: BOX.x - 190, w: 300, h: BOX.h, duration: 1300 },
            { x: BOX.x + 190, w: 300, h: BOX.h, duration: 1600 },
            { x: BOX.x, w: 560, h: 170, duration: 1300 },
            { x: BOX.x, w: BOX.w, h: BOX.h, duration: 900 }
        ];
        const run = (i) => {
            if (i >= steps.length || !this.dodgeActive) {
                return;
            }
            const { duration, ...to } = steps[i];
            this.tweens.add({
                targets: this.box, ...to, duration, ease: "Sine.easeInOut",
                onUpdate: () => this.applyBox(),
                onComplete: () => run(i + 1)
            });
        };
        run(0);
    }

    defenseTurn() {
        this.setBattleStatus("> SEQUÊNCIA HOSTIL A CAMINHO — DEFENDA-SE!", "#ff4545");
        const puzzle = Phaser.Utils.Array.GetRandom(this.config.defensePuzzles ?? DEFENSE_PUZZLES);

        this.foeAttackAnim(() => {
            let solvedThisRun = false;

            this.console = createConsole(this, puzzle, {
                singleAttempt: true,
                timeLimitMs: puzzle.timeLimitMs ?? DEFENSE_TIME_LIMIT,
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
        // O Dissipador corta o dano pela metade enquanto o turno do boss dura.
        const real = this.danoReduzido ? Math.max(1, Math.round(amount / 2)) : amount;
        this.hp = setHp(this.hp - real);
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
            // O embate recomeça do zero: o bônus do Cache e o Overclock somem
            // junto com o resto (os itens em si já foram consumidos).
            this.maxReprograms = this.config.maxReprograms ?? MAX_REPROGRAMS;
            this.ataqueDobrado = false;
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

        const dropped = this.dropReward();

        this.time.delayedCall(dropped ? 2800 : 1800, () => {
            this.scene.stop();
            this.scene.resume(this.config.returnScene, { victory: true });
        });
    }

    // Espólio do boss: entra no inventário e é ANUNCIADO na tela — item que o
    // jogador não vê cair é item que ele nunca usa. Devolve se houve drop, para
    // a vitória segurar mais um pouco antes de voltar para a sala.
    dropReward() {
        const item = itemDef(this.config.reward);
        if (!item) {
            return false;
        }

        addItem(item.id, 1);

        const label = this.add.text(WIDTH / 2, HEIGHT / 2, `+ ${item.name.toUpperCase()}`, {
            fontFamily: "VCR",
            fontSize: "30px",
            color: "#ffb347"
        }).setOrigin(0.5).setDepth(1000).setAlpha(0);

        this.tweens.add({
            targets: label,
            alpha: 1,
            y: HEIGHT / 2 - 26,
            delay: 900,
            duration: 500,
            ease: "Sine.easeOut"
        });

        return true;
    }
}
