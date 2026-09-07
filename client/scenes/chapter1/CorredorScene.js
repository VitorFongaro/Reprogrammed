import BaseRoomScene from "./BaseRoomScene";
import SaveComputer from "../../objects/SaveComputer";
import { save as saveProgress } from "../../state/progress";
import corredorBg from "../../assets/images/corredor/corredor_bg.png";
import corredorMap from "../../assets/maps/corredor.json";

// Capítulo 1, sala 5 — Corredor/elevador: transição sem puzzle. No meio do
// corredor o bloqueio de sinal cai um nível e a colônia lunar passa a primeira
// mensagem ao Cosmo (fragmento de história). O elevador só libera depois.
//
// É também o SEGUNDO ponto de salvamento do jogo, e o primeiro depois do boss:
// o embate com o ENIAC é o trecho mais longo do capítulo, e sem uma estação
// aqui quem fechasse o jogo depois de vencer teria de lutar tudo de novo. Fica
// antes do elevador de propósito — passar de capítulo cura por completo, então
// gravar deste lado guarda o estado real em que o jogador terminou o andar.

const TRANSMISSION_X = 620;
const SAVE_STATION = { x: 1060, y: 380 };

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

    preload() {
        super.preload();
        SaveComputer.preload(this);
    }

    onRoomCreate() {
        this.transmissionDone = false;

        this.saveStation = new SaveComputer(this, {
            x: SAVE_STATION.x,
            y: SAVE_STATION.y,
            onSave: () => this.saveGame()
        });
    }

    // Mesma resposta do porão: o save local sempre acontece; `remote` diz se o
    // nó de arquivo (a API) também recebeu.
    async saveGame() {
        const result = await saveProgress();

        if (result.remote) {
            return { text: "> progresso gravado no nó de arquivo" };
        }

        return {
            text: "> gravado só nesta máquina — nó de arquivo fora do ar",
            color: "#ffb347"
        };
    }

    onRoomUpdate() {
        if (this.transmissionDone || !this.player.enabled) {
            return;
        }

        if (this.player.sprite.x >= TRANSMISSION_X) {
            this.transmissionDone = true;
            this.playDialogue(TRANSMISSION_SCRIPT, () => {
                this.unlockDoor();
            });
        }
    }
}
