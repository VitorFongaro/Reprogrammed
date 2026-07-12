import BaseRoomScene from "./BaseRoomScene";
import arquivosBg from "../../assets/images/arquivos/arquivos_bg.png";
import arquivosMap from "../../assets/maps/arquivos.json";

// Capítulo 1, sala 2 — Sala de arquivos: sem puzzle próprio; introduz o conceito
// de variável e é onde o Cosmo dá o nome "Artemis" à androide (nomear a variável).
// O terminal central é um prop do Tiled; o código só registra a interação.

const TERMINAL = { x: 640, y: 330 };
const TERMINAL_RADIUS = 150;
const TERMINAL_PROMPT_Y = 246;

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "A sala de arquivos. A Elysium guardava registros de tudo aqui embaixo." },
    { speaker: "COSMO", text: "Cada registro funciona como uma variável: um nome que guarda um valor." },
    { speaker: "COSMO", text: "Procure o terminal central. Quero verificar o seu registro." }
];

export default class SalaArquivosScene extends BaseRoomScene {
    constructor() {
        super("cap1-arquivos", {
            nextScene: "cap1-controle",
            spawn: { x: 150, y: 450 },
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: { x: 656, y: 98 },
            ySort: true,
            bg: arquivosBg,
            map: arquivosMap
        });
    }

    onRoomCreate() {
        this.terminalUsed = false;
        this.createTerminalInteraction();
        this.playDialogue(ENTRY_SCRIPT);
    }

    namingScript() {
        return [
            { speaker: "SISTEMA", text: "> consultando registro da unidade..." },
            { speaker: "SISTEMA", text: "> unidade: A-7724   |   classe: androide   |   nome: ────" },
            { speaker: "COSMO", text: "Nome vazio. Anos aqui embaixo e nem um nome te deram." },
            { speaker: "COSMO", text: "Toda variável importante merece um nome. Que tal... Artemis?" },
            {
                speaker: "SISTEMA",
                text: '> nome = "Artemis"   [registro atualizado]',
                onEnter: () => this.flashPlayer()
            },
            { speaker: "COSMO", text: "Artemis. Gostei. Um texto entre aspas — é assim que máquinas guardam nomes." },
            { speaker: "COSMO", text: "Vamos. O controle ambiental fica adiante." }
        ];
    }

    createTerminalInteraction() {
        const prompt = this.add.text(TERMINAL.x, TERMINAL_PROMPT_Y, "[E] CONSULTAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setDepth(800).setVisible(false);

        this.tweens.add({
            targets: prompt,
            y: TERMINAL_PROMPT_Y - 6,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.registerInteractable({
            x: TERMINAL.x,
            y: TERMINAL.y,
            radius: TERMINAL_RADIUS,
            promptObj: prompt,
            isAvailable: () => !this.terminalUsed,
            onInteract: () => this.useTerminal()
        });
    }

    useTerminal() {
        this.terminalUsed = true;
        this.playDialogue(this.namingScript(), () => {
            this.setStatus('> nome = "Artemis"', "#51e36b");
            this.unlockDoor();
        });
    }

    flashPlayer() {
        this.tweens.add({
            targets: this.player.sprite,
            alpha: { from: 1, to: 0.2 },
            duration: 80,
            yoyo: true,
            repeat: 4,
            onComplete: () => this.player.sprite.setAlpha(1)
        });
    }
}
