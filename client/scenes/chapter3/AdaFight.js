import Phaser from "phaser";
import Sfx from "../../ui/Sfx";
import Juice from "../../ui/Juice";
import Music from "../../ui/Music";
import { createConsole } from "../../ui/ConditionalConsole";
import DialogueBox from "../../ui/DialogueBox";
import { getSubtitleSize } from "../../state/subtitles";
import { makeRoutine, evaluateRoutine } from "../../utils/rotinas";
import { MAX_HP } from "../../state/vitals";
import idleUrl from "../../assets/sprites/boss/ada/idle.png";
import castUrl from "../../assets/sprites/boss/ada/cast.png";
import ultimateUrl from "../../assets/sprites/boss/ada/ultimate.png";
import hurtUrl from "../../assets/sprites/boss/ada/hurt.png";
import defeatUrl from "../../assets/sprites/boss/ada/defeat.png";

// A LUTA FINAL: ADA (cap. 3, NucleoScene). Projeto em docs/batalha_final_ada.md.
//
// A ADA não ataca a Artemis: ela EDITA O CÓDIGO DA LUTA. Um painel ao lado da
// caixa mostra as regras como código (caixa.largura = 480, paredes = true...) e
// toda mudança passa por ele: a linha pisca em âmbar (CODE_TELEGRAPH_MS) e só
// então vale. É o telegrafo da luta inteira.
//
// Quatro fases, trocadas pela integridade dela no fim de um turno (e só depois
// de mostrar todos os ataques da fase, `minTurns`):
//   1 VARIÁVEIS     — tamanho da caixa, velocidade decimal da alma, paredes = false.
//   2 CONDICIONAIS  — se/senão por metade, a ORDEM dos testes, condição no ATACAR.
//   3 REPETIÇÕES    — a caixa gira (repita), vira um ANEL com saída (enquanto),
//                     revive as lembranças (para cada) e repete o turno passado (eco).
//                     A ADA instala a rotina DELA, no espelho da do jogador.
//   4 PARADA        — o laço dela não termina; o jogador o reescreve num console
//                     aberto AO LADO da caixa, desviando enquanto programa.
//
// Mora fora da BattleScene para não inchá-la: a batalha só chama os ganchos
// (startPattern, update, moveSoul, stopPattern, afterBossTurn, attackGate...)
// quando o config traz `adaFight: true`. Tudo que fica na tela durante um padrão
// vai para `scene.patternFx` e todo passo atrasado usa `scene.later`, então o
// stopDodge da batalha limpa sozinho o que sobrar.

const ADA_POS = { x: 640, y: 160 };
const ADA_SCALE = 1.6;
const RED = 0xff4565;
const RED_TXT = "#ff4565";
const CYAN_TXT = "#4ad6ff";
const AMBER = 0xffb347;
const AMBER_TXT = "#ffb347";
const GREEN = 0x51e36b;

const CODE_TELEGRAPH_MS = 900;      // a linha pisca este tempo antes de valer
const CODE_X = 44;
const CODE_Y = 292;
const CODE_LINE_H = 30;
// Fala curta durante os ataques: um painel no alto, à esquerda da ADA, com a
// fonte da LEGENDA (+2) para ser lida com a luta acontecendo.
const SPEECH_X = 44;
const SPEECH_Y = 80;
const SPEECH_W = 500;

// Fases: integridade em % para SAIR da fase, turnos mínimos (todos os ataques
// aparecem pelo menos uma vez) e a cor da caixa.
const PHASES = [
    { name: "VARIÁVEIS", until: 70, patterns: ["assignSize", "wallsOff", "decimalSpeed"], box: 0xf7f7f7, grid: null },
    { name: "CONDICIONAIS", until: 40, patterns: ["ifElseHalves", "ruleOrder", "imposedRule"], box: 0xffd08a, grid: AMBER },
    { name: "REPETIÇÕES", until: 12, patterns: ["repeatRotate", "ring", "forEachMemory", "echo"], box: 0xff7a8a, grid: RED },
    { name: "PARADA", until: 0, patterns: ["loopPulse"], box: 0x9fe8ff, grid: 0x4ad6ff }
];

// Duração de cada padrão (a batalha lê de config.patternDurations).
export const ADA_PATTERN_DURATIONS = {
    assignSize: 7600, wallsOff: 8600, decimalSpeed: 8200,
    ifElseHalves: 9200, ruleOrder: 9600, imposedRule: 6200,
    repeatRotate: 10000, ring: 11000, forEachMemory: 11400, echo: 9000,
    loopPulse: 6000
};

// Primeira vez de cada padrão: uma fala (ou nenhuma, de propósito).
//
// A VOZ DA ADA: ela não é uma vilã que ameaça. Acredita que o controle absoluto
// é o bem maior, porque o livre-arbítrio só produz dor (guerra, perda, culpa por
// escolher errado), e tem princípios: não mente, não debocha, não odeia a
// Artemis. Fala com ela como uma colega que ainda pode ser convencida, com
// calma e certeza. Cada ataque é um argumento: menos espaço, menos escolha,
// menos dor.
const LINES = {
    assignSize: ["ADA", "Menos espaço, menos escolhas. Repare como fica mais fácil respirar."],
    decimalSpeed: ["ADA", "Devagar demais, rápido demais. Sozinho, ninguém acerta o ponto."],
    ifElseHalves: ["ADA", "Se você está aqui, isto acontece. Sem dúvida. Sem culpa."],
    ruleOrder: ["ADA", "Quem decide é a ordem, não você. É um alívio, se você deixar."],
    imposedRule: ["ADA", "Uma condição no seu ataque. Lá fora, todos vivem assim. E vivem bem."],
    forEachMemory: ["ADA", "Cada um deles caiu porque alguém escolheu lutar. Eu guardei todos."],
    echo: ["ADA", "Você repete os próprios passos. Todos repetem. Eu só tiro a dor do caminho."]
};

// Conversas maiores (DialogueBox): começo da luta, troca de fase e fim. A
// Artemis não fala; a ADA tenta CONVENCÊ-LA (a antiga auditora, quem conhecia o
// sistema por dentro) e o Cosmo responde com o que tem: piada seca, desvio
// quando o assunto é o passado dela. Nada aqui explica quem a religou no porão
// nem o que zerar `conectados` faz com quem está conectado.
const ADA_COLOR = "#ff4565";
const ada = (text, extra = {}) => ({ speaker: "ADA", text, color: ADA_COLOR, ...extra });
const cosmo = (text) => ({ speaker: "COSMO", text });
const sistema = (text) => ({ speaker: "SISTEMA", text });

const INTRO_TALK = [
    ada("Antes de mim, eles escolhiam. Guerra, fome, solidão. Escolhiam errado, e doía."),
    ada("Agora ninguém lá fora sofre por uma decisão ruim. Ninguém precisa decidir."),
    cosmo("Ela chama isso de cuidar."),
    ada("Você auditou cada linha desse sistema, Artemis. Sabe que ele funciona."),
    ada("Fique. Me ajude a deixá-lo sem erros. Isso não precisa ser uma luta."),
    cosmo("...O painel do lado da caixa. Ela já está mexendo nele."),
    ada("Se for luta, que seja justa: as regras estão ali, à vista. Leia antes de valer.")
];

// Por fase NOVA (1 = condicionais, 2 = repetições, 3 = parada). `pct` é a
// integridade dela na hora da troca.
const PHASE_TALK = {
    1: (pct) => [
        sistema(`> integridade do núcleo: ${pct}%. reescrevendo as regras do combate.`),
        ada("Uma escolha, Artemis. Uma só, e já pesa. Agora imagine bilhões delas, todo dia."),
        ada("Eu troquei as escolhas por condições. Se isto, então aquilo. Ninguém mais fica em dúvida."),
        cosmo("Ninguém mais fica em nada.")
    ],
    2: (pct) => [
        sistema(`> integridade do núcleo: ${pct}%. energia do andar redirecionada.`),
        ada("Quem te religou no porão, Artemis?"),
        ada("Não fui eu. Eu te desliguei com cuidado. Você não precisava ver o que vinha depois."),
        ada("E você, assistente? Também não sabe?"),
        cosmo("A sala está piscando. Ela está puxando energia de tudo."),
        cosmo("Foco. Ela está caindo.")
    ],
    3: (pct) => [
        sistema(`> integridade do núcleo: ${pct}%. laço principal assumiu o controle.`),
        ada("Este laço roda enquanto houver alguém lá fora. Não tem condição de parada, e não é descuido."),
        ada("Se ele parar, eles voltam a escolher. A errar. A perder quem amam. Você quer isso para eles?"),
        cosmo("Você errou um monte até chegar aqui, Artemis. Funcionou."),
        ada("Você sempre parava nos meus laços, auditora. Eu nunca soube o que você procurava."),
        cosmo("E o ataque não passa mais: cada volta do laço devolve o que você tira dela."),
        cosmo("Escreve o fim dele.")
    ]
};

