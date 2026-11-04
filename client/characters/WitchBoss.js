import Phaser from "phaser";
import Effects, { DEATH_SKULL } from "../ui/Effects";
import Sfx from "../ui/Sfx";
import walkUrl from "../assets/sprites/boss/witch/walk.png";
import attackUrl from "../assets/sprites/boss/witch/attack.png";

// WITCH — boss final do capítulo 2, FASE 1: a luta NO MAPA, em tempo real.
// Inspirada no WITCH (Harwell Dekatron, 1951), o computador digital mais velho
// do mundo que ainda funciona — religado em 2012. A máquina que sobreviveu ao
// tempo, então os golpes dela brincam com o tempo: o que ela fez VOLTA (eco), o
// lugar onde você ESTEVE vira armadilha (sentença), e ela pula o espaço entre
// vocês (passo no tempo).
//
// Enquanto luta, o núcleo dela é BLINDADO: o [R] não a enxerga. A saída é
// CANSÁ-LA (barra de FÔLEGO no topo), e as duas estratégias valem:
//   - sobreviver: cada golpe que ela dá custa fôlego (TIRE_PER_ATTACK);
//   - bater: logo depois de cada golpe ela fica de GUARDA ABERTA (RECOVER_MS)
//     e o [F] ali custa bem mais (TIRE_PER_HIT). Fora dessa janela, apara.
// Zerar uma das duas constantes deixa só a outra estratégia. Na metade do
// fôlego ela ENFURECE (cada golpe ganha uma camada a mais). Sem fôlego, fica
// tonta por TIRED_MS: é a janela do [R], que abre a FASE 2 (a BattleScene).
//
// Golpes — a DIFICULDADE vem de leitura e de posição, não de velocidade:
//   ceifada   — perto. O "!" avisa, a foice gira ao redor dela e o golpe deixa
//               um ECO: uma sombra violeta que repete a ceifada no mesmo lugar
//               ECHO_DELAY_MS depois. O eco cai DENTRO da guarda aberta, então
//               bater nela é escolher a hora: depois do eco, não antes.
//               Enfurecida, são dois ecos.
//   sentença  — de média distância. Ela escreve 死 no chão onde a Artemis ESTÁ
//               e onde ESTEVE há pouco; o ideograma é o aviso, a caveira em
//               chamas que sai dele é o dano. Fugir em linha reta pelo próprio
//               rastro é o que mata. Enfurecida, marca também onde você VAI
//               estar (a posição prevista).
//   investida — de média distância. A mira trava no "!" (onde a Artemis ESTAVA)
//               e ela avança em disparada até lá e um pouco além, com o golpe
//               da foice e um rastro branco; quem estiver no caminho leva. É
//               o que a tira do lugar (a folha do pack não tem corrida: o
//               "Maid Run.png" gratuito é o ataque, ver docs/ASSETS.md).
//               Enfurecida, termina soltando uma onda.
//   onda      — de longe (ela anda pouco, e sem isto quase não alcançava a
//               Artemis). A foice corta o ar e solta uma MEIA-LUA de energia
//               que viaja reto, na mira travada no aviso: sair da linha basta.
//               Enfurecida, são três, em leque.
//   badalada  — a cada TOLL_EVERY golpes, alternando com a meia-noite. Anéis
//               de lâminas saem dela com UMA brecha cada, e a brecha gira 90° de
//               um anel para o outro: é preciso correr em volta dela de brecha
//               em brecha.
//   meia-noite — o golpe do TEMPO, que usa a própria sala. Ela some e
//               reaparece no eixo do mostrador do chão (`arena`), o relógio da
//               parede (`wallClock`) volta a andar e dois PONTEIROS de energia
//               varrem o mostrador — dentro dele, só cruzando o ponteiro perto
//               do eixo, onde ele é lento. Junto, BULLET HELL: do eixo sai uma
//               espiral de lâminas e da ponta do minuto saem rajadas para fora,
//               então fugir do mostrador também tem o que desviar. Alterna
//               entre REBOBINAR (no meio do golpe os ponteiros e a espiral
//               voltam: quem correu na frente deles é pego na volta) e ACELERAR
//               (ponteiros e cadência dos tiros sobem, e ela sai do golpe
//               acelerada). Enfurecida, um braço de espiral e duas lâminas por
//               rajada a mais.
//   passo     — se a Artemis fica longe tempo demais: ela some numa caveira de
//               fumaça, um portal abre ATRÁS da Artemis e ela sai dele ceifando.
// Se registra como inimigo (registerEnemy): colisão sólida com a Artemis, o [F]
// da sala chega em takeMeleeHit e o update vem do loop da sala.

const FRAME = 144;                   // quadro da folha (a personagem ocupa ~30x50 dele)
const SCALE = 2.5;
const BODY_CENTER_Y = 92;            // meio do corpo dentro do quadro (px da folha)
const FEET_Y = 116;                  // linha dos pés (px da folha)
const FEET = (FEET_Y - BODY_CENTER_Y) * SCALE;   // do centro do corpo aos pés, em tela
const HITBOX = { w: 22, h: 10, x: 61, y: FEET_Y - 10 };   // nos pés, em px da folha

// Uma linha por direção. A ordem da folha é norte, sul, leste, oeste (o golpe
// da linha 2 se estende para a direita e o da linha 3 para a esquerda).
const ROWS = { n: 0, s: 1, e: 2, w: 3 };
const WALK_COLS = 5;
const WALK_FPS = 10;
const ATTACK_COLS = 10;
const ATTACK_FPS = 20;
const HIT_FRAME = 3;                 // quadro em que a foice passa
const HIT_MS = (HIT_FRAME * 1000) / ATTACK_FPS;

const SPEED = 120;
// Histerese da direção: só troca de EIXO (horizontal <-> vertical) quando o novo
// domina com esta folga. Sem ela, perseguindo na diagonal, a direção trocava a
// cada quadro, a caminhada reiniciava no quadro 0 e ela deslizava parada.
const FACE_BIAS = 1.35;

const STAMINA_MAX = 100;
const TIRE_PER_ATTACK = 12;          // só sobrevivendo: ~8 golpes até cansar
const TIRE_PER_HIT = 12;             // cada [F] na guarda aberta
const HIT_COOLDOWN_MS = 350;         // [F] repetido não conta em dobro
const RAGE_AT = 50;                  // enfurece com metade do fôlego
const TIRED_MS = 6000;               // janela do [R]
const RECOVER_MS = 1400;             // guarda aberta (o eco acontece dentro dela)
const WINDUP_MS = 480;
const QUICK_WINDUP_MS = 260;         // saindo do portal
const RESPAWN_IDLE_MS = 1200;

const MELEE_TRIGGER = 150;
const MELEE_REACH = 130;
const MELEE_DAMAGE = 4;
const ECHO_DELAY_MS = 650;
const ECHO_DAMAGE = 3;
const ECHO_TINT = 0xb48cff;

