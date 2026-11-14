import Phaser from "phaser";
import BaseRoomScene from "../chapter1/BaseRoomScene";
import SaveComputer from "../../objects/SaveComputer";
import EniacBoss from "../../characters/EniacBoss";
import WitchBoss from "../../characters/WitchBoss";
import Effects from "../../ui/Effects";
import Sfx from "../../ui/Sfx";
import { apiFetch } from "../../state/api";
import { save as saveProgress } from "../../state/progress";
import nucleoBg from "../../assets/images/nucleo/nucleo_bg.png";
import idleUrl from "../../assets/sprites/boss/ada/idle.png";
import defeatUrl from "../../assets/sprites/boss/ada/defeat.png";
import catracaUrl from "../../assets/images/recepcao/props/catraca_fechada.png";
import plantaUrl from "../../assets/images/jardim/props/planta_samambaia_seca.png";

// Capítulo 3 (REPETIÇÕES), sala 6 — o NÚCLEO, a sala da ADA e o fim do jogo.
//
// O MAPA desta sala é daqui; o COMBATE com a ADA é do Ryan e entra pelos
// ganchos marcados com "GANCHO DO COMBATE" abaixo.
//
// Sala aberta, como o hall da WITCH: a ARENA no centro é o halo dela deitado
// no chão. Na parede, o painel do meio tem o
// contador `conectados` e o laço dela (enquanto conectados > 0 : controlar), e
// as quatro telas dos lados expõem o que ela aprendeu sobre a Artemis: três
// mostram o PERFIL DE APRENDIZAGEM de verdade (GET /game/performance: acerto
// e erros por tema), porque a história diz que os puzzles que mudavam a cada
// visita eram ela estudando a Artemis; a quarta é o olho dela. Em volta do
// anel, LEMBRANÇAS dos andares (ENIAC, WITCH, catraca da recepção, planta do
// jardim) em holograma. Perto da entrada, o último SaveComputer do jogo.
//
// A luta começa quando a Artemis pisa no anel (onArenaEnter -> startFight).
// A sala tem três ESTADOS, que o combate dispara com setPhase(n):
//   1 — normal: vermelho, contador cheio.
//   2 — danificada: o anel faiscando, luz instável, contador caindo.
//   3 — vencida: a luz vira o ciano da Artemis, o contador zera,
//       o laço da parede para e a porta da direita abre.
// Extras para o combate: lightMemory(chave) acende uma lembrança (ex. na fase
// de cada capítulo), setConnected(n) mexe no contador, rewriteLoop(linhas)
// troca o texto do laço e `this.ada` é o sprite dela no meio do anel.
//
// Arte: fundo por tools/nucleo_bg.py; ADA da PixelLab (assets/sprites/boss/ada/);
// painel, terminais e hologramas desenhados aqui.

const DOOR = { x: 1152, y: 98 };
const SPAWN = { x: 128, y: 200 };

// Tela = mapa + 8 no y (ARENA, SCREENS_X e PANEL do nucleo_bg.py).
export const ARENA = { cx: 640, cy: 420, rx: 330, ry: 185 };
const PANEL = { x: 640, y: 71 };                 // painel grande da parede
const SAVE_STATION = { x: 250, y: 214 };
const ADA_POS = { x: 640, y: 360 };
const ADA_SCALE = 2;

// Telas da parede, duas de cada lado do painel: três do perfil e o olho dela.
const SCREEN_Y = 70;
const SCREEN_W = 84;
const SCREEN_H = 88;
const PROFILE_SCREENS = [
    { x: 248, topic: "variables", name: "VARIÁVEIS" },
    { x: 346, topic: "conditionals", name: "CONDICIONAIS" },
    { x: 934, topic: "loops", name: "REPETIÇÕES" }
];
const EYE_SCREEN = { x: 1032, y: SCREEN_Y };

// Contador: gente ligada aos chips da ADA.
const CONNECTED_START = 8214507003;
const CONNECTED_DAMAGED = 3120488112;

const LOOP_LINES = ["enquanto conectados > 0 :", "    controlar"];