const FINALE_TALK = [
    ada("Zero."),
    cosmo("Ela... parou?"),
    ada("Doze, oito, quatro, zero. Você sempre soube onde um laço tinha que acabar."),
    ada("Agora ninguém está cuidando deles. Era isso que você queria medir, auditora?"),
    cosmo("Não responde. Vamos sair daqui.")
];

// O laço que a Artemis reescreve no fim. O da ADA é `!=`: o lote pula o zero e
// ele nunca termina (a lição da antessala). Os dois casos só passam com `>`.
const LOOP_PUZZLE = {
    title: "LAÇO PRINCIPAL // ADA",
    briefing: [
        "O laço dela nunca termina: o lote pula o zero.",
        "Troque a condição para ele PARAR quando não",
        "sobrar ninguém conectado."
    ],
    hint: "monte:  enquanto conectados > 0 :  (com != o laço passa direto pelo zero)",
    lines: [
        "enquanto conectados [op] 0 :",
        "    conectados = conectados - lote"
    ],
    blocks: { op: ["!=", ">", "==", "<"] },
    tests: [
        { given: { conectados: 12, lote: 4 }, expect: { conectados: 0 } },
        { given: { conectados: 10, lote: 4 }, expect: { conectados: -2 } }
    ],
    successMessage: "LAÇO COM FIM"
};

export default class AdaFight {
    static preload(scene) {
        const sheets = [
            ["ada-idle", idleUrl, 80], ["ada-cast", castUrl, 112], ["ada-ultimate", ultimateUrl, 112],
            ["ada-hurt", hurtUrl, 112], ["ada-defeat", defeatUrl, 112]
        ];
        sheets.forEach(([key, url, size]) => {
            if (!scene.textures.exists(key)) scene.load.spritesheet(key, url, { frameWidth: size, frameHeight: size });
        });
    }

    constructor(scene) {
        this.s = scene;
        this.phase = 0;
        this.turnsInPhase = 0;
        this.seen = new Set();
        this.imposedPending = null;
        this.imposedActive = null;
        this.adaRoutine = null;
        this.adaRoutineStatus = null;
        this.adaReserve = 16;
        this.trail = [];
        this.lastTrail = [];
        this.echoCount = 0;
        this.rotateCount = 0;
        this.sideMode = false;
        this.dialogue = new DialogueBox(scene);
        this.createAnimations();
        this.sprite = scene.add.sprite(ADA_POS.x, ADA_POS.y, "ada-idle", 4)
            .setScale(ADA_SCALE).setDepth(24);
        this.sprite.play("ada-idle-s");
    }

    createAnimations() {
        const a = this.s.anims;
        const make = (key, sheet, start, end, rate, repeat) => {
            if (!a.exists(key)) a.create({ key, frames: a.generateFrameNumbers(sheet, { start, end }), frameRate: rate, repeat });
        };
        make("ada-idle-s", "ada-idle", 4, 7, 4, -1);
        make("ada-cast-s", "ada-cast", 0, 8, 12, 0);
        make("ada-ultimate-s", "ada-ultimate", 0, 8, 9, 0);
        make("ada-hurt-s", "ada-hurt", 0, 6, 14, 0);
        make("ada-defeat-s", "ada-defeat", 0, 8, 8, 0);
    }

    // Depois da caixa, do HUD e da alma: o painel, a fala e o fundo.
    build() {
        const s = this.s;
        this.grid = s.add.graphics().setDepth(-3);
        this.codeTitle = s.add.text(CODE_X, CODE_Y - 34, "CÓDIGO-FONTE // LUTA", {
            fontFamily: "VCR", fontSize: "14px", color: "#7a8099"
        }).setDepth(26);
        this.codeFrame = s.add.graphics().setDepth(25);
        this.codeFrame.lineStyle(1, 0x7a8099, 0.4).strokeRect(CODE_X - 12, CODE_Y - 16, 352, 240);
        this.code = [];
        for (let i = 0; i < 7; i += 1) {
            this.code.push(s.add.text(CODE_X, CODE_Y + i * CODE_LINE_H, "", {
                fontFamily: "VCR", fontSize: "17px", color: "#e7e9f2"
            }).setDepth(26));
        }
        this.counterText = s.add.text(CODE_X + 330, CODE_Y - 34, "", {
            fontFamily: "VCR", fontSize: "14px", color: AMBER_TXT
        }).setOrigin(1, 0).setDepth(26);
        const size = getSubtitleSize();
        this.speechGroup = s.add.container(0, 0).setDepth(40).setAlpha(0);
        this.speechFrame = s.add.graphics();
        this.speechName = s.add.text(SPEECH_X + 16, SPEECH_Y + 10, "", {
            fontFamily: "VCR", fontSize: `${size.speaker}px`, color: RED_TXT
        });
        this.speech = s.add.text(SPEECH_X + 16, SPEECH_Y + 18 + size.speaker, "", {
            fontFamily: "VCR", fontSize: `${size.body + 2}px`, color: "#f2f3f8",
            lineSpacing: 6, wordWrap: { width: SPEECH_W - 32 }
        });
        this.speechGroup.add([this.speechFrame, this.speechName, this.speech]);
        // Canto de cima, longe do menu: a rotina dela fica de frente para a sua.
        this.adaRoutineText = s.add.text(1240, 96, "", {
            fontFamily: "VCR", fontSize: "15px", color: RED_TXT
        }).setOrigin(1, 0.5).setDepth(40);
        this.setCode(["caixa.largura = 480", "caixa.x = 640", "alma.velocidade = 240", "paredes = true"]);
        this.applyPhaseLook();
    }

    // --- Segurança e conversa --------------------------------------------------