const SENTENCE_MIN = 170;            // de perto ela prefere ceifar
const SENTENCE_COOLDOWN_MS = 3400;
const SENTENCE_PAST_MS = [0, 450, 900];   // onde a Artemis está e onde ESTEVE
const SENTENCE_PREDICT_MS = 500;     // enfurecida: onde ela VAI estar
const SENTENCE_STAGGER_MS = 150;
const DEATH_SCALE = 1.9;
const DEATH_RADIUS = 46;
const DEATH_DAMAGE = 4;
const TRAIL_MS = 1500;               // quanto do rastro da Artemis fica guardado

const TOLL_EVERY = 4;
const TOLL_BLADES = 20;
const TOLL_GAP = 3;                  // lâminas que faltam em cada anel (a brecha)
const TOLL_TURN = 5;                 // a brecha gira 5 posições (90°) por anel
const TOLL_RING_MS = 560;

// Onda da foice: meia-lua que viaja reto. O dano vale na FAIXA da meia-lua
// (WAVE_HALF_W para cada lado da linha de voo, WAVE_HALF_T de espessura).
const WAVE_MIN = 150;                // = MELEE_TRIGGER: de perto ela ceifa (e a ceifada também solta onda)
const WAVE_COOLDOWN_MS = 2300;
const WAVE_SPEED = 330;              // a Artemis anda a 220 e corre a 330: dá para sair da linha
const WAVE_HALF_W = 50;
const WAVE_HALF_T = 16;
const WAVE_DAMAGE = 4;
const WAVE_FAN_DEG = 24;             // enfurecida: três, em leque
const WAVE_LIFE_MS = 2400;
const WAVE_GHOST_MS = 45;            // rastro de imagens da meia-lua

// Meia-noite. Ângulos de relógio em graus (0 = 12 h, sentido horário); os
// ponteiros começam onde o relógio da parede está parado (hall_bg.py).
const CLOCK_TELEGRAPH_MS = 600;      // o mostrador acende e os ponteiros aparecem fracos
const CLOCK_ACTIVE_MS = 4200;
const CLOCK_START = { hour: -28, minute: -6 };
const MINUTE_SPEED = 100;            // graus/s: na borda do mostrador passa (e muito) da corrida dela
const HOUR_SPEED = 40;
const MINUTE_LEN = 1.08;             // fração do raio do mostrador (passa um pouco da borda)
const HOUR_LEN = 0.62;
const MINUTE_HALF_W = 12;
const HOUR_HALF_W = 18;
const CLOCK_DAMAGE = 4;
const ACCEL_FROM = 0.8;              // ACELERAR: multiplica a velocidade de 0,8 a 1,8
const ACCEL_TO = 1.8;
// Bullet hell da meia-noite: do EIXO sai uma espiral de lâminas (os braços
// giram; ao rebobinar, giram para o outro lado junto com os ponteiros) e da
// PONTA do ponteiro dos minutos saem rajadas para fora — então fugir para fora
// do mostrador também tem o que desviar. Ao acelerar, a cadência acelera junto.
const SPIRAL_ARMS = 3;               // enfurecida: um braço a mais
const SPIRAL_EVERY_MS = 120;
const SPIRAL_SPIN = 150;             // graus/s que os braços giram
const SPIRAL_SPEED = 170;            // px/s (o tiro comum da sala anda a 190)
const TIP_EVERY_MS = 420;
const TIP_SHOTS = 3;                 // enfurecida: 5
const TIP_SPREAD_DEG = 14;
const TIP_SPEED = 230;
const HASTE_MS = 3500;               // depois de ACELERAR, ela mesma fica rápida
const HASTE_MULT = 1.65;
const HASTE_FX_MS = 380;

// Investida: avanço em linha reta até onde a Artemis estava no aviso.
const DASH_MIN = 190;
const DASH_MAX = 560;
const DASH_COOLDOWN_MS = 3200;
const DASH_WINDUP_MS = 420;
const DASH_SPEED = 640;              // quase o dobro da corrida da Artemis: sair da linha, não fugir
const DASH_OVERSHOOT = 80;           // passa um pouco de onde ela estava
const DASH_HIT_R = 46;               // pés com pés
const DASH_DAMAGE = 4;
const DASH_GHOST_MS = 40;

const STEP_FAR = 300;                // longe assim...
const STEP_AFTER_MS = 2400;          // ...por esse tempo, ela vem pelo portal
const STEP_BEHIND = 110;

const TIRED_TINT = 0x9a9aaa;
const HUD = { x: 640, y: 52, w: 320, h: 12 };
const FROZEN = new Set(["idle", "windup", "attack", "step", "battle", "down", "clock", "dash"]);

export default class WitchBoss {
    // Sprite da FASE 2: um combatente da BattleScene (config.combatants), de
    // frente para a câmera (linha sul) e com a animação de ataque como telegrafo.
    static BATTLE_SPRITE = {
        key: "witch",
        walkUrl,
        attackUrl,
        frameSize: FRAME,
        walkFrames: { start: ROWS.s * WALK_COLS, end: ROWS.s * WALK_COLS + WALK_COLS - 1 },
        attackFrames: { start: ROWS.s * ATTACK_COLS, end: ROWS.s * ATTACK_COLS + ATTACK_COLS - 1 }
    };

    static preload(scene) {
        const frame = { frameWidth: FRAME, frameHeight: FRAME };
        if (!scene.textures.exists("witch-walk")) {
            scene.load.spritesheet("witch-walk", walkUrl, frame);
        }
        if (!scene.textures.exists("witch-attack")) {
            scene.load.spritesheet("witch-attack", attackUrl, frame);
        }
        Effects.preload(scene);
        Sfx.preload(scene);
    }

    // Chaves da sala terminam na direção (`witch-walk-s`); a BattleScene usa
    // `witch-walk`/`witch-attack` sem sufixo, então as duas não se pisam.
    static createAnimations(scene) {
        Object.entries(ROWS).forEach(([dir, row]) => {
            const walk = `witch-walk-${dir}`;
            if (!scene.anims.exists(walk)) {
                scene.anims.create({
                    key: walk,
                    frames: scene.anims.generateFrameNumbers("witch-walk", { start: row * WALK_COLS, end: row * WALK_COLS + WALK_COLS - 1 }),
                    frameRate: WALK_FPS,
                    repeat: -1
                });
            }
            const attack = `witch-attack-${dir}`;
            if (!scene.anims.exists(attack)) {
                scene.anims.create({
                    key: attack,
                    frames: scene.anims.generateFrameNumbers("witch-attack", { start: row * ATTACK_COLS, end: row * ATTACK_COLS + ATTACK_COLS - 1 }),
                    frameRate: ATTACK_FPS,
                    repeat: 0
                });
            }
        });
        Effects.createAnimations(scene);
        // Estrelinhas de tonta, em loop enquanto ela está sem fôlego.
        if (!scene.anims.exists("witch-dizzy")) {
            scene.anims.create({
                key: "witch-dizzy",
                frames: scene.anims.generateFrameNumbers("fx-dizzy", { start: 0, end: 23 }),
                frameRate: 14,
                repeat: -1
            });
        }
    }

