import BaseRoomScene from "./BaseRoomScene";

// Capítulo 1, sala 5 — Corredor/elevador: transição sem puzzle. No meio do
// corredor o bloqueio de sinal cai um nível e a colônia lunar passa a primeira
// mensagem ao Cosmo (fragmento de história). O elevador só libera depois.

const BOUNDS = { x: 48, y: 280, w: 1184, h: 220 };
const TRANSMISSION_X = 620;

const LUA_COLOR = "#51e36b";

const TRANSMISSION_SCRIPT = [
    { speaker: "SISTEMA", text: "> bloqueio de sinal: nível 3 de 4 removido" },
    { speaker: "LUA", color: LUA_COLOR, text: "...osmo? ...está me ouvindo? Conexão parcial restabelecida." },
    { speaker: "LUA", color: LUA_COLOR, text: "Encontrou a unidade! Escute — não temos muito tempo." },
    { speaker: "LUA", color: LUA_COLOR, text: "A ADA mente. Os chips neurais não apenas monitoram... eles reescrevem memórias." },
    { speaker: "LUA", color: LUA_COLOR, text: "As pessoas lá em cima não lembram do que perderam. Suba, e você vai ent—" },
    { speaker: "SISTEMA", text: "> sinal perdido" },
    { speaker: "COSMO", text: "É a colônia da Lua — foram eles que me enviaram. Cada sistema da ADA que cai, o sinal deles chega mais longe." },
    { speaker: "COSMO", text: "Reescrever memórias... Artemis, precisamos subir. O elevador está ali." }
];

export default class CorredorScene extends BaseRoomScene {
    constructor() {
        super("cap1-corredor", {
            title: "- CORREDOR DE SERVIÇO -",
            nextScene: "cap1-saguao",
            doorLabel: "[E] ELEVADOR",
            spawn: { x: 140, y: 390 },
            bounds: BOUNDS
        });
    }

    onRoomCreate() {
        this.transmissionDone = false;
        this.drawCorridor();
    }

    onRoomUpdate() {
        if (this.transmissionDone || !this.player.enabled) {
            return;
        }

        if (this.player.sprite.x >= TRANSMISSION_X) {
            this.transmissionDone = true;
            this.playDialogue(TRANSMISSION_SCRIPT, () => {
                this.setStatus("> bloqueio de sinal enfraquecido", "#51e36b");
                this.unlockDoor();
            });
        }
    }

    drawCorridor() {
        const g = this.add.graphics();

        // Pilares ao longo das paredes.
        g.fillStyle(0x101018, 1);
        g.lineStyle(1, 0x2a2f45, 0.7);
        for (let x = 160; x < 1100; x += 180) {
            g.fillRect(x, BOUNDS.y - 34, 26, 34);
            g.strokeRect(x, BOUNDS.y - 34, 26, 34);
            g.fillRect(x, BOUNDS.y + BOUNDS.h, 26, 34);
            g.strokeRect(x, BOUNDS.y + BOUNDS.h, 26, 34);
        }

        // Faixas de sinalização no chão apontando para o elevador.
        g.lineStyle(2, 0x4ad6ff, 0.25);
        for (let x = 200; x < 1140; x += 90) {
            g.lineBetween(x, 390, x + 40, 370);
            g.lineBetween(x, 390, x + 40, 410);
        }

        this.add.text(BOUNDS.x + BOUNDS.w - 40, BOUNDS.y - 24, "ELEVADOR", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#7a8099"
        }).setOrigin(1, 0.5);
    }
}