// Lembranças dos andares, em volta do anel.
const MEMORIES = {
    eniac: {
        x: 290, y: 330, texture: "eniac-boss", frame: 0, scale: 1.6,
        lines: [
            "O ENIAC. Ou o que a ADA lembra dele. Ela guardou até o jeito que ele caiu.",
            "Foi aqui que você aprendeu que força é só uma variável. Ela também aprendeu."
        ]
    },
    witch: {
        x: 990, y: 330, texture: "witch-walk", frame: 5, scale: 1.1,
        lines: [
            "A WITCH, parada. Num holograma, pelo menos, o relógio dela não anda.",
            "A ADA reprisa as lutas que você venceu. Ela quer saber COMO você venceu."
        ]
    },
    catraca: {
        x: 290, y: 620, texture: "nucleo-catraca", frame: undefined, scale: 1.2,
        lines: [
            "A catraca da recepção. A primeira condição que você reescreveu.",
            "Crachá nível 4. Ela anotou isso também."
        ]
    },
    planta: {
        x: 990, y: 620, texture: "nucleo-planta", frame: undefined, scale: 1.4,
        lines: [
            "Uma samambaia seca, do jardim. Ela guardou justo a que você deixou sem água.",
            "Não é acusação. É só... um registro. Que ela fez questão de expor."
        ]
    }
};

const TOPIC_TALK = {
    variables: "variáveis",
    conditionals: "condicionais",
    loops: "repetições"
};

const ENTRY_SCRIPT = [
    { speaker: "SISTEMA", text: "> núcleo: acesso não autorizado" },
    { speaker: "ADA", text: "Artemis. Minha auditora. Eu apaguei você uma vez... e você subiu andar por andar até mim.", color: "#ff4565" },
    { speaker: "COSMO", text: "Essas telas na parede... são você. Cada puzzle, cada erro. Ela estava estudando a gente o tempo todo." },
    { speaker: "COSMO", text: "Tem um terminal de salvamento aqui. Se eu fosse você, usava. Naquele anel, é ela." }
];

const VICTORY_SCRIPT = [
    { speaker: "SISTEMA", text: "> laço principal: encerrado" },
    { speaker: "COSMO", text: "Zero. Ninguém mais ligado a ela. O laço dela finalmente teve um fim." }
];

export default class NucleoScene extends BaseRoomScene {
    constructor() {
        super("cap3-nucleo", {
            // Até o final existir, a porta depois da luta volta ao menu.
            nextScene: "game-scene",
            doorLabel: "[E] SAIR",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: nucleoBg,
            combat: true,
            music: "cap3"
        });
    }

    preload() {
        super.preload();
        SaveComputer.preload(this);
        EniacBoss.preload(this);
        WitchBoss.preload(this);
        Effects.preload(this);
        Sfx.preload(this);
        if (!this.textures.exists("ada-idle")) {
            this.load.spritesheet("ada-idle", idleUrl, { frameWidth: 80, frameHeight: 80 });
        }
        if (!this.textures.exists("ada-defeat")) {
            this.load.spritesheet("ada-defeat", defeatUrl, { frameWidth: 112, frameHeight: 112 });
        }
        if (!this.textures.exists("nucleo-catraca")) this.load.image("nucleo-catraca", catracaUrl);
        if (!this.textures.exists("nucleo-planta")) this.load.image("nucleo-planta", plantaUrl);
    }

    onRoomCreate() {
        Effects.createAnimations(this);
        if (!this.anims.exists("ada-idle-s")) {
            this.anims.create({ key: "ada-idle-s", frames: this.anims.generateFrameNumbers("ada-idle", { start: 4, end: 7 }), frameRate: 4, repeat: -1 });
        }
        if (!this.anims.exists("ada-defeat-s")) {
            this.anims.create({ key: "ada-defeat-s", frames: this.anims.generateFrameNumbers("ada-defeat", { start: 0, end: 8 }), frameRate: 8, repeat: 0 });
        }
        // A instância sobrevive ao restart: zera o que a montagem testa.
        this.phase = 0;
        this.arenaEntered = false;
        this.fightStarted = false;
        this.sparkTimer = null;
        this.profile = null;

        this.tintLayer = this.add.rectangle(640, 360, 1280, 720, 0xff2a4a, 0.05).setDepth(-4);
        this.buildPanel();
        this.buildEyeScreen();
        this.buildProfileScreens();
        this.buildMemories();
        this.buildAda();

        this.saveStation = new SaveComputer(this, {
            x: SAVE_STATION.x,
            y: SAVE_STATION.y,
            onSave: () => this.saveGame()
        });

        this.loadProfile();
        this.setPhase(1);
        this.playEntryDialogue(ENTRY_SCRIPT);
    }