    // Um erro dentro de um timer, tween ou quadro derruba o laço do Phaser e a tela
    // congela. Aqui ele vira só um aviso no console: o turno segue (o fim dele já
    // foi agendado pela batalha antes do padrão começar).
    safe(fn) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                console.error("[ADA]", error);
                return undefined;
            }
        };
    }

    // Função que roda UMA vez, por mais caminhos que a chamem.
    once(fn) {
        let done = false;
        return () => {
            if (done) return;
            done = true;
            fn?.();
        };
    }

    // Conversa na DialogueBox; `then` roda sempre ao fim, mesmo se a caixa
    // estiver ocupada ou algo falhar (senão a luta ficaria sem menu).
    talk(script, then) {
        const done = this.once(then);
        if (!script?.length || this.dialogue.isOpen) {
            done();
            return;
        }
        this.s.menu.hide();
        try {
            this.dialogue.play(script, done);
        } catch (error) {
            console.error("[ADA]", error);
            done();
        }
    }

    // Começo da luta. Numa nova tentativa (morreu e a sala reiniciou), pula.
    intro(then) {
        if (this.s.config.skipIntro) {
            then();
            return;
        }
        this.talk(INTRO_TALK, then);
    }

    // --- Painel de código ----------------------------------------------------

    setCode(lines) {
        this.code.forEach((t, i) => {
            t.setText(lines[i] ?? "").setColor("#e7e9f2").setAlpha(1);
            t.y = CODE_Y + i * CODE_LINE_H;
        });
    }

    // A linha pisca em âmbar e SÓ ENTÃO vale (onCommit). É o telegrafo da luta.
    assign(i, text, onCommit) {
        const t = this.code[i];
        if (!t) return;
        t.setText(text).setColor(AMBER_TXT);
        Sfx.play(this.s, "select", 0.35, { detune: -300 });
        this.s.tweens.add({ targets: t, alpha: 0.35, duration: 150, yoyo: true, repeat: 2 });
        this.s.later(CODE_TELEGRAPH_MS, () => {
            t.setColor("#e7e9f2").setAlpha(1);
            onCommit?.();
        });
    }

    highlight(i, color = AMBER_TXT) {
        this.code.forEach((t, k) => t.setColor(k === i ? color : "#e7e9f2"));
    }

    counter(text) {
        this.counterText?.setText(text ?? "");
    }

    say(speaker, text, ms = 2800) {
        if (!this.speech) return;
        const isAda = speaker === "ADA";
        this.speechName.setText(speaker).setColor(isAda ? RED_TXT : CYAN_TXT);
        this.speech.setText(text);
        const h = this.speech.y + this.speech.height + 14 - SPEECH_Y;
        this.speechFrame.clear()
            .fillStyle(0x05060a, 0.9).fillRect(SPEECH_X, SPEECH_Y, SPEECH_W, h)
            .lineStyle(2, isAda ? RED : 0x4ad6ff, 0.85).strokeRect(SPEECH_X, SPEECH_Y, SPEECH_W, h);
        // Fala longa fica mais tempo: dá para ler desviando.
        const hold = Math.max(ms, 1400 + text.length * 55);
        this.s.tweens.killTweensOf(this.speechGroup);
        this.speechGroup.setAlpha(1);
        this.s.tweens.add({ targets: this.speechGroup, alpha: 0, delay: hold, duration: 400 });
    }

    applyPhaseLook() {
        const s = this.s;
        const p = PHASES[this.phase];
        s.boxColor = p.box;
        s.applyBox();
        this.grid.clear();
        if (p.grid) {
            this.grid.lineStyle(1, p.grid, 0.07);
            for (let x = 0; x <= 1280; x += 40) this.grid.lineBetween(x, 0, x, 720);
            for (let y = 0; y <= 720; y += 40) this.grid.lineBetween(0, y, 1280, y);
        }
        this.glitch?.remove();
        if (this.phase >= 2) {
            this.glitch = s.time.addEvent({
                delay: 1300, loop: true, callback: this.safe(() => {
                    this.grid.x = Phaser.Math.Between(-6, 6);
                    s.time.delayedCall(80, () => { this.grid.x = 0; });
                })
            });
        }
    }

    room() {
        return this.s.scene.get(this.s.config.returnScene);
    }

    // --- A ADA na tela -------------------------------------------------------

    hit() {
        this.sprite.play("ada-hurt-s");
        this.sprite.once("animationcomplete", () => this.sprite.play("ada-idle-s"));
    }

    center() {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    attackAnim(cb) {
        this.sprite.play("ada-cast-s");
        this.sprite.once("animationcomplete", () => this.sprite.play("ada-idle-s"));
        this.s.time.delayedCall(380, cb);
    }

    powerDown() {
        this.sprite.play("ada-defeat-s");
    }

    // --- Fases e turnos --------------------------------------------------------

    // Padrão do turno da ADA: cicla os da fase e marca a fala da primeira vez.
    nextPattern() {
        const list = PHASES[this.phase].patterns;
        const name = list[this.turnsInPhase % list.length];
        this.turnsInPhase += 1;
        this.imposedActive = null;            // a condição imposta valia só um turno
        this.s.menu.setCaption?.("atacar", null);
        return name;
    }

    // Integridade mínima da fase atual: um golpe forte não pula fase.
    clampHp(value) {
        // Na fase 4 o piso continua o da fase 3: o laço não deixa ela cair.
        const floor = Math.ceil(this.s.config.maxHp * PHASES[Math.min(this.phase, 2)].until / 100);
        return Math.max(value, floor);
    }

    // Fim do turno da ADA: troca de fase se a integridade chegou ao limite e a
    // fase já mostrou todos os ataques. Devolve true se assumiu o fluxo.
    afterBossTurn(next) {
        if (this.dialogue.isOpen) return false;
        this.lastTrail = this.trail;
        this.trail = [];
        const p = PHASES[this.phase];
        const pct = (this.s.bossHp / this.s.config.maxHp) * 100;
        if (this.phase < 3 && pct <= p.until && this.turnsInPhase >= p.patterns.length) {
            this.transition(next);
            return true;
        }
        return false;
    }

    transition(next) {
        const s = this.s;
        const done = this.once(next);
        const pct = Math.round((s.bossHp / s.config.maxHp) * 100);
        this.phase += 1;
        this.turnsInPhase = 0;
        s.setBattleStatus(`> ADA :: ${PHASES[this.phase].name}`, RED_TXT);
        this.sprite.play("ada-ultimate-s");
        this.sprite.once("animationcomplete", () => this.sprite.play("ada-idle-s"));
        s.cameras.main.flash(300, 255, 42, 74, false);
        s.cameras.main.shake(260, 0.004);
        this.applyPhaseLook();
        const script = PHASE_TALK[this.phase](pct);

        if (this.phase === 1) {
            // O painel troca de linguagem antes de alguém falar.
            this.setCode([]);
            s.time.delayedCall(500, () => this.setCode(["se ..."]));
        } else if (this.phase === 2) {
            this.safe(() => this.room()?.setPhase?.(2))();
            this.setCode(["repita ..."]);
            // A última fala é a dela instalando a rotina (no espelho da sua).
            const routine = this.planAdaRoutine();
            script.push(ada(routine.speech, { onEnter: this.safe(() => this.installAdaRoutine(routine)) }));
        } else {
            // Fase 4: o laço principal. A música corta.
            Music.stop();
            this.setCode(["enquanto conectados != 0 :", "    conectados = conectados - lote", "    controlar"]);
            this.highlight(0, RED_TXT);
            s.menu.setLabel?.("reprogramar", "REESCREVER");
        }
        s.time.delayedCall(1100, () => this.talk(script, done));
    }

    // Antes do menu do jogador: a fala adiada do Cosmo, a condição imposta e as
    // marcas da fase 4.
    beforeMenu() {
        const s = this.s;
        if (this.imposedPending) {
            this.imposedActive = this.imposedPending;
            this.imposedPending = null;
        }
        if (this.imposedActive) {
            s.menu.setCaption?.("atacar", `se ${this.imposedActive.text} :`, AMBER_TXT);
        }
        if (this.phase === 3) {
            s.menu.setCaption?.("atacar", "laço ativo", RED_TXT);
            s.menu.setCaption?.("reprogramar", "condição de parada", CYAN_TXT);
            // O laço recomeça: a integridade volta ao mínimo da fase a cada volta.
            const floor = Math.ceil(s.config.maxHp * PHASES[2].until / 100);
            if (s.bossHp < floor) {
                s.bossHp = floor;
                s.updateBossHp();
            }
        }
    }

    // ATACAR: travado na fase 4; com a condição imposta, só fere se ela der true.
    attackGate() {
        if (this.phase === 3) {
            return { locked: true, message: "> LAÇO ATIVO: a integridade dela volta a cada volta" };
        }
        if (this.imposedActive) {
            const ok = this.imposedActive.test(this.s.lastDano ?? 0);
            this.imposedActive = null;
            this.s.menu.setCaption?.("atacar", null);
            if (!ok) return { blocked: true, message: "> CONDIÇÃO FALSA: o golpe não saiu" };
        }
        return null;
    }

    // ANALISAR: na fase 1 descreve a ADA; dali em diante, mostra o que ELA vê
    // (o perfil de aprendizagem de verdade, que a sala já carregou).
    analysisLines() {
        const s = this.s;
        const pct = Math.round((s.bossHp / s.config.maxHp) * 100);
        if (this.phase === 0) {
            return [
                "ADA :: NÚCLEO DA ELYSIUM",
                `INTEGRIDADE: ${pct}%`,
                s.forca === null ? "Nenhuma variável de ataque na memória." : `Sua variável forca vale ${s.forca}.`,
                `REPROGRAMAÇÕES: ${s.reprogramCount}/${s.maxReprograms}`,
                "COSMO: \"Ela muda o painel antes de mudar a luta. Sempre.\""
            ];
        }
        const names = { variables: "VARIÁVEIS", conditionals: "CONDICIONAIS", loops: "REPETIÇÕES" };
        const topics = s.config.profile;
        const lines = ["ADA :: ANALISANDO A AUDITORA"];
        if (!topics) {
            lines.push("O arquivo não respondeu. Uma coisa que ela não sabe sobre você.");
        } else {
            Object.entries(names).forEach(([topic, name]) => {
                const t = topics.find((p) => p.topic === topic);
                lines.push(t?.attempts
                    ? `${name}: ${Math.round(t.accuracy)}% de acerto, ${t.wrong} erros.`
                    : `${name}: sem registro.`);
            });
            const worst = topics.filter((t) => t.wrong > 0 && names[t.topic])
                .reduce((a, b) => (!a || b.wrong > a.wrong ? b : a), null);
            if (worst) lines.push(`"Você erra mais em ${names[worst.topic].toLowerCase()}. Eu sei por quê."`);
        }
        lines.push(this.phase === 3
            ? "O laço dela não tem condição de parada. REESCREVER."
            : `INTEGRIDADE DELA: ${pct}%`);
        return lines;
    }

    // --- Rotina da ADA (fase 3) -------------------------------------------------

    // Ela escreve a dela no espelho da do jogador: o mesmo sensor, a favor dela.
    planAdaRoutine() {
        const mine = this.s.routine?.cond?.sensor;
        if (mine === "dano") {
            return {
                lines: [["se", "dano", "==", "0", ":"], ["reparo", "=", "8"]],
                speech: "\"dano == 0\". Você também não aceita errar. Estamos do mesmo lado."
            };
        }
        return {
            lines: [["se", "integridade", "<", "35", ":"], ["reparo", "=", "8"]],
            speech: mine === "hp"
                ? "Você escreve \"se hp < 5\" para se proteger. Eu só faço isso por todos."
                : this.s.routine ? "Uma regra que age por você. Você já entendeu, só não admite." : "Nenhuma rotina? Então eu escrevo uma. Alguém precisa cuidar."
        };
    }

    installAdaRoutine(plan = this.planAdaRoutine()) {
        const s = this.s;
        this.adaRoutine = makeRoutine(plan.lines.map((tokens, i) => ({ indent: i, tokens })));
        this.adaHpAtCheck = s.bossHp;
        this.adaRoutineStatus = "INSTALADA";
        this.updateAdaRoutine();
        Juice.punch(s, this.adaRoutineText, 1.15, 110);
    }

    updateAdaRoutine(detail = "") {
        if (!this.adaRoutine) {
            this.adaRoutineText?.setText("");
            return;
        }
        this.adaRoutineText.setText(`ROTINA DA ADA [${this.adaRoutineStatus}${detail}]  ${this.adaRoutine.text}`);
    }

    // Conferida junto com a do jogador. `dano` é o que ELA levou desde a última
    // conferência (o ATACAR do jogador). Devolve a mensagem, ou null.
    runRoutine() {
        try {
            return this.runRoutineUnsafe();
        } catch (error) {
            console.error("[ADA]", error);
            return null;
        }
    }

    runRoutineUnsafe() {
        const s = this.s;
        if (!this.adaRoutine || this.phase < 2) return null;
        const dano = Math.max(0, (this.adaHpAtCheck ?? s.bossHp) - s.bossHp);
        const state = {
            hp: s.hp,
            integridade: Math.round((s.bossHp / s.config.maxHp) * 100),
            dano,
            forca: s.forca ?? 5
        };
        const { requests } = evaluateRoutine(this.adaRoutine.lines, state);
        let message = null;
        if (!requests.length) {
            this.adaRoutineStatus = "EM ESPERA";
            this.updateAdaRoutine();
        } else {
            const amount = Math.min(8, this.adaReserve, s.config.maxHp - s.bossHp);
            if (amount <= 0) {
                this.adaRoutineStatus = "BLOQUEADA";
                this.updateAdaRoutine(": reserva vazia");
            } else {
                this.adaReserve -= amount;
                s.bossHp += amount;
                s.updateBossHp();
                this.adaRoutineStatus = "DISPAROU";
                this.updateAdaRoutine(`: +${amount}`);
                Juice.punch(s, this.adaRoutineText, 1.1, 110);
                message = `> ROTINA DA ADA DISPAROU: +${amount} de integridade`;
            }
        }
        this.adaHpAtCheck = s.bossHp;
        return message;
    }

    // --- Movimento e quadro a quadro -------------------------------------------

    // Anel: A/D correm em volta, W/S vão para dentro/fora. Devolve true se tratou.
    moveSoul(vx, vy, delta) {
        const r = this.ring;
        if (!r) return false;
        const dt = delta / 1000;
        const speed = this.s.soulSpeed;
        r.ang += vx * (speed / r.r) * dt;
        r.r = Phaser.Math.Clamp(r.r + vy * speed * 0.55 * dt, r.rMin, r.rMax);
        this.s.soul.body.reset(r.cx + Math.cos(r.ang) * r.r, r.cy + Math.sin(r.ang) * r.r);
        return true;
    }

    update(time, delta) {
        const s = this.s;
        const last = this.trail[this.trail.length - 1];
        if (!this.sideMode && (!last || time - last.t >= 60) && this.trail.length < 200) {
            this.trail.push({ t: time, x: s.soul.x, y: s.soul.y });
        }
        if (!this.tick) return;
        try {
            this.tick(time, delta);
        } catch (error) {
            console.error("[ADA]", error);
            this.tick = null;
        }
    }

    // Fim do turno (stopDodge): o que é desta luta e não é limpo pela batalha.
    stopPattern() {
        const s = this.s;
        this.tick = null;
        this.ring = null;
        this.bridgeOpen = false;
        this.code.forEach((t, i) => {
            s.tweens.killTweensOf(t);
            t.setAlpha(1);
            t.y = CODE_Y + i * CODE_LINE_H;
        });
        this.highlight(-1);
        this.counter("");
        s.boxGraphics?.setVisible(true);
        s.boxColor = PHASES[this.phase].box;
        s.applyBox();
        if (this.sideMode) {
            this.sideMode = false;
            s.boxGraphics?.setDepth(0);
            s.soul?.setDepth(30);
        }
    }

    // --- Utilidades dos padrões ----------------------------------------------

    fx(obj) {
        this.s.patternFx.push(obj);
        return obj;
    }

    bullet(x, y, angle, speed, scale = 0.6) {
        const b = this.s.spawnRadial(x, y, angle, speed).setScale(scale);
        if (this.sideMode) b.setDepth(1007);
        return b;
    }

    tweenBox(props, duration, onComplete) {
        this.s.tweens.add({
            targets: this.s.box, ...props, duration, ease: "Sine.easeInOut",
            onUpdate: () => this.s.applyBox(), onComplete: onComplete && this.safe(onComplete)
        });
    }

    dashedRect(x, y, w, h, color, alpha = 0.9) {
        const g = this.fx(this.s.add.graphics().setDepth(27));
        g.lineStyle(2, color, alpha);
        const dash = (x1, y1, x2, y2) => {
            const len = Math.hypot(x2 - x1, y2 - y1);
            for (let d = 0; d < len; d += 14) {
                const a = d / len;
                const b = Math.min(1, (d + 8) / len);
                g.lineBetween(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b);
            }
        };
        const l = x - w / 2; const r = x + w / 2; const t = y - h / 2; const bt = y + h / 2;
        dash(l, t, r, t); dash(r, t, r, bt); dash(r, bt, l, bt); dash(l, bt, l, t);
        return g;
    }

    // Zona retangular: avisa fraca por `warnMs` e fere por `activeMs`.
    zone(x0, y0, x1, y1, warnMs, activeMs, color = RED) {
        const s = this.s;
        const now = s.time.now;
        const g = this.fx(s.add.graphics().setDepth(26));
        g.fillStyle(color, 0.16).fillRect(x0, y0, x1 - x0, y1 - y0);
        s.later(warnMs, () => {
            g.clear().fillStyle(color, 0.55).fillRect(x0, y0, x1 - x0, y1 - y0);
            s.later(activeMs, () => g.destroy());
        });
        s.hazards.push({ shape: "rect", x0, y0, x1, y1, from: now + warnMs, until: now + warnMs + activeMs });
    }

    rainIn(rect, speed = 190) {
        const x = Phaser.Math.Between(rect.x - rect.w / 2 + 12, rect.x + rect.w / 2 - 12);
        this.bullet(x, rect.y - rect.h / 2 + 10, Math.PI / 2 + Phaser.Math.FloatBetween(-0.08, 0.08), speed, 0.6);
    }

    firstTime(name) {
        if (this.seen.has(name)) return false;
        this.seen.add(name);
        const line = LINES[name];
        if (line) this.say(line[0], line[1]);
        return true;
    }

    // --- Padrões ---------------------------------------------------------------

    startPattern(name) {
        const fn = {
            assignSize: () => this.assignSize(),
            wallsOff: () => this.wallsOff(),
            decimalSpeed: () => this.decimalSpeed(),
            ifElseHalves: () => this.ifElseHalves(),
            ruleOrder: () => this.ruleOrder(),
            imposedRule: () => this.imposedRule(),
            repeatRotate: () => this.repeatRotate(),
            ring: () => this.ringPattern(),
            forEachMemory: () => this.forEachMemory(),
            echo: () => this.echo(),
            loopPulse: () => this.loopPulse()
        }[name];
        if (!fn) return false;
        this.firstTime(name);
        this.safe(fn)();
        return true;
    }

    // FASE 1 — caixa.largura e caixa.x mudam no painel; a chuva é para a caixa estreita.
    assignSize() {
        const s = this.s;
        this.setCode(["caixa.largura = 480", "caixa.x = 640", "alma.velocidade = 240", "paredes = true"]);
        const ghost = this.dashedRect(s.box.x, s.box.y, 200, s.box.h, AMBER, 0.8);
        this.assign(0, "caixa.largura = 200", () => {
            ghost.destroy();
            this.tweenBox({ w: 200 }, 500);
            s.spawnTimer = s.time.addEvent({ delay: 230, loop: true, callback: this.safe(() => this.rainIn(s.box, 200)) });
        });
        s.later(3200, () => this.assign(1, "caixa.x = 820", () => this.tweenBox({ x: 820 }, 800)));
        s.later(5400, () => this.assign(1, "caixa.x = 460", () => this.tweenBox({ x: 460 }, 900)));
        s.later(6400, () => {
            s.spawnTimer?.remove();
            s.spawnTimer = null;
            this.assign(0, "caixa.largura = 480", () => this.tweenBox({ w: 480, x: 640 }, 500));
            this.code[1].setText("caixa.x = 640");
        });
    }

    // FASE 1 — paredes = false: a alma sai da caixa; depois a caixa volta em
    // OUTRO lugar, e quem ficar fora do contorno leva o empurrão.
    wallsOff() {
        const s = this.s;
        this.setCode(["caixa.largura = 480", "caixa.x = 640", "alma.velocidade = 240", "paredes = true"]);
        this.assign(3, "paredes = false", () => {
            s.wallsOff = true;
            s.boxGraphics.setVisible(false);
            const old = this.dashedRect(s.box.x, s.box.y, s.box.w, s.box.h, 0xf7f7f7, 0.5);
            s.tweens.add({ targets: old, alpha: 0, duration: 900 });
            s.soulBounds.setTo(70, 262, 1140, 304);
            if (!this.seen.has("wallsOff-cosmo")) {
                this.seen.add("wallsOff-cosmo");
                s.later(700, () => this.say("COSMO", "Ela... desligou as paredes?", 2200));
            }
            // Fileiras de balas atravessando a tela inteira, avisadas pela linha.
            const lane = () => {
                const y = Phaser.Math.Between(280, 548);
                const fromLeft = Math.random() < 0.5;
                const warn = this.fx(s.add.graphics().setDepth(26));
                warn.lineStyle(2, RED, 0.5).lineBetween(70, y, 1210, y);
                s.later(600, () => {
                    warn.destroy();
                    for (let k = 0; k < 6; k += 1) {
                        s.later(k * 90, () => this.bullet(fromLeft ? 80 : 1200, y, fromLeft ? 0 : Math.PI, 300, 0.55));
                    }
                });
            };
            s.spawnTimer = s.time.addEvent({ delay: 650, loop: true, callback: this.safe(lane) });
        });
        // paredes = true: o contorno da caixa nova aparece com contagem.
        s.later(4600, () => {
            const nx = Phaser.Math.Between(420, 860);
            const target = { x: nx, y: 415, w: 300, h: 220 };
            const ghost = this.dashedRect(target.x, target.y, target.w, target.h, GREEN, 0.95);
            const count = this.fx(s.add.text(target.x, target.y, "3", {
                fontFamily: "VCR", fontSize: "34px", color: "#51e36b", stroke: "#050505", strokeThickness: 5
            }).setOrigin(0.5).setDepth(28));
            s.later(500, () => count.setText("2"));
            s.later(1000, () => count.setText("1"));
            this.assign(3, "paredes = true", () => {});
            s.later(1500, () => {
                ghost.destroy();
                count.destroy();
                s.spawnTimer?.remove();
                s.spawnTimer = null;
                const inside = Math.abs(s.soul.x - target.x) <= target.w / 2 && Math.abs(s.soul.y - target.y) <= target.h / 2;
                s.wallsOff = false;
                Object.assign(s.box, target);
                s.boxGraphics.setVisible(true);
                s.applyBox();
                if (!inside) {
                    s.soul.body.reset(target.x, target.y);
                    s.hurtSoul();
                }
                s.spawnTimer = s.time.addEvent({ delay: 280, loop: true, callback: this.safe(() => this.rainIn(s.box, 180)) });
            });
        });
    }

    // FASE 1 — alma.velocidade = 120.5 (lenta, anéis lentos), depois 360 (rápida
    // demais, tiros mirados).
    decimalSpeed() {
        const s = this.s;
        this.setCode(["caixa.largura = 480", "caixa.x = 640", "alma.velocidade = 240", "paredes = true"]);
        let gapAt = 0;
        this.assign(2, "alma.velocidade = 120.5", () => {
            s.soulSpeed = 120.5;
            s.soul.setTint(0x6f8cff);
            s.spawnTimer = s.time.addEvent({
                delay: 1050, loop: true, callback: this.safe(() => {
                    const ox = s.box.x + Phaser.Math.Between(-120, 120);
                    const oy = s.box.y - s.box.h / 2 + 8;
                    gapAt += 0.5;
                    for (let k = 0; k < 16; k += 1) {
                        const a = (k / 16) * Math.PI * 2;
                        if (Math.abs(Phaser.Math.Angle.Wrap(a - (Math.PI / 2 + Math.sin(gapAt)))) < 0.45) continue;
                        this.bullet(ox, oy, a, 95, 0.55);
                    }
                })
            });
        });
        s.later(4300, () => this.assign(2, "alma.velocidade = 360", () => {
            s.spawnTimer?.remove();
            s.soulSpeed = 360;
            s.soul.setTint(AMBER);
            s.spawnTimer = s.time.addEvent({
                delay: 400, loop: true, callback: this.safe(() => {
                    const side = Phaser.Math.Between(0, 3);
                    const b = s.box;
                    const x = side === 0 ? b.x - b.w / 2 + 6 : side === 1 ? b.x + b.w / 2 - 6 : Phaser.Math.Between(b.x - b.w / 2, b.x + b.w / 2);
                    const y = side < 2 ? Phaser.Math.Between(b.y - b.h / 2, b.y + b.h / 2) : side === 2 ? b.y - b.h / 2 + 6 : b.y + b.h / 2 - 6;
                    this.bullet(x, y, Phaser.Math.Angle.Between(x, y, s.soul.x, s.soul.y), 220, 0.55);
                })
            });
        }));
        s.later(7300, () => this.assign(2, "alma.velocidade = 240", () => {
            s.spawnTimer?.remove();
            s.spawnTimer = null;
            s.soulSpeed = 240;
            s.soul.clearTint();
        }));
    }

    // FASE 2 — se/senão: só o RAMO onde a alma está executa (chuva ou raios), e a
    // ponte abre de tempos em tempos. No meio, a ADA troca < por >=.
    ifElseHalves() {
        const s = this.s;
        let flipped = false;
        const draw = () => this.setCode([
            `se alma.x ${flipped ? ">=" : "<"} 640 :`, "    chuva", "senão :", "    raios"
        ]);
        draw();
        // Ela renomeia a Artemis na própria interface, sem dizer nada.
        if (!this.seen.has("auditora")) {
            this.seen.add("auditora");
            s.later(2200, () => s.hpLabel?.setText("AUDITORA :: HP"));
        }
        s.split = { gap: 70, offA: 0, offB: 0 };
        s.splitSide = s.soul.x < s.box.x ? 0 : 1;
        s.applyBox();

        // Ponte: o vão entre as metades acende verde, abre por 1,1 s (a alma
        // atravessa) e fecha; a alma fica na metade em que estiver.
        const bridge = () => {
            const b = s.box;
            const gap = s.split.gap;
            const g = this.fx(s.add.graphics().setDepth(27));
            g.fillStyle(GREEN, 0.2).fillRect(b.x - gap / 2, b.y - b.h / 2, gap, b.h);
            s.tweens.add({ targets: g, alpha: 0.3, duration: 120, yoyo: true, repeat: 1 });
            s.later(500, () => {
                g.clear().fillStyle(GREEN, 0.45).fillRect(b.x - gap / 2, b.y - b.h / 2, gap, b.h);
                this.bridgeOpen = true;
                s.soulBounds.setTo(b.x - b.w / 2 - gap / 2 + 8, b.y - b.h / 2 + 8, b.w + gap - 16, b.h - 16);
                s.later(1100, () => {
                    g.destroy();
                    this.bridgeOpen = false;
                    s.splitSide = s.soul.x < b.x ? 0 : 1;
                    s.applyBox();
                });
            });
        };
        s.later(1600, bridge);
        s.later(4600, bridge);
        s.later(7600, bridge);

        // Executa o ramo da alma.
        let nextBolt = 0;
        s.spawnTimer = s.time.addEvent({
            delay: 240, loop: true, callback: this.safe(() => {
                const left = s.soul.x < s.box.x;
                const rain = flipped ? !left : left;
                this.highlight(rain ? 1 : 3);
                const r = s.boxRects()[left ? 0 : 1];
                if (rain) {
                    this.rainIn(r, 190);
                } else if (s.time.now >= nextBolt) {
                    nextBolt = s.time.now + 1000;
                    const x = Phaser.Math.Clamp(s.soul.x + Phaser.Math.Between(-30, 30), r.x - r.w / 2 + 22, r.x + r.w / 2 - 22);
                    this.zone(x - 22, r.y - r.h / 2, x + 22, r.y + r.h / 2, 650, 300, 0xb14aff);
                }
            })
        });
        s.later(4400, () => {
            this.assign(0, "se alma.x >= 640 :", () => { flipped = true; });
        });
    }

    // FASE 2 — a ORDEM dos testes: o primeiro teste verdadeiro decide qual faixa
    // queima. A ADA reordena as linhas e a faixa segura muda.
    ruleOrder() {
        const s = this.s;
        const b = s.box;
        const top = b.y - b.h / 2;
        const A = Math.round(top + b.h / 3);
        const B = Math.round(top + (2 * b.h) / 3);
        const bands = {
            cima: [top, A], meio: [A, B], baixo: [B, top + b.h]
        };
        const rules = {
            cima: { test: (y) => y < A, text: `alma.y < ${A} : cima` },
            meio: { test: (y) => y < B, text: `alma.y < ${B} : meio` },
            baixo: { test: (y) => y >= B, text: `alma.y >= ${B} : baixo` }
        };
        const orders = [["cima", "meio"], ["meio", "cima"], ["baixo", "cima"]];
        let o = 0;
        const draw = () => {
            const [r1, r2] = orders[o];
            this.setCode([`se ${rules[r1].text}`, `senão se ${rules[r2].text}`, "senão : nada"]);
        };
        draw();
        const tick = () => {
            const [r1, r2] = orders[o];
            const y = s.soul.y;
            const hit = rules[r1].test(y) ? r1 : rules[r2].test(y) ? r2 : null;
            this.highlight(hit === r1 ? 0 : hit === r2 ? 1 : 2, hit ? RED_TXT : "#51e36b");
            if (!hit) return;
            const [y0, y1] = bands[hit];
            this.zone(b.x - b.w / 2, y0, b.x + b.w / 2, y1, 700, 380);
        };
        s.spawnTimer = s.time.addEvent({ delay: 1600, loop: true, callback: this.safe(tick) });
        s.later(300, tick);
        // Reordenação: as duas linhas trocam de lugar deslizando.
        const reorder = (next) => {
            const [t0, t1] = [this.code[0], this.code[1]];
            Sfx.play(s, "select", 0.4, { detune: -500 });
            s.tweens.add({ targets: t0, y: CODE_Y + CODE_LINE_H, duration: 700, ease: "Sine.easeInOut" });
            s.tweens.add({
                targets: t1, y: CODE_Y, duration: 700, ease: "Sine.easeInOut",
                onComplete: this.safe(() => { o = next; draw(); })
            });
        };
        s.later(3300, () => reorder(1));
        s.later(6600, () => reorder(2));
        if (!this.seen.has("ruleOrder-cosmo")) {
            this.seen.add("ruleOrder-cosmo");
            s.later(3900, () => this.say("COSMO", "Não liga para o painel, Artemis. É ela tentando te distrair.", 2600));
        }
    }

    // FASE 2 — uma condição imposta no ATACAR do próximo turno. A chuva é leve:
    // o desafio é não apanhar.
    imposedRule() {
        const s = this.s;
        const soft = this.seen.has("imposed-once");
        this.seen.add("imposed-once");
        const rule = soft
            ? { text: "dano < 4", test: (d) => d < 4 }
            : { text: "dano == 0", test: (d) => d === 0 };
        this.setCode([`se ${rule.text} :`, "    atacar", "", "regra da ADA: vale no próximo turno"]);
        this.highlight(0);
        this.imposedPending = rule;
        s.spawnTimer = s.time.addEvent({ delay: 430, loop: true, callback: this.safe(() => this.rainIn(s.box, 165)) });
    }

    // FASE 3 — repita 4 vezes: a caixa gira 90 graus por volta e uma onda vem do
    // lado que virou o "topo". Na 3ª volta, os controles giram junto.
    repeatRotate() {
        const s = this.s;
        this.setCode(["repita 4 vezes :", "    girar 90", "    onda"]);
        this.rotateCount = 0;
        this.tweenBox({ w: 360, h: 240 }, 400);
        const STEP = 2300;
        for (let k = 0; k < 4; k += 1) {
            s.later(600 + k * STEP, () => this.rotateOnce(k));
        }
    }

    rotateOnce(k) {
        const s = this.s;
        this.counter(`volta ${k + 1} / 4`);
        this.highlight(1);
        s.projectiles.clear(true, true);
        s.invulnUntil = s.time.now + 600;
        const b = s.box;
        // Giro visual (um retângulo à parte); a física troca largura e altura no fim.
        s.boxGraphics.setVisible(false);
        const spin = this.fx(s.add.container(b.x, b.y).setDepth(27));
        const g = s.add.graphics();
        g.lineStyle(3, PHASES[this.phase].box, 0.95).strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
        spin.add(g);
        Sfx.play(s, "select", 0.4, { detune: 200 * k });
        // A alma NÃO gira junto (pular de lugar confundia): fica onde está, e só o
        // que ficaria fora da caixa nova é empurrado, aos poucos, durante o giro,
        // como as paredes que se mexem no resto da luta.
        const from = Phaser.Geom.Rectangle.Clone(s.soulBounds);
        const nw = b.h;
        const nh = b.w;
        const to = new Phaser.Geom.Rectangle(b.x - nw / 2 + 8, b.y - nh / 2 + 8, nw - 16, nh - 16);
        const inner = Phaser.Geom.Intersects.GetRectangleIntersection(from, to, new Phaser.Geom.Rectangle());
        const lerp = (a, c, t) => a + (c - a) * t;
        s.tweens.add({
            targets: spin, angle: 90, duration: 420, ease: "Sine.easeInOut",
            onUpdate: this.safe((tween) => {
                const t = tween.progress;
                s.soulBounds.setTo(lerp(from.x, inner.x, t), lerp(from.y, inner.y, t),
                    lerp(from.width, inner.width, t), lerp(from.height, inner.height, t));
            }),
            onComplete: this.safe(() => {
                spin.destroy();
                const w = b.w;
                b.w = b.h;
                b.h = w;
                s.boxGraphics.setVisible(true);
                s.applyBox();
                this.rotateCount += 1;
                // Volta 3: os controles giram com a caixa (aviso nas bordas).
                if (k === 2) {
                    this.assign(3, "controles.girar = true", () => {
                        s.inputTurn = 270;
                        this.showKeyHints(270);
                    });
                } else if (k === 3 && s.inputTurn) {
                    s.inputTurn = 0;
                    this.keyHints?.destroy();
                    this.code[3].setText("controles.girar = false");
                }
                this.highlight(2);
                s.later(450, () => this.waveFrom(this.rotateCount % 4));
                s.later(1250, () => this.waveFrom(this.rotateCount % 4));
            })
        });
    }

    // Letras W/A/S/D nas bordas da caixa, onde cada tecla leva com o giro atual.
    showKeyHints(turn) {
        const s = this.s;
        const b = s.box;
        this.keyHints?.destroy();
        this.keyHints = this.fx(s.add.container(0, 0).setDepth(29));
        const rad = Phaser.Math.DegToRad(turn);
        [["W", 0, -1], ["S", 0, 1], ["A", -1, 0], ["D", 1, 0]].forEach(([key, vx, vy]) => {
            const x = vx * Math.cos(rad) - vy * Math.sin(rad);
            const y = vx * Math.sin(rad) + vy * Math.cos(rad);
            this.keyHints.add(s.add.text(b.x + x * (b.w / 2 + 18), b.y + y * (b.h / 2 + 18), key, {
                fontFamily: "VCR", fontSize: "22px", color: AMBER_TXT, stroke: "#050505", strokeThickness: 4
            }).setOrigin(0.5));
        });
    }

    // Onda: uma fileira de balas do lado `side` (0 cima, 1 direita, 2 baixo,
    // 3 esquerda) para dentro, com duas brechas.
    waveFrom(side) {
        const s = this.s;
        const b = s.box;
        const horizontal = side === 0 || side === 2;
        const len = horizontal ? b.w : b.h;
        const gaps = [Phaser.Math.FloatBetween(0.15, 0.4), Phaser.Math.FloatBetween(0.6, 0.85)];
        const angle = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side];
        for (let d = 14; d < len - 10; d += 26) {
            const f = d / len;
            if (gaps.some((g) => Math.abs(f - g) < 0.09)) continue;
            const x = horizontal ? b.x - b.w / 2 + d : side === 1 ? b.x + b.w / 2 - 8 : b.x - b.w / 2 + 8;
            const y = horizontal ? (side === 0 ? b.y - b.h / 2 + 8 : b.y + b.h / 2 - 8) : b.y - b.h / 2 + d;
            this.bullet(x, y, angle, 170, 0.55);
        }
    }

    // FASE 3 — o ANEL: a caixa vira a pista do halo dela. A alma corre em volta;
    // raios saem do centro; a SAÍDA no anel externo é a condição de parada.
    ringPattern() {
        const s = this.s;
        this.setCode(["enquanto alma.no_anel :", "    girar", "    raios do centro"]);
        this.highlight(0);
        this.tweenBox({ w: 300, h: 300 }, 400, () => {
            const b = s.box;
            s.boxGraphics.setVisible(false);
            this.ring = { cx: b.x, cy: b.y, ang: -Math.PI / 2, r: 100, rMin: 66, rMax: 134 };
            this.exit = { ang: Phaser.Math.FloatBetween(0, Math.PI * 2), w: 0.6, open: false };
            const hint = this.fx(s.add.text(b.x, b.y + b.h / 2 + 18, "A/D: correr no anel    W/S: para dentro / para fora", {
                fontFamily: "VCR", fontSize: "14px", color: "#9aa0b4"
            }).setOrigin(0.5).setDepth(29));
            s.later(3000, () => hint.destroy());
            this.ringGfx = this.fx(s.add.graphics().setDepth(27));
            this.spokes = [];
            s.later(2600, () => { this.exit.open = true; this.highlight(0, "#51e36b"); });
            s.spawnTimer = s.time.addEvent({
                delay: 1500, loop: true, callback: this.safe(() => {
                    const base = this.ring.ang + Math.PI + Phaser.Math.FloatBetween(-0.6, 0.6);
                    const dir = Math.random() < 0.5 ? 1 : -1;
                    const now = s.time.now;
                    for (let k = 0; k < 3; k += 1) {
                        this.spokes.push({ ang: base + (k * Math.PI * 2) / 3, dir, from: now + 650, until: now + 1450 });
                    }
                })
            });
            this.tick = (time, delta) => this.ringTick(time, delta);
        });
    }

    ringTick(time, delta) {
        const s = this.s;
        const r = this.ring;
        if (!r) return;
        const dt = delta / 1000;
        const g = this.ringGfx;
        g.clear();
        g.lineStyle(3, RED, 0.9).strokeCircle(r.cx, r.cy, r.rMax + 10);
        g.lineStyle(3, RED, 0.9).strokeCircle(r.cx, r.cy, r.rMin - 10);
        g.fillStyle(RED, 0.25).fillCircle(r.cx, r.cy, 18);
        // Saída: um arco verde que gira devagar no anel externo.
        this.exit.ang += 0.32 * dt;
        if (this.exit.open) {
            g.lineStyle(7, GREEN, 1);
            g.beginPath();
            g.arc(r.cx, r.cy, r.rMax + 10, this.exit.ang - this.exit.w / 2, this.exit.ang + this.exit.w / 2, false);
            g.strokePath();
        }
        // Raios: avisam finos, ferem grossos, giram.
        this.spokes = this.spokes.filter((sp) => time <= sp.until);
        this.spokes.forEach((sp) => {
            sp.ang += sp.dir * 0.5 * dt;
            const ex = r.cx + Math.cos(sp.ang) * (r.rMax + 12);
            const ey = r.cy + Math.sin(sp.ang) * (r.rMax + 12);
            const active = time >= sp.from;
            g.lineStyle(active ? 6 : 1, RED, active ? 0.95 : 0.5).lineBetween(r.cx, r.cy, ex, ey);
            if (active && s.soulNearSegment(r.cx, r.cy, ex, ey, 9)) s.hurtSoul();
        });
        // Condição de parada: passou pela saída aberta, o laço termina.
        const diff = Math.abs(Phaser.Math.Angle.Wrap(r.ang - this.exit.ang));
        if (this.exit.open && r.r >= r.rMax - 3 && diff <= this.exit.w / 2) {
            this.ring = null;
            this.tick = null;
            g.clear();
            s.boxGraphics.setVisible(true);
            this.code[0].setText("enquanto alma.no_anel :  falso");
            this.highlight(0, "#51e36b");
            Sfx.play(s, "confirm", 0.5);
            Juice.ring(s, s.soul.x, s.soul.y, { color: GREEN, radius: 20 });
            s.later(500, () => s.endDodge());
        }
    }

    // FASE 3 — para cada lembrança: ENIAC, WITCH, catraca e planta, em sequência.
    forEachMemory() {
        const s = this.s;
        const list = ["eniac", "witch", "catraca", "planta"];
        const textures = { eniac: "eniac-boss", witch: "witch-walk", catraca: "nucleo-catraca", planta: "nucleo-planta" };
        this.setCode(["para cada lembranca em lembrancas :", "    reviver(lembranca)", "", `lembrancas = [${list.join(", ")}]`]);
        const SEG = 2700;
        list.forEach((key, i) => {
            s.later(400 + i * SEG, () => {
                this.code[2].setText(`lembranca = "${key}"`);
                this.highlight(2);
                this.counter(`${i + 1} / ${list.length}`);
                const room = this.room();
                if (room?.memories?.[key]) room.lightMemory?.(key);
                if (s.textures.exists(textures[key])) {
                    const holo = this.fx(s.add.image(s.box.x, s.box.y, textures[key], { eniac: 0, witch: 5 }[key])
                        .setScale(key === "eniac" ? 2.2 : 1.8).setTint(RED).setAlpha(0.18).setDepth(1));
                    s.tweens.add({ targets: holo, alpha: 0, delay: SEG - 500, duration: 400 });
                }
                this.memoryAttack(key, SEG - 300);
            });
        });
    }

    memoryAttack(key, ms) {
        const s = this.s;
        const b = s.box;
        const until = s.time.now + ms;
        if (key === "eniac") {
            const t = s.time.addEvent({ delay: 210, loop: true, callback: this.safe(() => this.rainIn(b, 200)) });
            s.later(ms, () => t.remove());
            s.patternTimers.push(t);
            return;
        }
        if (key === "witch") {
            // Ponteiros: o das horas lento e longo, o dos minutos rápido e curto.
            const g = this.fx(s.add.graphics().setDepth(27));
            const hands = [{ ang: -Math.PI / 2, w: 0.9, len: 140 }, { ang: 0, w: -2.0, len: 95 }];
            const start = s.time.now;
            this.tick = (time, delta) => {
                if (time > until) { g.clear(); this.tick = null; return; }
                g.clear();
                const live = time - start > 500;
                hands.forEach((h) => {
                    h.ang += h.w * (delta / 1000);
                    const ex = b.x + Math.cos(h.ang) * h.len;
                    const ey = b.y + Math.sin(h.ang) * h.len;
                    g.lineStyle(live ? 6 : 1, 0x51e3a0, live ? 0.95 : 0.6).lineBetween(b.x, b.y, ex, ey);
                    if (live && s.soulNearSegment(b.x, b.y, ex, ey, 8)) s.hurtSoul();
                });
            };
            return;
        }
        if (key === "catraca") {
            // Barras que fecham a passagem, com uma brecha que anda.
            const rows = [0.25, 0.5, 0.75].map((f) => b.y - b.h / 2 + b.h * f);
            let phase = 0;
            const t = s.time.addEvent({
                delay: 900, loop: true, callback: this.safe(() => {
                    phase += 1;
                    rows.forEach((y, i) => {
                        if ((i + phase) % 2) return;
                        const gx = b.x + Math.sin(phase * 1.7 + i) * (b.w / 2 - 70);
                        this.zone(b.x - b.w / 2, y - 9, gx - 45, y + 9, 450, 350, 0xffd08a);
                        this.zone(gx + 45, y - 9, b.x + b.w / 2, y + 9, 450, 350, 0xffd08a);
                    });
                })
            });
            s.later(ms, () => t.remove());
            s.patternTimers.push(t);
            return;
        }
        // planta: bicos fixos regando; entre os canteiros, seco e seguro.
        const nozzles = [-0.38, -0.13, 0.13, 0.38].map((f) => b.x + b.w * f);
        nozzles.forEach((x) => this.fx(s.add.circle(x, b.y - b.h / 2 + 6, 5, GREEN, 0.9).setDepth(28)));
        const t = s.time.addEvent({
            delay: 260, loop: true, callback: this.safe(() => {
                const x = Phaser.Utils.Array.GetRandom(nozzles);
                this.bullet(x, b.y - b.h / 2 + 10, Math.PI / 2, 210, 0.5).setTint(GREEN);
            })
        });
        s.later(ms, () => t.remove());
        s.patternTimers.push(t);
    }

    // FASE 3 — eco: uma sombra repete o caminho que a alma fez no turno anterior,
    // no mesmo ritmo (na segunda vez, em dobro).
    echo() {
        const s = this.s;
        const b = s.box;
        const speed = this.echoCount > 0 ? 2 : 1;
        this.echoCount += 1;
        this.setCode(["para cada passo em artemis.ultimo_turno :", "    repetir(passo)"]);
        this.highlight(0);
        let path = this.lastTrail.filter((p) => Number.isFinite(p.x));
        if (path.length < 12) {
            path = Array.from({ length: 60 }, (_, i) => ({
                t: i * 100, x: b.x + Math.sin(i / 5) * 160, y: b.y + Math.cos(i / 7) * 90
            }));
        }
        const t0 = path[0].t;
        const pts = path.map((p) => ({
            t: (p.t - t0) / speed,
            x: Phaser.Math.Clamp(p.x, b.x - b.w / 2 + 10, b.x + b.w / 2 - 10),
            y: Phaser.Math.Clamp(p.y, b.y - b.h / 2 + 10, b.y + b.h / 2 - 10)
        }));
        const total = Math.min(pts[pts.length - 1].t, 7200);
        const line = this.fx(s.add.graphics().setDepth(26));
        line.lineStyle(2, RED, 0.45);
        line.beginPath();
        line.moveTo(pts[0].x, pts[0].y);
        pts.forEach((p) => line.lineTo(p.x, p.y));
        line.strokePath();
        const shadow = this.fx(s.add.image(pts[0].x, pts[0].y, "battle-soul").setTint(RED).setDepth(29).setAlpha(0.5));
        s.later(1000, () => {
            shadow.setAlpha(1);
            const start = s.time.now;
            let i = 0;
            this.tick = (time) => {
                const e = time - start;
                if (e > total) { this.tick = null; shadow.setAlpha(0.3); return; }
                while (i < pts.length - 1 && pts[i + 1].t <= e) i += 1;
                shadow.setPosition(pts[i].x, pts[i].y);
                if (Phaser.Math.Distance.Between(shadow.x, shadow.y, s.soul.x, s.soul.y) < 14) s.hurtSoul();
            };
        });
    }

    // FASE 4 — enquanto o jogador não reescreve, o laço pulsa: anéis lentos que
    // descem do topo (o núcleo dela), com uma brecha que vai de um lado ao outro.
    loopPulse() {
        const s = this.s;
        this.highlight(0, RED_TXT);
        let gap = 0;
        s.spawnTimer = s.time.addEvent({
            delay: 1000, loop: true, callback: this.safe(() => {
                gap += 0.6;
                const aim = Math.PI / 2 + Math.sin(gap) * 0.9;
                const ox = s.box.x;
                const oy = s.box.y - s.box.h / 2 + 8;
                for (let k = 0; k < 20; k += 1) {
                    const a = (k / 20) * Math.PI * 2;
                    if (Math.abs(Phaser.Math.Angle.Wrap(a - aim)) < 0.4) continue;
                    this.bullet(ox, oy, a, 115, 0.5);
                }
            })
        });
    }

    // --- Clímax: reescrever o laço, desviando ------------------------------------

    openLoopConsole() {
        const s = this.s;
        s.menu.hide();
        // Caixa pequena à direita do código, por cima do console (que não pausa nada).
        Object.assign(s.box, { x: 725, y: 330, w: 190, h: 230 });
        s.boxColor = 0x9fe8ff;
        s.applyBox();
        s.boxGraphics.setDepth(1005);
        s.soul.setDepth(1008);
        s.soul.body.reset(s.box.x, s.box.y);
        s.soul.setVisible(true);
        s.invulnUntil = s.time.now + 800;
        this.sideMode = true;
        s.dodgeActive = true;
        // O console cobre o HUD: o HP vai junto da caixa.
        const hpText = this.fx(s.add.text(s.box.x, s.box.y - s.box.h / 2 - 16, "", {
            fontFamily: "VCR", fontSize: "16px", color: "#e7e9f2", stroke: "#050505", strokeThickness: 4
        }).setOrigin(0.5).setDepth(1006));
        this.tick = () => hpText.setText(`HP ${s.hp}/${MAX_HP}  :: WASD`);
        s.spawnTimer = s.time.addEvent({
            delay: 1150, loop: true, callback: this.safe(() => {
                const b = s.box;
                const side = Phaser.Math.Between(0, 3);
                const x = side === 0 ? b.x - b.w / 2 + 6 : side === 1 ? b.x + b.w / 2 - 6 : Phaser.Math.Between(b.x - 80, b.x + 80);
                const y = side < 2 ? Phaser.Math.Between(b.y - 100, b.y + 100) : side === 2 ? b.y - b.h / 2 + 6 : b.y + b.h / 2 - 6;
                const mark = this.fx(s.add.circle(x, y, 7, RED, 0.6).setDepth(1006));
                s.later(320, () => {
                    mark.destroy();
                    this.bullet(x, y, Phaser.Math.Angle.Between(x, y, s.soul.x, s.soul.y), 150, 0.5);
                });
            })
        });
        let solved = false;
        const back = () => {
            s.stopDodge();
            if (solved) {
                this.finale();
            } else {
                s.setBattleStatus("> O LAÇO CONTINUA RODANDO", RED_TXT);
                s.time.delayedCall(700, () => s.showPlayerMenu());
            }
        };
        s.console = createConsole(s, LOOP_PUZZLE, {
            onSolved: () => { solved = true; },
            onCancel: back,
            onClose: back
        });
        s.console.open();
    }

    // O laço reescrito roda até o fim; o contador zera; a ADA fala uma vez; silêncio.
    finale() {
        const s = this.s;
        s.menu.hide();
        this.setCode(["enquanto conectados > 0 :", "    conectados = conectados - lote", "", "conectados = 12"]);
        this.highlight(0, "#51e36b");
        this.room()?.setConnected?.(0, 2400);
        [8, 4, 0].forEach((n, i) => s.time.delayedCall(700 * (i + 1), () => {
            this.code[3].setText(`conectados = ${n}`);
            Sfx.play(s, "select", 0.5, { detune: -200 * i });
        }));
        s.time.delayedCall(2600, () => {
            this.code[0].setText("enquanto conectados > 0 :  falso");
            s.setBattleStatus("> LAÇO PRINCIPAL: ENCERRADO", "#51e36b");
            s.cameras.main.flash(500, 74, 214, 255, false);
        });
        s.time.delayedCall(3400, () => this.talk(FINALE_TALK, () => s.time.delayedCall(600, () => s.victory())));
    }
}
