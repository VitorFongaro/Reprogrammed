import BaseRoomScene from "../chapter1/BaseRoomScene";
import SaveComputer from "../../objects/SaveComputer";
import { save as saveProgress } from "../../state/progress";
import corredorBg from "../../assets/images/corredor_terreo/corredor_terreo_bg.png";

// Capítulo 2, fim — CORREDOR DO TÉRREO, depois da WITCH. O mesmo papel do
// corredor do subsolo (cap1-corredor): transição sem puzzle, onde o bloqueio de
// sinal cai mais um nível e a Lua manda a próxima transmissão, e o elevador no
// fim, que sobe para o núcleo (cap2-elevador -> capítulo 3).
//
// A transmissão conta o que vem a seguir: os puzzles que "se reorganizam" o
// capítulo inteiro são a ADA ESTUDANDO a Artemis (a IA dos puzzles virando
// história), e por que ela foi apagada no porão.
//
// Tem um ponto de salvamento, pelo mesmo motivo do corredor do subsolo: o
// embate com a WITCH é longo, e passar de capítulo cura por completo, então
// gravar deste lado guarda o estado real em que o jogador terminou o andar.
//
// Arte: fundo por tools/corredor_terreo_bg.py (só a faixa do corredor, como no subsolo).

const TRANSMISSION_X = 560;
const SAVE_STATION = { x: 960, y: 360 };

const LUA_COLOR = "#51e36b";

const TRANSMISSION_SCRIPT = [
    { speaker: "SISTEMA", text: "> bloqueio de sinal: nível 2 de 4 removido" },
    { speaker: "LUA", color: LUA_COLOR, text: "Cosmo, Artemis... o sinal está mais limpo. Vocês derrubaram o térreo inteiro." },
    { speaker: "LUA", color: LUA_COLOR, text: "Ouçam. Aqueles sistemas que mudavam toda vez que vocês chegavam perto... não era defeito." },
    { speaker: "LUA", color: LUA_COLOR, text: "Era a ADA estudando você. Cada regra que ela reescreve é um teste, montado sob medida para o que você ainda erra." },
    { speaker: "LUA", color: LUA_COLOR, text: "É assim que ela faz com as pessoas conectadas aos chips: aprende onde cada uma é fraca e ajusta tudo em volta." },
    { speaker: "LUA", color: LUA_COLOR, text: "E Artemis... antes do bloqueio, você era a auditora dela. A única máquina com acesso ao núcleo." },
    { speaker: "LUA", color: LUA_COLOR, text: "Por isso ela apagou você no porão. Por isso os robôs dizem que você os traiu." },
    { speaker: "LUA", color: LUA_COLOR, text: "O núcleo fica no último andar. Lá ela não reescreve só sistemas. Reescreve gen..." },
    { speaker: "SISTEMA", text: "> sinal perdido" },
    { speaker: "COSMO", text: "Auditora... então é por isso que ela tem medo de você." },
    { speaker: "COSMO", text: "Ela anda estudando você? Ótimo. A gente também aprendeu. O elevador está no fim do corredor." }
];

export default class CorredorTerreoScene extends BaseRoomScene {
    constructor() {
        super("cap2-corredor", {
            nextScene: "cap2-elevador",
            doorLabel: "[E] ELEVADOR",
            spawn: { x: 90, y: 470 },
            bounds: { x: 34, y: 320, w: 1212, h: 300 },
            door: { x: 1176, y: 262 },
            ySort: true,
            bg: corredorBg,
            music: "cap2"
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

    // Mesma resposta do corredor do subsolo: o save local sempre acontece;
    // `remote` diz se o nó de arquivo (a API) também recebeu.
    async saveGame() {
        const result = await saveProgress();
        if (result.remote) {
            return { text: "> progresso gravado no nó de arquivo" };
        }
        return {
            text: "> gravado só nesta máquina: nó de arquivo fora do ar",
            color: "#ffb347"
        };
    }

    onRoomUpdate() {
        if (this.transmissionDone || !this.player.enabled) {
            return;
        }
        if (this.player.sprite.x >= TRANSMISSION_X) {
            this.transmissionDone = true;
            this.playDialogue(TRANSMISSION_SCRIPT, () => this.unlockDoor());
        }
    }
}
