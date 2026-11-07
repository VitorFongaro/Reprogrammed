import Phaser from "phaser";
import DialogueBox from "../../ui/DialogueBox";
import { markChapterCompleted } from "../../state/chapters";

// Capítulo 2, encerramento — o ELEVADOR subindo do térreo para o núcleo. Faz o
// papel do saguão no fim do capítulo 1 (cap1-saguao): uma cutscene curta, o
// cartão "FIM DO CAPÍTULO 2" com o resumo das condicionais e o ESPAÇO segue
// para a linha de montagem (cap3-montagem), a primeira sala do capítulo 3.
//
// Desenhado no código: a cabine escura, o visor contando os andares e as luzes
// que passam pelas frestas da porta, cada vez mais vermelhas (o andar da ADA).

const WIDTH = 1280;
const HEIGHT = 720;
const FLOORS = ["T", "1", "2", "3", "4", "5", "N"];
const FLOOR_MS = 900;
const RED = 0xff2a4a;

const SCRIPT = [
    { speaker: "COSMO", text: "Subindo. Último andar: o núcleo." },
    { speaker: "COSMO", text: "Até aqui foram decisões: se isto, então aquilo. Lá em cima, a ADA repete. E repete. E repete." },
    { speaker: "COSMO", text: "Se ela está estudando você, Artemis... vamos dar a ela alguma coisa para estudar." }
];

const SUMMARY_LINES = [
    "se cracha >= 4 :  catraca = true",
    "se umidade < 40 :  regar = true",
    "senão :  regar = false",
    'senão se urgente :  rampa = "expresso"'
];

export default class ElevadorScene extends Phaser.Scene {
    constructor() {
        super("cap2-elevador");
    }

    create() {
        this.cameras.main.setBackgroundColor("#050505");
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.drawCabin();
        this.dialogue = new DialogueBox(this);

        this.floor = 0;
        this.time.addEvent({
            delay: FLOOR_MS,
            repeat: FLOORS.length - 2,
            callback: () => this.nextFloor()
        });
        this.time.delayedCall(700, () => this.dialogue.play(SCRIPT, () => this.arrive()));
    }

    // Cabine: portas fechadas, o visor do andar e as frestas por onde passa luz.
    drawCabin() {
        const g = this.add.graphics();
        g.fillStyle(0x0c0d14, 1).fillRect(WIDTH / 2 - 260, 120, 520, 520);
        g.fillStyle(0x3a3f55, 1).fillRect(WIDTH / 2 - 2, 170, 4, 470);
        g.lineStyle(3, 0x3a3f55, 1).strokeRect(WIDTH / 2 - 260, 170, 520, 470);
        g.fillStyle(0x12141c, 1).fillRect(WIDTH / 2 - 60, 120, 120, 40);
        this.display = this.add.text(WIDTH / 2, 140, FLOORS[0], {
            fontFamily: "VCR", fontSize: "30px", color: "#ffc824"
        }).setOrigin(0.5);
        // Seta desenhada (a fonte do jogo não tem o ▲).
        this.arrow = this.add.triangle(WIDTH / 2 + 40, 140, 0, 10, 7, 0, 14, 10, 0xffc824);
        this.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });

        // Faixa de luz que passa pela fresta a cada andar.
        this.slit = this.add.rectangle(WIDTH / 2, 700, 6, 120, 0x4ad6ff, 0.6);

        const scan = this.add.graphics().setDepth(5);
        scan.lineStyle(1, 0x000000, 0.35);
        for (let y = 0; y < HEIGHT; y += 4) scan.lineBetween(0, y, WIDTH, y);
    }

    nextFloor() {
        this.floor += 1;
        const label = FLOORS[this.floor];
        this.display.setText(label);
        // Quanto mais alto, mais vermelha a luz: chegando no andar da ADA.
        const t = this.floor / (FLOORS.length - 1);
        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(0x4ad6ff), Phaser.Display.Color.ValueToColor(RED), 100, t * 100);
        this.slit.setFillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.6);
        this.slit.setY(700);
        this.tweens.add({ targets: this.slit, y: 100, duration: FLOOR_MS * 0.8, ease: "Sine.easeIn" });
        this.cameras.main.shake(80, 0.0015);
        if (label === "N") {
            this.display.setColor("#ff4565");
            this.arrow.setVisible(false);
        }
    }

    // Só encerra depois do diálogo E do último andar.
    arrive() {
        const wait = Math.max(0, (FLOORS.length - 1 - this.floor) * FLOOR_MS);
        this.time.delayedCall(wait + 400, () => this.showEndCard());
    }

    showEndCard() {
        // A WITCH já marcou o capítulo como concluído; marcar de novo não muda nada.
        markChapterCompleted(2);
        const overlay = this.add.container(0, 0).setDepth(950).setAlpha(0);
        const backdrop = this.add.graphics();
        backdrop.fillStyle(0x000000, 0.86).fillRect(0, 0, WIDTH, HEIGHT);
        overlay.add(backdrop);
        overlay.add(this.add.text(WIDTH / 2, 170, "FIM DO CAPÍTULO 2", {
            fontFamily: "VCR", fontSize: "48px", color: "#f7f7f7"
        }).setOrigin(0.5));
        overlay.add(this.add.text(WIDTH / 2, 230, "CONDICIONAIS :: CONCLUÍDO", {
            fontFamily: "VCR", fontSize: "22px", color: "#51e36b"
        }).setOrigin(0.5));

        SUMMARY_LINES.forEach((line, index) => {
            const text = this.add.text(WIDTH / 2, 310 + index * 40, line, {
                fontFamily: "VCR", fontSize: "24px", color: "#4ad6ff"
            }).setOrigin(0.5).setAlpha(0);
            overlay.add(text);
            this.tweens.add({ targets: text, alpha: 1, duration: 400, delay: 600 + index * 350 });
        });

        overlay.add(this.add.text(WIDTH / 2, HEIGHT - 122, "> CAPÍTULO 2 LIBERADO NA SELEÇÃO DE CAPÍTULOS DO MENU", {
            fontFamily: "VCR", fontSize: "16px", color: "#ffb347"
        }).setOrigin(0.5));
        const hint = this.add.text(WIDTH / 2, HEIGHT - 80, "[ESPAÇO] CONTINUAR", {
            fontFamily: "VCR", fontSize: "20px", color: "#5b6178"
        }).setOrigin(0.5);
        overlay.add(hint);
        this.tweens.add({ targets: hint, alpha: { from: 1, to: 0.25 }, duration: 700, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: overlay, alpha: 1, duration: 600 });

        this.time.delayedCall(800, () => {
            this.input.keyboard.once("keydown-SPACE", () => {
                this.cameras.main.fadeOut(700, 0, 0, 0);
                this.cameras.main.once("camerafadeoutcomplete", () => {
                    // O capítulo 3 começa na linha de montagem do núcleo.
                    this.scene.start("cap3-montagem");
                });
            });
        });
    }
}
