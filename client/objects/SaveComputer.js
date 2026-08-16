import SaveConsole from "../ui/SaveConsole";
import computadorUrl from "../assets/sprites/computador/computador.png";

// Estação de SALVAMENTO da sala — o equivalente à máquina de escrever do
// Resident Evil: um computador com o LED piscando que o jogador acha pelo
// cenário e ativa com [E] para gravar o progresso.
//
// Sprite do pack sci-fi (CC0, ver CREDITOS.txt): 32x16 com dois quadros, o LED
// da tela aceso e apagado — a animação alterna os dois.
//
// O salvamento em si ainda não existe; `config.onSave` liga a estação ao
// sistema quando ele chegar (ver SaveConsole).

const FRAME_W = 16;
const FRAME_H = 16;
const DEFAULT_SCALE = 4;          // 16px -> 64px: um pouco acima da Artemis, para
                                  // a estação não sumir no meio do cenário.
const DEFAULT_RADIUS = 110;
const ANIM_KEY = "computador-led";
const PROMPT_OFFSET_Y = 26;

export default class SaveComputer {
    static preload(scene) {
        if (!scene.textures.exists("computador")) {
            scene.load.spritesheet("computador", computadorUrl, {
                frameWidth: FRAME_W,
                frameHeight: FRAME_H
            });
        }
        SaveConsole.preload(scene);
    }

    static createAnimations(scene) {
        if (scene.anims.exists(ANIM_KEY)) {
            return;
        }

        // LED aceso por três tempos e apagado por um: pisca devagar, sem
        // parecer defeito.
        scene.anims.create({
            key: ANIM_KEY,
            frames: [
                { key: "computador", frame: 0 },
                { key: "computador", frame: 0 },
                { key: "computador", frame: 0 },
                { key: "computador", frame: 1 }
            ],
            frameRate: 3,
            repeat: -1
        });
    }

    constructor(scene, config) {
        this.scene = scene;
        this.x = config.x;
        this.y = config.y;              // base do móvel (pés), para o y-sort.
        this.scale = config.scale ?? DEFAULT_SCALE;

        SaveComputer.createAnimations(scene);

        const width = FRAME_W * this.scale;
        const height = FRAME_H * this.scale;

        this.sprite = scene.add.sprite(this.x, this.y, "computador")
            .setOrigin(0.5, 1)
            .setScale(this.scale)
            .setDepth(this.y);
        this.sprite.play(ANIM_KEY);

        this.prompt = scene.add.text(this.x, this.y - height - PROMPT_OFFSET_Y, "[E] SALVAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        scene.tweens.add({
            targets: this.prompt,
            y: this.prompt.y - 6,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.console = new SaveConsole(scene, {
            onSave: config.onSave ?? null,
            onClose: () => scene.player.setEnabled(true)
        });

        scene.registerInteractable({
            x: this.x,
            y: this.y - height / 2,
            radius: config.radius ?? DEFAULT_RADIUS,
            promptObj: this.prompt,
            isAvailable: () => true,
            onInteract: () => this.open()
        });

        // Bloqueia a passagem pelo móvel (só a base, no padrão top-down).
        scene.addColliders([
            { x: this.x - width / 2, y: this.y - height / 2, w: width, h: height / 2 }
        ]);
    }

    open() {
        this.scene.player.setEnabled(false);
        this.console.open();
    }
}