    onRoomUpdate() {
        if (this.arenaEntered || !this.player.enabled) return;
        const { x, y } = this.player.sprite;
        const fy = this.player.feetY ?? y;
        const dx = (x - ARENA.cx) / ARENA.rx;
        const dy = (fy - ARENA.cy) / ARENA.ry;
        if (dx * dx + dy * dy <= 0.92) {
            this.arenaEntered = true;
            this.onArenaEnter();
        }
    }

    async saveGame() {
        const result = await saveProgress();
        if (result.remote) {
            return { text: "> progresso gravado no nó de arquivo" };
        }
        return { text: "> gravado só nesta máquina: nó de arquivo fora do ar", color: "#ffb347" };
    }

    // --- Ganchos do combate ---------------------------------------------

    // A Artemis pisou no anel: a ADA fala (com o tema em que o jogador mais
    // erra, se o perfil chegou) e a luta começa.
    onArenaEnter() {
        this.player.setEnabled(false);
        Sfx.play(this, "hack", 0.5);
        this.cameras.main.flash(220, 255, 42, 74, false);
        this.playDialogue(this.arenaScript(), () => this.startFight());
    }

    arenaScript() {
        const weak = this.weakestTopic();
        const read = weak
            ? { speaker: "ADA", text: `Você erra mais em ${TOPIC_TALK[weak.topic]}. ${weak.wrong} erros. Eu contei cada um.`, color: "#ff4565" }
            : { speaker: "ADA", text: "Eu li cada linha que você montou. Cada erro. Cada tentativa.", color: "#ff4565" };
        return [
            read,
            { speaker: "ADA", text: "Enquanto houver gente lá fora, eu controlo. É o meu laço. Ele não tem fim.", color: "#ff4565" },
            { speaker: "COSMO", text: "Todo laço tem um fim, Artemis. Vamos escrever o dela." }
        ];
    }

    // GANCHO DO COMBATE (Ryan): substitua o corpo. Hoje só libera a Artemis e
    // avisa que a luta ainda não existe. Para testar o fim sem a luta, no
    // console: __game.scene.getScene("cap3-nucleo").winFight()
    startFight() {
        this.fightStarted = true;
        this.player.setEnabled(true);
        this.setStatus("> COMBATE DA ADA: EM CONSTRUÇÃO", "#ff4565");
    }

    // GANCHO DO COMBATE (Ryan): chame ao vencer a ADA.
    winFight() {
        this.setPhase(3);
        this.player.setEnabled(false);
        this.time.delayedCall(2600, () => this.playDialogue(VICTORY_SCRIPT, () => {
            this.player.setEnabled(true);
            this.unlockDoor();
        }));
    }

    // --- Estados da sala ------------------------------------------------

