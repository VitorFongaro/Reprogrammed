import BaseRoomScene from "./BaseRoomScene";
import corredorBg from "../../assets/images/corredor/corredor_bg.png";
import corredorMap from "../../assets/maps/corredor.json";

// Capítulo 1, sala 5 — Corredor/elevador: transição sem puzzle. No meio do
// corredor o bloqueio de sinal cai um nível e a colônia lunar passa a primeira
// mensagem ao Cosmo (fragmento de história). O elevador só libera depois.

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
            nextScene: "cap1-saguao",
            doorLabel: "[E] ELEVADOR",
            spawn: { x: 120, y: 470 },
            bounds: { x: 34, y: 320, w: 1140, h: 300 },
            door: { x: 1214, y: 468 },
            ySort: true,
            bg: corredorBg,
            map: corredorMap
        });
    }

    onRoomCreate() {
        this.transmissionDone = false;
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
}
