import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import SaveComputer from "../../objects/SaveComputer";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
import { generatorPuzzle } from "../../data/puzzleVariants";
import { save as saveProgress } from "../../state/progress";
import poraoBg from "../../assets/images/porao/porao_bg.png";
import poraoMap from "../../assets/maps/porao.json";

// Capítulo 1, sala 1 — Porão fundo (depósito da Elysium): tutorial de movimento
// (WASD) e o primeiro puzzle de variável (int) no gerador da parede. Mesma sala
// da IntroScene — o jogador acorda e ganha controle aqui.

// A androide acorda onde a IntroScene a deixou (canto esquerdo do depósito).
const SPAWN = { x: 236, y: 426 };

// Gerador: objeto do Tiled encostado na parede do fundo, à direita da porta
// (antes era pintado no fundo). Coordenadas de TELA = mapa + 8 do offset.
const GENERATOR = { x: 1048, y: 173, w: 96, h: 90 };

// Porta dupla desenhada na arte (parede do fundo, centro).
const DOOR = { x: 656, y: 98 };

// Estação de salvamento encostada na parede do fundo, ao lado do armário de
// arquivos. `y` é a base do móvel, para o y-sort casar com os outros objetos —
// a parede acaba em y=136 na tela, então a base fica a uma altura de sprite dali.
const SAVE_STATION = { x: 265, y: 200 };

// Cosmo explica a mecânica de blocos ANTES do primeiro console abrir (o painel
// em si só descreve o objetivo; a estrutura vem daqui e do botão [DICA]).
const PUZZLE_INTRO_SCRIPT = [
    { speaker: "COSMO", text: "Uma variável é um espaço na memória: um NOME que guarda um VALOR." },
    { speaker: "COSMO", text: "Arraste os blocos para os encaixes: o nome, o =, o valor. Se travar, tem a [DICA]." }
];

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Sistemas online. WASD para andar, Shift para correr. Vai com calma: você ficou um bom tempo desligada." },
    { speaker: "COSMO", text: "Sem energia, nenhuma porta abre. O gerador fica ali: chegue perto e aperte [E]." },
    { speaker: "COSMO", text: "E se alguma coisa chamar sua atenção, [E] também serve. Eu sempre tenho um comentário." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Energia de volta. Sua primeira variável - e a porta destravou." },
    { speaker: "SISTEMA", text: "> credencial encontrada: AUDITORIA. acesso ao núcleo: revogado" },
    { speaker: "COSMO", text: "...Log velho. Esse porão tem lixo de tudo quanto é sistema. Vamos." }
];

export default class PoraoScene extends BaseRoomScene {
    constructor() {
        super("cap1-porao", {
            nextScene: "cap1-arquivos",
            spawn: SPAWN,
            bounds: { x: 34, y: 140, w: 1212, h: 526 },
            door: DOOR,
            ySort: true,
            bg: poraoBg,
            bgKey: "porao-bg",
            map: poraoMap
        });
    }

    preload() {
        super.preload();
        BlockProgrammingConsole.preload(this);
        SaveComputer.preload(this);
    }

    drawBackdrop() {
        super.drawBackdrop();

        // Letreiro da empresa na parede (o emblema faz parte do fundo).
        this.add.text(470, 92, "E L Y S I U M", {
            fontFamily: "VCR",
            fontSize: "16px",
            color: "#6a7186"
        }).setOrigin(0.5).setDepth(-9);
    }

    onRoomCreate() {
        this.generator = new PuzzleDevice(this, {
            id: "porao-gerador",
            x: GENERATOR.x,
            y: GENERATOR.y,
            w: GENERATOR.w,
            h: GENERATOR.h,
            drawBody: false,
            // O sprite do gerador já tem sinalização própria; a luz do código
            // ficaria sobrando por cima dele.
            indicator: false,
            promptY: GENERATOR.y - GENERATOR.h / 2 - 20,
            blocks: true,
            // Capacidade da bateria sorteada a cada entrada (data/puzzleVariants.js).
            puzzle: generatorPuzzle(),
            introScript: PUZZLE_INTRO_SCRIPT,
            onSolved: () => this.handleGeneratorSolved(),
            // Save carregado com o gerador já resolvido: a porta abre calada,
            // sem repetir a fala do Cosmo.
            onRestore: () => this.unlockDoor()
        });

        this.saveStation = new SaveComputer(this, {
            x: SAVE_STATION.x,
            y: SAVE_STATION.y,
            onSave: () => this.saveGame()
        });

        // Quem chega pelo CONTINUAR com o gerador já religado não precisa ouvir
        // o tutorial de movimento de novo.
        if (!this.generator.solved) {
            this.playDialogue(ENTRY_SCRIPT);
        }
    }

    // Resposta do ponto de salvamento, na voz do jogo. O save local sempre
    // acontece; `remote` diz se o nó de arquivo (a API) também recebeu.
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

    handleGeneratorSolved() {
        // Sem texto de status: ele aparecia bem em cima da porta. O retorno
        // vem pelo diálogo do Cosmo e pela luz da porta destravando.
        this.time.delayedCall(1000, () => {
            this.playDialogue(SOLVED_SCRIPT, () => this.unlockDoor());
        });
    }
}