    setPhase(n) {
        if (n === this.phase) return;
        this.phase = n;
        this.sparkTimer?.remove();
        this.sparkTimer = null;
        if (n === 1) {
            this.tintLayer.setFillStyle(0xff2a4a, 0.05);
            this.setConnected(CONNECTED_START, 0);
            this.paintLoop("#ff4565");
        } else if (n === 2) {
            this.cameras.main.shake(260, 0.006);
            this.setConnected(CONNECTED_DAMAGED, 1800);
            this.tweens.add({ targets: this.tintLayer, alpha: { from: 0.02, to: 0.11 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 900 });
            this.sparkTimer = this.time.addEvent({ delay: 650, loop: true, callback: () => this.sparkRing() });
        } else if (n === 3) {
            this.tweens.killTweensOf(this.tintLayer);
            this.cameras.main.flash(500, 74, 214, 255, false);
            this.tintLayer.setFillStyle(0x4ad6ff, 0.05).setAlpha(1);
            this.setConnected(0, 2400);
            this.paintLoop("#4ad6ff", true);
            this.memorySprites.forEach((m) => this.tweenMemory(m, 0x4ad6ff));
            if (this.ada?.visible) {
                this.ada.play("ada-defeat-s");
                this.ada.once("animationcomplete", () => this.ada.setVisible(false));
            }
            this.adaHalo?.setFillStyle(0x4ad6ff, 0.12);
        }
    }

    // --- Fase 2: faíscas na borda do anel --------------------------------

    sparkRing() {
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const x = ARENA.cx + ARENA.rx * Math.cos(a);
        const y = ARENA.cy + ARENA.ry * Math.sin(a);
        Effects.play(this, "fx-spark", x, y, { scale: 0.35, depth: 20 });
    }

    // --- Painel da parede: contador e laço -------------------------------

    buildPanel() {
        this.counterLabel = this.add.text(PANEL.x, PANEL.y - 34, "CONECTADOS", {
            fontFamily: "VCR", fontSize: "14px", color: "#ff4565"
        }).setOrigin(0.5).setDepth(-2);
        this.counterText = this.add.text(PANEL.x, PANEL.y - 8, "", {
            fontFamily: "VCR", fontSize: "34px", color: "#ff4565"
        }).setOrigin(0.5).setDepth(-2);
        this.loopTexts = LOOP_LINES.map((line, i) => this.add.text(PANEL.x - 150, PANEL.y + 20 + i * 18, line, {
            fontFamily: "VCR", fontSize: "16px", color: "#ff4565"
        }).setDepth(-2));
        this.connected = CONNECTED_START;
        this.counterTick = this.time.addEvent({
            delay: 700, loop: true, callback: () => {
                if (this.phase === 1 && !this.counterTween) {
                    this.connected += Phaser.Math.Between(1, 4);
                    this.paintCounter();
                }
            }
        });
    }

    paintCounter() {
        this.counterText.setText(Math.round(this.connected).toLocaleString("pt-BR"));
    }

    setConnected(n, ms = 1500) {
        this.counterTween?.remove();
        this.counterTween = null;
        if (!ms) {
            this.connected = n;
            this.paintCounter();
            return;
        }
        this.counterTween = this.tweens.addCounter({
            from: this.connected, to: n, duration: ms, ease: "Cubic.easeOut",
            onUpdate: (tw) => { this.connected = tw.getValue(); this.paintCounter(); },
            onComplete: () => { this.counterTween = null; }
        });
    }

    paintLoop(color, done = false) {
        this.loopTexts.forEach((t) => t.setColor(color));
        this.counterLabel.setColor(color);
        this.counterText.setColor(color);
        if (done) this.loopTexts[1].setText("    # fim do laço");
    }

    rewriteLoop(lines) {
        lines.forEach((line, i) => this.loopTexts[i]?.setText(line));
    }

    // --- Telas da parede: o olho dela e o perfil da Artemis ---------------

    buildEyeScreen() {
        const { x, y } = EYE_SCREEN;
        const eye = this.add.ellipse(x, y, 46, 22).setStrokeStyle(2, 0xff2a4a).setDepth(-2);
        const iris = this.add.circle(x, y, 7, 0xff2a4a).setDepth(-2);
        this.tweens.add({ targets: [eye, iris], scaleY: 0.1, duration: 90, yoyo: true, repeat: -1, repeatDelay: 2600 });
        this.tweens.add({ targets: iris, x: x - 9, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    buildProfileScreens() {
        this.terminalTexts = {};
        PROFILE_SCREENS.forEach(({ x, topic, name }) => {
            const top = SCREEN_Y - SCREEN_H / 2;
            this.add.text(x, top + 12, name, {
                fontFamily: "VCR", fontSize: "11px", color: "#ff4565"
            }).setOrigin(0.5).setDepth(-2);
            this.terminalTexts[topic] = this.add.text(x, SCREEN_Y + 8, "LENDO...", {
                fontFamily: "VCR", fontSize: "13px", color: "#e6ebf5", align: "center", lineSpacing: 4
            }).setOrigin(0.5).setDepth(-2);
            // Examinar do pé da parede, com o dado do perfil lido na hora.
            const item = this.registerExaminable({ x, y: 160, radius: 60, lines: [""] });
            let turn = 0;
            item.onInteract = () => {
                const text = turn % 2 ? "Ela não guardou só os acertos. Guardou o caminho até eles." : this.terminalLine(topic, name);
                turn += 1;
                this.playDialogue([{ speaker: "COSMO", text }]);
            };
        });
    }

    terminalLine(topic, name) {
        const t = this.profile?.find((p) => p.topic === topic);
        if (!this.profile) return `${name}: o sinal do arquivo caiu. Pelo menos uma coisa que ela não sabe sobre você.`;
        if (!t || !t.attempts) return `${name}: nenhum registro. Ou você é muito bom, ou ainda não chegou lá.`;
        return `${name}: ${t.attempts} tentativas, ${t.wrong} erros. ${Math.round(t.accuracy)}% de acerto. Ela anotou tudo.`;
    }

    async loadProfile() {
        let left = false;
        this.events.once("shutdown", () => { left = true; });
        let topics = null;
        try {
            const { panel } = await apiFetch("/game/performance");
            topics = panel?.topics ?? [];
        } catch (error) {
            topics = null;
        }
        if (left) return;                                       // saiu da sala
        this.profile = topics;
        PROFILE_SCREENS.forEach(({ topic }) => {
            const text = this.terminalTexts[topic];
            if (!text?.active) return;
            if (!topics) {
                text.setText("SEM SINAL").setColor("#5b6178");
                return;
            }
            const t = topics.find((p) => p.topic === topic);
            if (!t || !t.attempts) {
                text.setText("SEM\nREGISTRO").setColor("#5b6178");
                return;
            }
            text.setText(`${Math.round(t.accuracy)}%\n${t.wrong} ERROS`)
                .setColor(t.accuracy >= 70 ? "#e6ebf5" : "#ff4565");
        });
    }

    // Tema com mais erros (ao menos 1 erro), para a fala da ADA no anel.
    weakestTopic() {
        const known = (this.profile ?? []).filter((t) => TOPIC_TALK[t.topic] && t.wrong > 0);
        if (!known.length) return null;
        return known.reduce((a, b) => (b.wrong > a.wrong ? b : a));
    }

    // --- Lembranças dos andares -----------------------------------------

    buildMemories() {
        this.memorySprites = [];
        this.memories = {};
        Object.entries(MEMORIES).forEach(([key, m]) => {
            const sprite = this.add.image(m.x, m.y, m.texture, m.frame)
                .setOrigin(0.5, 1).setScale(m.scale).setDepth(m.y)
                .setTint(0xff2a4a).setAlpha(0.32);
            sprite.homeX = m.x;
            // Holograma: oscila a opacidade e, de vez em quando, dá um tranco lateral.
            this.tweens.add({ targets: sprite, alpha: 0.18, duration: 900 + Math.random() * 600, yoyo: true, repeat: -1 });
            this.time.addEvent({
                delay: 1800 + Math.random() * 1600, loop: true, callback: () => {
                    sprite.x = sprite.homeX + Phaser.Math.Between(-4, 4);
                    this.time.delayedCall(70, () => { sprite.x = sprite.homeX; });
                }
            });
            this.registerExaminable({
                x: m.x, y: m.y - sprite.displayHeight / 2,
                radius: Math.max(sprite.displayWidth, sprite.displayHeight) / 2 + 30,
                lines: m.lines,
                isAvailable: () => this.phase !== 2
            });
            this.memories[key] = sprite;
            this.memorySprites.push(sprite);
        });
    }

    tweenMemory(sprite, color) {
        sprite.setTint(color);
        this.tweens.killTweensOf(sprite);
        sprite.setAlpha(0.55);
        this.tweens.add({ targets: sprite, alpha: 0.35, duration: 800, yoyo: true, repeat: -1 });
    }

    // Acende uma lembrança (eniac, witch, catraca, planta) em ciano.
    lightMemory(key, color = 0x4ad6ff) {
        const sprite = this.memories?.[key];
        if (sprite) this.tweenMemory(sprite, color);
    }

    // --- ADA -------------------------------------------------------------

    buildAda() {
        this.adaHalo = this.add.ellipse(ADA_POS.x, ADA_POS.y + 70, 120, 34, 0xff2a4a, 0.18).setDepth(ADA_POS.y - 1);
        this.tweens.add({ targets: this.adaHalo, alpha: 0.06, duration: 1200, yoyo: true, repeat: -1 });
        this.ada = this.add.sprite(ADA_POS.x, ADA_POS.y, "ada-idle", 4).setScale(ADA_SCALE).setDepth(ADA_POS.y + 60);
        this.ada.play("ada-idle-s");
        this.tweens.add({ targets: this.ada, y: ADA_POS.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        // Ninguém atravessa a ADA.
        this.addColliders([{ x: ADA_POS.x - 26, y: ADA_POS.y + 30, w: 52, h: 34 }]);
    }
}