    // `arena`: o mostrador do chão onde a meia-noite acontece ({ cx, cy, rx, ry },
    // em tela; sem ele, uma elipse em volta da posição inicial). `wallClock`:
    // o relógio pintado na parede ({ x, y, r }), cujos ponteiros passam a ser
    // desenhados aqui para andarem junto com os do chão.
    constructor(scene, x, y, { arena, wallClock } = {}) {
        this.scene = scene;
        // Interface do registerEnemy / tryMelee da sala.
        this.type = "witch";
        this.def = { name: "WITCH", contactDamage: 0 };
        this.disabled = false;

        this.home = { x, y };
        this.stamina = STAMINA_MAX;
        this.state = "idle";
        this.facing = "s";
        this.attacks = 0;
        this.enraged = false;
        this.nextSentence = 0;
        this.nextHitAt = 0;
        this.lastNearAt = 0;
        this.trail = [];       // posições recentes dos pés da Artemis (sentença)
        this.hazards = [];     // círculos de dano no chão (caveiras da sentença)
        this.marks = [];       // sprites das marcas, para limpar antes da hora
        this.echoes = [];      // sombras dos ecos pendentes
        this.waves = [];       // meias-luas da onda da foice em voo
        this.nextWave = 0;
        this.nextDash = 0;
        this.specials = 0;     // badalada e meia-noite se alternam
        this.clockMode = 0;    // meia-noite: rebobinar e acelerar se alternam
        this.hasteUntil = 0;
        this.arena = arena ?? { cx: x, cy: y + FEET, rx: 300, ry: 175 };
        this.wallClock = wallClock ?? null;
        this.hands = { ...CLOCK_START };

        WitchBoss.createAnimations(scene);
        this.createBladeTexture();
        this.createWaveTexture();
        this.floorClock = scene.add.graphics().setDepth(-3);
        if (this.wallClock) {
            this.wallHands = scene.add.graphics().setDepth(-9);   // em cima do fundo, embaixo das scanlines
            this.drawWallHands(0);
        }

        this.sprite = scene.physics.add.sprite(x, y, "witch-walk", ROWS.s * WALK_COLS)
            .setScale(SCALE)
            .setOrigin(0.5, BODY_CENTER_Y / FRAME);
        this.sprite.body.setSize(HITBOX.w, HITBOX.h, false).setOffset(HITBOX.x, HITBOX.y);
        this.sprite.body.setImmovable(true);     // a Artemis não empurra a boss
        this.sprite.setCollideWorldBounds(true);
        this.idle();
        this.drawHud();

        scene.registerEnemy(this);
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }

    // Começa a lutar (a sala chama depois do diálogo de entrada).
    start() {
        this.state = "chase";
        this.lastNearAt = this.scene.time.now;
    }

    // --- Loop ---------------------------------------------------------------

    update() {
        this.sprite.setDepth(this.sprite.y + FEET);
        this.dizzy?.setPosition(this.sprite.x, this.sprite.y - 92);
        if (this.disabled || !this.sprite.body) {
            return;
        }
        const now = this.scene.time.now;   // relógio da cena: desacelera no modo [R]
        const player = this.scene.player;
        this.recordTrail(now, player);
        this.updateHazards(now, player);
        this.updateWaves(now, player);
        if (this.state === "clock") {
            this.updateClock(now, player);
            return;
        }
        if (this.state === "dash") {
            this.updateDash(now, player);
            return;
        }

        if (this.state === "tired") {
            this.updateHud();
            if (now >= this.tiredUntil) {
                this.recoverFromTired();
            }
            return;
        }
        if (!player.enabled || FROZEN.has(this.state)) {
            this.sprite.body.setVelocity(0, 0);
            return;
        }
        if (this.state === "recover") {
            this.sprite.body.setVelocity(0, 0);
            if (now >= this.recoverUntil) {
                this.state = "chase";
            }
            return;
        }
        this.updateChase(now, player.sprite);
    }

    updateChase(now, target) {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        if (dist <= STEP_FAR) {
            this.lastNearAt = now;
        }
        if (now - this.lastNearAt >= STEP_AFTER_MS) {
            this.startStep();
            return;
        }
        // Ao enfurecer, a meia-noite vem na hora: é a virada da luta.
        if (this.clockPending) {
            this.clockPending = false;
            this.startClock();
            return;
        }
        if (this.attacks % TOLL_EVERY === TOLL_EVERY - 1) {
            this.specials += 1;
            // A meia-noite é a PRIMEIRA especial: batendo na guarda aberta ela
            // cansa em poucos golpes, e a meia-noite no 8º nunca chegava.
            if (this.specials % 2 === 1) {
                this.startClock();
            } else {
                this.windup("badalada");
            }
            return;
        }
        if (dist <= MELEE_TRIGGER) {
            this.windup("ceifada");
            return;
        }
        if (dist >= DASH_MIN && dist <= DASH_MAX && now >= this.nextDash) {
            this.nextDash = now + DASH_COOLDOWN_MS;
            this.windup("investida", DASH_WINDUP_MS);
            return;
        }
        // De longe, onda e sentença se revezam (a que estiver pronta, dando a
        // vez para a outra quando as duas estão).
        const waveReady = dist >= WAVE_MIN && now >= this.nextWave;
        const sentenceReady = dist >= SENTENCE_MIN && now >= this.nextSentence;
        if (sentenceReady && (!waveReady || this.lastRanged === "onda")) {
            this.nextSentence = now + SENTENCE_COOLDOWN_MS;
            this.lastRanged = "sentenca";
            this.windup("sentenca");
            return;
        }
        if (waveReady) {
            this.nextWave = now + WAVE_COOLDOWN_MS;
            this.lastRanged = "onda";
            this.windup("onda");
            return;
        }
        const hasted = now < this.hasteUntil;
        const speed = hasted ? SPEED * HASTE_MULT : SPEED;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        this.sprite.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.face(angle);
        this.sprite.play(`witch-walk-${this.facing}`, true);
        this.sprite.anims.timeScale = hasted ? HASTE_MULT : 1;
        if (hasted && now >= (this.nextHasteFx ?? 0)) {
            this.nextHasteFx = now + HASTE_FX_MS;
            Effects.play(this.scene, "fx-haste", this.x, this.y + 20, { scale: 1.1, depth: this.sprite.depth - 1 });
        }
    }

    // --- Golpes ---------------------------------------------------------------

