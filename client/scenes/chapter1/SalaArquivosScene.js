import BaseRoomScene from "./BaseRoomScene";

// Capítulo 1, sala 2 — Sala de arquivos: sem puzzle próprio; introduz o conceito
// de variável e é onde o Cosmo dá o nome "Artemis" à androide (nomear a variável).

const TERMINAL = { x: 640, y: 250, w: 110, h: 140 };
const TERMINAL_RADIUS = 140;

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "A sala de arquivos. A Elysium guardava registros de tudo aqui embaixo." },
    { speaker: "COSMO", text: "Cada registro funciona como uma variável: um nome que guarda um valor." },
    { speaker: "COSMO", text: "Procure o terminal central. Quero verificar o seu registro." }
];

export default class SalaArquivosScene extends BaseRoomScene {
    constructor() {
        super("cap1-arquivos", {
            title: "- SALA DE ARQUIVOS -",
            nextScene: "cap1-controle",
            spawn: { x: 180, y: 450 }
        });
    }

    onRoomCreate() {
        this.terminalUsed = false;

        this.drawCabinets();
        this.createTerminal();
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

    createTerminal() {
        const { x, y, w, h } = TERMINAL;
        const left = x - w / 2;
        const top = y - h / 2;

        const body = this.add.graphics();
        body.fillStyle(0x14161f, 1);
        body.fillRect(left, top, w, h);
        body.lineStyle(2, 0x3a3f55, 1);
        body.strokeRect(left, top, w, h);
        // Tela do terminal.
        body.fillStyle(0x4ad6ff, 0.14);
        body.fillRect(left + 12, top + 14, w - 24, 52);
        body.lineStyle(1, 0x4ad6ff, 0.6);
        body.strokeRect(left + 12, top + 14, w - 24, 52);
        // Base.
        body.fillStyle(0x0c0d14, 1);
        body.fillRect(left - 8, top + h, w + 16, 10);

        this.add.text(x, top - 16, "ARQUIVO CENTRAL", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#7a8099"
        }).setOrigin(0.5);

        const prompt = this.add.text(x, top - 44, "[E] CONSULTAR", {
            fontFamily: "VCR",
            fontSize: "18px",
            color: "#4ad6ff"
        }).setOrigin(0.5).setVisible(false);

        this.tweens.add({
            targets: prompt,
            y: top - 50,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.registerInteractable({
            x,
            y,
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

    drawCabinets() {
        // Fileiras de armários de arquivo ao longo da parede superior.
        const g = this.add.graphics();
        g.fillStyle(0x101018, 1);
        g.lineStyle(1, 0x2a2f45, 0.7);

        for (let x = 120; x <= 480; x += 90) {
            g.fillRect(x, 120, 70, 110);
            g.strokeRect(x, 120, 70, 110);
            for (let y = 140; y < 220; y += 26) {
                g.lineBetween(x + 8, y, x + 62, y);
            }
        }

        for (let x = 800; x <= 1120; x += 90) {
            g.fillRect(x, 120, 70, 110);
            g.strokeRect(x, 120, 70, 110);
            for (let y = 140; y < 220; y += 26) {
                g.lineBetween(x + 8, y, x + 62, y);
            }
        }
    }
}
