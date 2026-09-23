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
//   badalada  — a cada TOLL_EVERY golpes. Anéis de lâminas saem dela com UMA
//               brecha cada, e a brecha gira 90° de um anel para o outro: é
//               preciso correr em volta dela de brecha em brecha.
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

const STEP_FAR = 300;                // longe assim...
const STEP_AFTER_MS = 2400;          // ...por esse tempo, ela vem pelo portal
const STEP_BEHIND = 110;

const TIRED_TINT = 0x9a9aaa;
const HUD = { x: 640, y: 52, w: 320, h: 12 };
const FROZEN = new Set(["idle", "windup", "attack", "step", "battle", "down"]);

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

    constructor(scene, x, y) {
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

        WitchBoss.createAnimations(scene);
        this.createBladeTexture();

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
        if (this.attacks % TOLL_EVERY === TOLL_EVERY - 1) {
            this.windup("badalada");
            return;
        }
        if (dist <= MELEE_TRIGGER) {
            this.windup("ceifada");
            return;
        }
        if (dist >= SENTENCE_MIN && now >= this.nextSentence) {
            this.nextSentence = now + SENTENCE_COOLDOWN_MS;
            this.windup("sentenca");
            return;
        }
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        this.sprite.body.setVelocity(Math.cos(angle) * SPEED, Math.sin(angle) * SPEED);
        this.face(angle);
        this.sprite.play(`witch-walk-${this.facing}`, true);
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
        this.state = "attack";
        this.sprite.play(`witch-attack-${this.facing}`);
        s.time.delayedCall(HIT_MS, () => {
            if (!current()) {
                return;
            }
            if (kind === "sentenca") {
                this.sentence();
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
        if (["tired", "down", "battle", "step"].includes(this.state)) {
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

    destroy() {
        this.clearField();
        this.hudGroup?.forEach((o) => o.destroy());
        this.sprite?.destroy();
    }
}