    // Telegrafo: para, encara a Artemis e pisca. A mira fica TRAVADA aqui —
    // sair da frente durante o aviso funciona. Golpe que machuca por perto ou
    // em área ganha o "!" sobre a cabeça.
    windup(kind, ms = WINDUP_MS) {
        const s = this.scene;
        const target = s.player.sprite;
        this.state = "windup";
        this.sprite.body.setVelocity(0, 0);
        this.aim = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        this.aimDist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        this.face(this.aim, true);
        this.idle();
        if (kind !== "sentenca") {
            Effects.play(s, "fx-alert", this.x, this.y - 108, { scale: 0.7, depth: 830 });
        }
        s.tweens.add({
            targets: this.sprite, alpha: 0.55, duration: ms / 4, yoyo: true, repeat: 1,
            onStart: () => this.sprite.setTintFill(0xffffff),
            onComplete: () => {
                this.sprite.setAlpha(1);
                this.applyTint();
                if (this.state === "windup") {
                    this.attack(kind);
                }
            }
        });
    }

    attack(kind) {
        const s = this.scene;
        // Ficha do golpe: se a Artemis cair no meio dele (reset), o "terminou"
        // pendurado deste golpe dispararia junto com o do PRÓXIMO e o fôlego
        // cairia em dobro. Só o golpe da ficha atual conta.
        const token = (this.attackToken = (this.attackToken ?? 0) + 1);
        const current = () => this.state === "attack" && this.attackToken === token;
        if (kind === "investida") {
            this.startDash(token);
            return;
        }
        this.state = "attack";
        this.sprite.play(`witch-attack-${this.facing}`);
        s.time.delayedCall(HIT_MS, () => {
            if (!current()) {
                return;
            }
            if (kind === "sentenca") {
                this.sentence();
            } else if (kind === "onda") {
                this.slashWave();
            } else if (kind === "badalada") {
                this.toll();
            } else {
                this.reap();
            }
        });
        this.sprite.once("animationcomplete", () => {
            if (current()) {
                this.afterAttack();
            }
        });
    }

    // CEIFADA: a foice passa em volta dela e deixa um eco (dois, enfurecida).
    reap() {
        const s = this.scene;
        Sfx.play(s, "bump", 0.8);
        s.cameras.main.shake(110, 0.003);
        this.impactAt(this.x, this.y, this.aim);
        this.hitIfNear(this.x, this.y, MELEE_DAMAGE);
        // O corte segue como onda: fugir para trás da foice não basta.
        this.launchWave(this.aim);
        const echoes = this.enraged ? 2 : 1;
        for (let k = 1; k <= echoes; k += 1) {
            this.queueEcho(this.x, this.y, this.facing, this.aim, ECHO_DELAY_MS * k);
        }
    }

    // A sombra do golpe fica marcada no lugar NA HORA (fraquinha): é o aviso.
    // Passado o atraso, ela repete a ceifada inteira ali.
    queueEcho(x, y, facing, aim, delay) {
        const s = this.scene;
        const ghost = s.add.sprite(x, y, "witch-attack", ROWS[facing] * ATTACK_COLS)
            .setScale(SCALE)
            .setOrigin(0.5, BODY_CENTER_Y / FRAME)
            .setTint(ECHO_TINT)
            .setAlpha(0.22)
            .setDepth(y + FEET - 1);
        this.echoes.push(ghost);
        s.time.delayedCall(delay, () => {
            if (!ghost.active) {
                return;
            }
            ghost.setAlpha(0.6);
            ghost.play(`witch-attack-${facing}`);
            s.time.delayedCall(HIT_MS, () => {
                if (!ghost.active) {
                    return;
                }
                Sfx.play(s, "bump", 0.5);
                Effects.play(s, "fx-burst", x + Math.cos(aim) * 40, y + Math.sin(aim) * 30 + 10, {
                    scale: 1.1, depth: 830
                });
                this.hitIfNear(x, y, ECHO_DAMAGE);
            });
            ghost.once("animationcomplete", () => {
                s.tweens.add({ targets: ghost, alpha: 0, duration: 200, onComplete: () => this.dropEcho(ghost) });
            });
        });
    }

    dropEcho(ghost) {
        this.echoes = this.echoes.filter((g) => g !== ghost);
        ghost.destroy();
    }

    // SENTENÇA: 死 onde a Artemis está e onde esteve (e onde vai estar, se
    // enfurecida). O ideograma é o aviso; a caveira que sai dele é o dano.
    sentence() {
        const s = this.scene;
        Sfx.play(s, "hack", 0.6);
        const spots = SENTENCE_PAST_MS.map((ms) => this.pastPos(ms));
        if (this.enraged) {
            spots.push(this.predictPos(SENTENCE_PREDICT_MS));
        }
        spots.forEach((p, i) => {
            s.time.delayedCall(i * SENTENCE_STAGGER_MS, () => this.placeMark(p.x, p.y));
        });
    }

    placeMark(x, y) {
        const s = this.scene;
        if (this.state === "battle" || this.state === "down") {
            return;
        }
        const mark = Effects.play(s, "fx-death", x, y, { scale: DEATH_SCALE, depth: -3 });
        this.marks.push(mark);
        mark.once("destroy", () => { this.marks = this.marks.filter((m) => m !== mark); });
        const now = s.time.now;
        this.hazards.push({
            x, y, r: DEATH_RADIUS, dmg: DEATH_DAMAGE,
            from: now + Effects.frameMs("fx-death", DEATH_SKULL.from),
            until: now + Effects.frameMs("fx-death", DEATH_SKULL.to)
        });
    }

    // BADALADA: anéis de lâminas com UMA brecha, que gira 90° de um anel para o
    // outro (três anéis, enfurecida).
    toll() {
        const s = this.scene;
        const rings = this.enraged ? 3 : 2;
        const gap = Phaser.Math.Between(0, TOLL_BLADES - 1);
        for (let k = 0; k < rings; k += 1) {
            s.time.delayedCall(k * TOLL_RING_MS, () => {
                if (this.state !== "attack" && this.state !== "recover") {
                    return;                   // interrompida (caiu, virou batalha...)
                }
                Sfx.play(s, "bump", 0.7);
                Effects.play(s, "fx-ring", this.x, this.y + 30, { scale: 2.2, depth: 830 });
                this.fireRing(gap + k * TOLL_TURN);
            });
        }
    }

    fireRing(gapStart) {
        const s = this.scene;
        for (let i = 0; i < TOLL_BLADES; i += 1) {
            if ((i - gapStart + TOLL_BLADES * 4) % TOLL_BLADES < TOLL_GAP) {
                continue;                     // a brecha
            }
            const a = (i / TOLL_BLADES) * Math.PI * 2;
            const blade = s.spawnEnemyBullet?.(this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 22 + 20, a, "witch-blade", 1.6);
            blade?.setRotation(a);
        }
    }

    // INVESTIDA: sai na mira travada, com o golpe tocando e o rastro branco.
    startDash(token) {
        const s = this.scene;
        const b = s.bounds;
        const len = Math.min(this.aimDist + DASH_OVERSHOOT, DASH_MAX + DASH_OVERSHOOT);
        this.state = "dash";
        this.dash = {
            token,
            until: s.time.now + (len / DASH_SPEED) * 1000,
            ghostAt: 0,
            // Destino preso na sala: bater na parede também encerra.
            tx: Phaser.Math.Clamp(this.x + Math.cos(this.aim) * len, b.x + 30, b.x + b.w - 30),
            ty: Phaser.Math.Clamp(this.y + Math.sin(this.aim) * len, b.y, b.y + b.h - FEET)
        };
        Sfx.play(s, "laser", 0.4);
        Effects.play(s, "fx-impact", this.x, this.y + FEET * 0.6, {
            scale: 1.2, depth: 830, angle: Phaser.Math.RadToDeg(this.aim) + 90
        });
        // Toca o golpe esticado para durar a investida inteira.
        this.sprite.play(`witch-attack-${this.facing}`);
        this.sprite.anims.timeScale = (ATTACK_COLS / ATTACK_FPS) / Math.max(0.25, len / DASH_SPEED);
        this.sprite.body.setVelocity(Math.cos(this.aim) * DASH_SPEED, Math.sin(this.aim) * DASH_SPEED);
    }

    updateDash(now, player) {
        const d = this.dash;
        const s = this.scene;
        if (now >= d.ghostAt) {
            d.ghostAt = now + DASH_GHOST_MS;
            const ghost = s.add.sprite(this.x, this.y, this.sprite.texture.key, this.sprite.frame.name)
                .setScale(SCALE).setOrigin(this.sprite.originX, this.sprite.originY)
                .setTintFill(0xf2f0ff).setAlpha(0.45).setDepth(this.sprite.depth - 1);
            s.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
        }
        if (Phaser.Math.Distance.Between(this.x, this.y + FEET, player.sprite.x, player.feetY) <= DASH_HIT_R) {
            s.damagePlayer(DASH_DAMAGE);       // os i-frames da sala seguram o repique
        }
        const body = this.sprite.body;
        const arrived = Phaser.Math.Distance.Between(this.x, this.y, d.tx, d.ty) <= DASH_SPEED * 0.03;
        const blocked = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;
        if (now >= d.until || arrived || blocked) {
            this.endDash();
        }
    }

    endDash() {
        const d = this.dash;
        this.dash = null;
        this.sprite.body.setVelocity(0, 0);
        this.sprite.anims.timeScale = 1;
        Sfx.play(this.scene, "bump", 0.6);
        this.scene.cameras.main.shake(90, 0.003);
        if (this.enraged) {
            this.launchWave(this.aim);
        }
        if (this.attackToken === d.token) {
            this.state = "attack";
            this.afterAttack();
        }
    }

    // ONDA: a foice corta o ar e a meia-lua sai na mira travada no aviso.
    slashWave() {
        const s = this.scene;
        Sfx.play(s, "laser", 0.5);
        s.cameras.main.shake(90, 0.002);
        this.impactAt(this.x, this.y, this.aim);
        const fan = this.enraged ? [-WAVE_FAN_DEG, 0, WAVE_FAN_DEG] : [0];
        fan.forEach((deg) => this.launchWave(this.aim + Phaser.Math.DegToRad(deg)));
    }

    launchWave(angle) {
        const s = this.scene;
        const x = this.x + Math.cos(angle) * 46;
        const y = this.y + FEET * 0.5 + Math.sin(angle) * 34;
        const sprite = s.add.image(x, y, "witch-wave")
            .setRotation(angle)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(820);
        this.waves.push({ sprite, x, y, angle, born: s.time.now, last: s.time.now, ghostAt: 0 });
    }

    // Anda com o relógio da CENA (desacelera no [R]) e confere a faixa da
    // meia-lua contra os pés da Artemis, no referencial da própria onda.
    updateWaves(now, player) {
        if (!this.waves.length) {
            return;
        }
        const b = this.scene.bounds;
        this.waves = this.waves.filter((w) => {
            const dt = (now - w.last) / 1000;
            w.last = now;
            w.x += Math.cos(w.angle) * WAVE_SPEED * dt;
            w.y += Math.sin(w.angle) * WAVE_SPEED * dt;
            w.sprite.setPosition(w.x, w.y);
            if (now >= w.ghostAt) {
                w.ghostAt = now + WAVE_GHOST_MS;
                const ghost = this.scene.add.image(w.x, w.y, "witch-wave").setRotation(w.angle)
                    .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setDepth(819);
                this.scene.tweens.add({ targets: ghost, alpha: 0, scaleY: 0.7, duration: 240, onComplete: () => ghost.destroy() });
            }
            const dx = player.sprite.x - w.x;
            const dy = player.feetY - w.y;
            const along = dx * Math.cos(w.angle) + dy * Math.sin(w.angle);
            const side = -dx * Math.sin(w.angle) + dy * Math.cos(w.angle);
            if (Math.abs(along) <= WAVE_HALF_T && Math.abs(side) <= WAVE_HALF_W) {
                this.scene.damagePlayer(WAVE_DAMAGE);
            }
            const out = w.x < b.x - 60 || w.x > b.x + b.w + 60 || w.y < b.y - 60 || w.y > b.y + b.h + 60;
            if (out || now - w.born > WAVE_LIFE_MS) {
                w.sprite.destroy();
                return false;
            }
            return true;
        });
    }

    // MEIA-NOITE: some, aparece no eixo do mostrador e o relógio anda.
    startClock() {
        const s = this.scene;
        const { cx, cy } = this.arena;
        this.state = "clock";
        this.clockMode += 1;
        const mode = this.clockMode % 2 === 1 ? "rewind" : "accel";
        this.sprite.body.setVelocity(0, 0);
        Sfx.play(s, "hack", 0.6);
        Effects.play(s, "fx-skull", this.x, this.y, { scale: 1.8, depth: 830 });
        this.sprite.body.reset(cx, cy - FEET);
        this.facing = "s";
        this.idle();
        Effects.play(s, "fx-arrive", cx, cy - FEET - 10, { scale: 1.3, depth: 830 });
        const now = s.time.now;
        this.clock = {
            mode,
            start: now,
            live: now + CLOCK_TELEGRAPH_MS,
            end: now + CLOCK_TELEGRAPH_MS + CLOCK_ACTIVE_MS,
            last: now,
            turned: false,
            spiralAt: 0,
            tipAt: 0,
            spin: 0,
            hour: this.hands.hour,
            minute: this.hands.minute
        };
        this.onClock?.(mode);
    }

    updateClock(now, player) {
        const c = this.clock;
        const s = this.scene;
        this.sprite.body.setVelocity(0, 0);
        const dt = (now - c.last) / 1000;
        c.last = now;
        const live = now >= c.live;
        if (live) {
            // Rebobinar: anda até a metade e volta pelo mesmo caminho.
            // Acelerar: sempre para a frente, cada vez mais rápido.
            const t = (now - c.live) / CLOCK_ACTIVE_MS;
            let mult = 1;
            if (c.mode === "rewind") {
                mult = t < 0.5 ? 1 : -1.15;
                if (t >= 0.5 && !c.turned) {
                    c.turned = true;
                    Sfx.play(s, "bump", 0.7);
                    s.cameras.main.flash(160, 180, 140, 255, false);
                    this.onClockTurn?.();
                }
            } else {
                mult = ACCEL_FROM + (ACCEL_TO - ACCEL_FROM) * Math.min(1, t);
            }
            c.minute += MINUTE_SPEED * mult * dt;
            c.hour += HOUR_SPEED * mult * dt;
            this.hitByHand(player, c.minute, MINUTE_LEN, MINUTE_HALF_W);
            this.hitByHand(player, c.hour, HOUR_LEN, HOUR_HALF_W);
            this.clockBullets(now, c, mult, dt);
        }
        this.hands.hour = c.hour;
        this.hands.minute = c.minute;
        this.drawFloorClock(now, live);
        this.drawWallHands(live ? now : 0);
        if (now >= c.end) {
            this.endClock();
        }
    }

    endClock() {
        const mode = this.clock.mode;
        this.clock = null;
        this.floorClock.clear();
        this.drawWallHands(0);
        if (mode === "accel") {
            this.hasteUntil = this.scene.time.now + HASTE_MS;
        }
        this.state = "attack";      // afterAttack cansa e abre a guarda, como todo golpe
        this.afterAttack();
    }

    // Ponta de um ponteiro do chão no ângulo de relógio `deg`, a `len` do raio.
    handPoint(deg, len) {
        const a = Phaser.Math.DegToRad(deg);
        const { cx, cy, rx, ry } = this.arena;
        return { x: cx + Math.sin(a) * rx * len, y: cy - Math.cos(a) * ry * len };
    }

    hitByHand(player, deg, len, halfW) {
        // Distância dos pés da Artemis ao SEGMENTO eixo -> ponta.
        const { cx, cy } = this.arena;
        const tip = this.handPoint(deg, len);
        const vx = tip.x - cx;
        const vy = tip.y - cy;
        const t = Phaser.Math.Clamp(((player.sprite.x - cx) * vx + (player.feetY - cy) * vy) / (vx * vx + vy * vy || 1), 0, 1);
        if (Phaser.Math.Distance.Between(cx + vx * t, cy + vy * t, player.sprite.x, player.feetY) <= halfW) {
            this.scene.damagePlayer(CLOCK_DAMAGE);
        }
    }

    // Espiral no eixo + rajadas na ponta do minuto. `mult` é o mesmo dos
    // ponteiros: negativo ao rebobinar (a espiral inverte), maior ao acelerar
    // (a cadência sobe).
    clockBullets(now, c, mult, dt) {
        const { cx, cy } = this.arena;
        const pace = Math.max(1, Math.abs(mult));
        c.spin += SPIRAL_SPIN * Math.sign(mult) * pace * dt;
        if (now >= c.spiralAt) {
            c.spiralAt = now + SPIRAL_EVERY_MS / pace;
            const arms = SPIRAL_ARMS + (this.enraged ? 1 : 0);
            for (let k = 0; k < arms; k += 1) {
                this.fireBlade(cx, cy - 18, Phaser.Math.DegToRad(c.spin) + (k / arms) * Math.PI * 2, SPIRAL_SPEED);
            }
        }
        if (now >= c.tipAt) {
            c.tipAt = now + TIP_EVERY_MS / pace;
            const tip = this.handPoint(c.minute, MINUTE_LEN);
            const out = Phaser.Math.Angle.Between(cx, cy, tip.x, tip.y);
            const shots = this.enraged ? TIP_SHOTS + 2 : TIP_SHOTS;
            for (let k = 0; k < shots; k += 1) {
                const spread = (k - (shots - 1) / 2) * TIP_SPREAD_DEG;
                this.fireBlade(tip.x, tip.y, out + Phaser.Math.DegToRad(spread), TIP_SPEED);
            }
            Sfx.play(this.scene, "laser", 0.25);
        }
    }

    // Lâmina com velocidade própria (o spawnEnemyBullet da sala usa a padrão).
    fireBlade(x, y, angle, speed) {
        const blade = this.scene.spawnEnemyBullet?.(x, y, angle, "witch-blade", 1.4);
        if (!blade) {
            return;
        }
        blade.setRotation(angle);
        blade.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    // O mostrador acende (contorno pulsando) e os ponteiros: fracos no aviso,
    // cheios quando passam a ferir.
    drawFloorClock(now, live) {
        const g = this.floorClock;
        const { cx, cy, rx, ry } = this.arena;
        const pulse = 0.35 + 0.25 * Math.sin(now / 90);
        g.clear();
        g.lineStyle(3, this.clock.mode === "rewind" ? ECHO_TINT : 0x7dff9a, pulse).strokeEllipse(cx, cy, rx * 2, ry * 2);
        [[this.clock.minute, MINUTE_LEN, MINUTE_HALF_W], [this.clock.hour, HOUR_LEN, HOUR_HALF_W]].forEach(([deg, len, w]) => {
            const tip = this.handPoint(deg, len);
            if (!live) {
                g.lineStyle(2, 0xffffff, 0.3).lineBetween(cx, cy, tip.x, tip.y);
                return;
            }
            g.lineStyle(w * 2, ECHO_TINT, 0.35).lineBetween(cx, cy, tip.x, tip.y);
            g.lineStyle(w, 0xe8e0ff, 0.85).lineBetween(cx, cy, tip.x, tip.y);
            g.fillStyle(0xffffff, 0.9).fillCircle(tip.x, tip.y, w * 0.6);
        });
    }

    // Ponteiros do relógio da PAREDE, os mesmos ângulos dos do chão. O dos
    // segundos gira rápido enquanto o golpe dura (para trás, ao rebobinar).
    drawWallHands(now) {
        if (!this.wallHands) {
            return;
        }
        const { x, y, r } = this.wallClock;
        const g = this.wallHands;
        const hand = (deg, len, width, color) => {
            const a = Phaser.Math.DegToRad(deg);
            g.lineStyle(width, color, 1).lineBetween(x - Math.sin(a) * 6, y + Math.cos(a) * 6,
                x + Math.sin(a) * len, y - Math.cos(a) * len);
        };
        g.clear();
        hand(this.hands.hour, r - 22, 4, 0xc4ccdc);
        hand(this.hands.minute, r - 12, 3, 0xc4ccdc);
        const back = this.clock?.mode === "rewind" && this.clock.turned;
        const seconds = now ? ((now / 1000) * 720 * (back ? -1 : 1)) % 360 : 150;
        hand(seconds, r - 10, 1, 0xff4545);
        g.fillStyle(0x4ad6ff, 1).fillCircle(x, y, 3);
    }

    // PASSO NO TEMPO: some numa caveira de fumaça, o portal abre ATRÁS da
    // Artemis (do lado oposto ao dela) e, quando ele termina, ela sai ceifando.
    startStep() {
        const s = this.scene;
        const target = s.player.sprite;
        this.state = "step";
        this.sprite.body.setVelocity(0, 0);
        Sfx.play(s, "hack", 0.6);
        Effects.play(s, "fx-skull", this.x, this.y, { scale: 1.8, depth: 830 });
        this.sprite.setVisible(false);
        this.sprite.body.enable = false;

        const away = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const b = s.bounds;
        const tx = Phaser.Math.Clamp(target.x + Math.cos(away) * STEP_BEHIND, b.x + 40, b.x + b.w - 40);
        const ty = Phaser.Math.Clamp(target.y + Math.sin(away) * STEP_BEHIND * 0.8, b.y + 70, b.y + b.h - 20);
        Effects.play(s, "fx-portal", tx, ty + FEET * 0.5, { scale: 1.4, depth: -2 });

        s.time.delayedCall(Effects.durationMs("fx-portal"), () => {
            if (this.state !== "step") {
                return;
            }
            this.sprite.setVisible(true);
            this.sprite.body.enable = true;
            this.sprite.body.reset(tx, ty);
            Effects.play(s, "fx-arrive", tx, ty - 10, { scale: 1.3, depth: 830 });
            this.lastNearAt = s.time.now;
            this.windup("ceifada", QUICK_WINDUP_MS);
        });
    }

    // Depois de todo golpe: cansa e fica de guarda aberta (a janela do [F]).
    afterAttack() {
        this.attacks += 1;
        this.drain(TIRE_PER_ATTACK);
        if (this.state === "tired") {
            return;
        }
        this.state = "recover";
        this.recoverUntil = this.scene.time.now + RECOVER_MS;
        this.idle();
    }

    impactAt(x, y, aim) {
        Effects.play(this.scene, "fx-impact", x + Math.cos(aim) * 55, y + Math.sin(aim) * 35 + 20, {
            scale: 1.3, depth: 830, angle: Phaser.Math.RadToDeg(aim) + 90
        });
    }

    hitIfNear(x, y, dmg) {
        const target = this.scene.player.sprite;
        if (Phaser.Math.Distance.Between(x, y, target.x, target.y) <= MELEE_REACH) {
            this.scene.damagePlayer(dmg);
        }
    }

    // --- Rastro da Artemis e marcas no chão -------------------------------------

    recordTrail(now, player) {
        const last = this.trail[this.trail.length - 1];
        if (!last || now - last.t >= 50) {
            this.trail.push({ t: now, x: player.sprite.x, y: player.feetY });
        }
        while (this.trail.length && now - this.trail[0].t > TRAIL_MS) {
            this.trail.shift();
        }
    }

    // Onde os pés da Artemis estavam `ms` atrás (a amostra mais próxima).
    pastPos(ms) {
        const want = this.scene.time.now - ms;
        let best = this.trail[this.trail.length - 1] ?? { x: this.scene.player.sprite.x, y: this.scene.player.feetY };
        for (let i = this.trail.length - 1; i >= 0; i -= 1) {
            best = this.trail[i];
            if (this.trail[i].t <= want) {
                break;
            }
        }
        return { x: best.x, y: best.y };
    }

    // Onde ela vai estar em `ms`, se continuar no mesmo passo.
    predictPos(ms) {
        const body = this.scene.player.sprite.body;
        const b = this.scene.bounds;
        return {
            x: Phaser.Math.Clamp(this.scene.player.sprite.x + body.velocity.x * (ms / 1000), b.x + 20, b.x + b.w - 20),
            y: Phaser.Math.Clamp(this.scene.player.feetY + body.velocity.y * (ms / 1000), b.y + 20, b.y + b.h - 20)
        };
    }

    updateHazards(now, player) {
        if (!this.hazards.length) {
            return;
        }
        this.hazards = this.hazards.filter((h) => now <= h.until);
        this.hazards.forEach((h) => {
            if (now >= h.from && Phaser.Math.Distance.Between(player.sprite.x, player.feetY, h.x, h.y) <= h.r) {
                this.scene.damagePlayer(h.dmg);   // os i-frames da sala seguram o repique
            }
        });
    }

    // --- Fôlego -----------------------------------------------------------------

    // [F] da Artemis. Só conta na guarda aberta; fora dela, a foice apara.
    takeMeleeHit() {
        const s = this.scene;
        const now = s.time.now;
        if (["tired", "down", "battle", "step", "clock", "dash"].includes(this.state)) {
            return;                           // cansada: agora é com o [R]
        }
        if (this.state !== "recover") {
            Effects.play(s, "fx-spark", this.x, this.y - 10, { scale: 0.3, depth: 830 });
            Sfx.play(s, "bump", 0.5);
            return;
        }
        if (now < this.nextHitAt) {
            return;
        }
        this.nextHitAt = now + HIT_COOLDOWN_MS;
        this.sprite.setTintFill(0xffffff);
        s.time.delayedCall(80, () => this.applyTint());
        Sfx.play(s, "bump", 0.6);
        this.drain(TIRE_PER_HIT);
    }

    drain(amount) {
        this.stamina -= amount;
        this.updateHud();
        if (this.stamina <= 0) {
            this.becomeTired();
        } else if (!this.enraged && this.stamina <= RAGE_AT) {
            this.enrage();
        }
    }

    // Metade do fôlego: cada golpe ganha uma camada (eco duplo, sentença que
    // prevê, badalada de três anéis).
    enrage() {
        this.enraged = true;
        this.clockPending = true;
        Effects.play(this.scene, "fx-rage", this.x, this.y - 30, { scale: 1.1, depth: 830 });
        this.onEnraged?.();
    }

    becomeTired() {
        const s = this.scene;
        this.state = "tired";
        this.stamina = 0;
        this.tiredUntil = s.time.now + TIRED_MS;
        this.sprite.body.setVelocity(0, 0);
        this.idle();
        this.applyTint();
        this.dizzy = s.add.sprite(this.x, this.y - 92, "fx-dizzy").setDepth(830).setScale(0.9);
        this.dizzy.play("witch-dizzy");
        this.updateHud();
        this.onTired?.();
    }

    recoverFromTired() {
        this.clearDizzy();
        this.stamina = STAMINA_MAX;
        this.attacks = 0;
        this.specials = 0;
        this.enraged = false;
        this.state = "chase";
        this.lastNearAt = this.scene.time.now;
        this.applyTint();
        this.updateHud();
        this.onRecovered?.();
    }

    // --- Transições com a sala ---------------------------------------------------

    // Tudo que está no ar/no chão sai de cena (ecos, marcas, caveiras).
    clearField() {
        this.clearDizzy();
        this.echoes.forEach((g) => g.destroy());
        this.echoes = [];
        this.marks.forEach((m) => m.destroy());
        this.marks = [];
        this.hazards = [];
        this.waves.forEach((w) => w.sprite.destroy());
        this.waves = [];
        if (this.clock) {
            this.clock = null;
            this.floorClock.clear();
            this.drawWallHands(0);
        }
        this.hasteUntil = 0;
        this.dash = null;
        this.sprite.anims.timeScale = 1;
    }

    clearDizzy() {
        this.dizzy?.destroy();
        this.dizzy = null;
    }

    // O [R] abriu a fase 2: congela aqui enquanto a BattleScene roda.
    pauseForBattle() {
        this.clearField();
        this.state = "battle";
        this.sprite.body.setVelocity(0, 0);
        this.idle();
    }

    // A Artemis caiu na fase 1: volta tudo ao começo, com um respiro.
    reset() {
        this.clearField();
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setAlpha(1).setVisible(true);
        this.sprite.body.enable = true;
        this.sprite.body.reset(this.home.x, this.home.y);
        this.stamina = STAMINA_MAX;
        this.attacks = 0;
        this.specials = 0;
        this.enraged = false;
        this.state = "idle";
        this.facing = "s";
        this.idle();
        this.applyTint();
        this.updateHud();
        this.scene.time.delayedCall(RESPAWN_IDLE_MS, () => {
            if (this.state === "idle") {
                this.start();
            }
        });
    }

    // Vencida na fase 2.
    defeat() {
        this.clearField();
        this.state = "down";
        this.disabled = true;
        this.sprite.setVisible(true);
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.enable = false;
        this.facing = "s";
        this.idle();
        this.sprite.setTint(0x8a8a9a);
        this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y + 6, alpha: 0.8, duration: 500 });
        this.hudGroup.forEach((o) => o.destroy());
    }

    // --- Visual -------------------------------------------------------------------

    // `force` (telegrafo) encara exatamente; andando, vale a histerese.
    face(angle, force = false) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ax = Math.abs(cos);
        const ay = Math.abs(sin);
        const wasHorizontal = this.facing === "e" || this.facing === "w";
        const horizontal = force
            ? ax > ay
            : (wasHorizontal ? !(ay > ax * FACE_BIAS) : ax > ay * FACE_BIAS);
        this.facing = horizontal ? (cos > 0 ? "e" : "w") : (sin > 0 ? "s" : "n");
    }

    // Parada: primeiro quadro da caminhada na direção atual.
    idle() {
        this.sprite.anims.stop();
        this.sprite.setTexture("witch-walk", ROWS[this.facing] * WALK_COLS);
    }

    applyTint() {
        if (this.state === "tired") {
            this.sprite.setTint(TIRED_TINT);
        } else {
            this.sprite.clearTint();
        }
    }

    // Barra de FÔLEGO no lugar do título da sala. Sem fôlego, ela vira a
    // contagem da janela do [R] (âmbar, esvaziando).
    drawHud() {
        const s = this.scene;
        const name = s.add.text(HUD.x, 32, "WITCH", {
            fontFamily: "VCR", fontSize: "20px", color: "#ff4545"
        }).setOrigin(0.5).setDepth(900);
        this.hudLabel = s.add.text(HUD.x + HUD.w / 2 + 12, HUD.y + HUD.h / 2, "", {
            fontFamily: "VCR", fontSize: "14px", color: "#7a8099"
        }).setOrigin(0, 0.5).setDepth(900);
        this.hudBar = s.add.graphics().setDepth(900);
        this.hudGroup = [name, this.hudLabel, this.hudBar];
        this.updateHud();
    }

    updateHud() {
        const tired = this.state === "tired";
        const ratio = tired
            ? Math.max(0, this.tiredUntil - this.scene.time.now) / TIRED_MS
            : Math.max(0, this.stamina) / STAMINA_MAX;
        const color = tired ? 0xffb347 : this.enraged ? 0xff4545 : 0x7dff9a;
        const x = HUD.x - HUD.w / 2;
        this.hudBar.clear();
        this.hudBar.lineStyle(1, color, 0.7).strokeRect(x, HUD.y, HUD.w, HUD.h);
        this.hudBar.fillStyle(color, 0.9).fillRect(x + 1, HUD.y + 1, (HUD.w - 2) * ratio, HUD.h - 2);
        this.hudLabel
            .setText(tired ? "SEM FÔLEGO" : this.enraged ? "FÚRIA" : "FÔLEGO")
            .setColor(tired ? "#ffb347" : this.enraged ? "#ff4545" : "#7a8099");
    }

    // Meia-lua prateada das lâminas (aponta para +x; é girada na direção do voo).
    createBladeTexture() {
        const s = this.scene;
        if (s.textures.exists("witch-blade")) {
            return;
        }
        const g = s.add.graphics();
        const pts = [];
        for (let a = -100; a <= 100; a += 20) {
            const r = Phaser.Math.DegToRad(a);
            pts.push({ x: 11 + Math.cos(r) * 10, y: 12 + Math.sin(r) * 10 });
        }
        for (let a = 100; a >= -100; a -= 20) {
            const r = Phaser.Math.DegToRad(a);
            pts.push({ x: 6 + Math.cos(r) * 8, y: 12 + Math.sin(r) * 8 });
        }
        g.fillStyle(0xe8e8f0, 1).fillPoints(pts, true);
        g.lineStyle(1, ECHO_TINT, 1).strokePoints(pts, true);
        g.generateTexture("witch-blade", 24, 24);
        g.destroy();
    }

    // Meia-lua de energia da onda (aponta para +x, como a lâmina): o arco de
    // fora brilha em branco-violeta e se apaga para dentro.
    createWaveTexture() {
        const s = this.scene;
        if (s.textures.exists("witch-wave")) {
            return;
        }
        const W = 52;                // folga para o traço mais grosso não cortar nas pontas
        const H = WAVE_HALF_W * 2 + 8;
        const g = s.add.graphics();
        const arc = (r, width, color, alpha) => {
            g.lineStyle(width, color, alpha);
            g.beginPath();
            g.arc(W / 2 - r + 12, H / 2, r, -1.05, 1.05);
            g.strokePath();
        };
        arc(56, 16, ECHO_TINT, 0.35);
        arc(56, 9, 0xc9a8ff, 0.8);
        arc(56, 4, 0xffffff, 1);
        g.generateTexture("witch-wave", W, H);
        g.destroy();
    }

    destroy() {
        this.clearField();
        this.floorClock?.destroy();
        this.wallHands?.destroy();
        this.hudGroup?.forEach((o) => o.destroy());
        this.sprite?.destroy();
    }
}
