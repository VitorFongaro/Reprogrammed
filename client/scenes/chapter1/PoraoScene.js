import BaseRoomScene from "./BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import SaveComputer from "../../objects/SaveComputer";
import BlockProgrammingConsole from "../../ui/BlockProgrammingConsole";
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

const GENERATOR_PUZZLE = {
    title: "GERADOR // NÚCLEO",
    briefing: [
        "O gerador está sem carga.",
        "Guarde na variável energia a carga certa",
        "para deixar a bateria cheia."
    ],
    hint: "a estrutura é  energia = valor  — qual valor enche a bateria?",
    variable: "energia",
    expected: 100,
    // Medidor visual: a bateria enche conforme o valor; cheia = 100.
    gauge: { kind: "battery", label: "BATERIA", max: 100 },
    successMessage: "GERADOR ATIVADO",
    wrongValueMessage: "a bateria ainda não está cheia",
    // Blocos extras (distratores) por categoria, além dos corretos.
    blockDistractors: {
        nome: ["voltagem", "sensor"],
        op: ["=="],
        valor: ["50", "\"100\""]
    }
};

// Cosmo explica a mecânica de blocos ANTES do primeiro console abrir (o painel
// em si só descreve o objetivo; a estrutura vem daqui e do botão [DICA]).
const PUZZLE_INTRO_SCRIPT = [
    { speaker: "COSMO", text: "Uma variável é um espaço na memória: um NOME que guarda um VALOR." },
    { speaker: "COSMO", text: "Arraste os blocos na ordem: o nome, o sinal de =, e o valor. Se travar, clique em [DICA]." }
];

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Sistemas online. Mova-se com WASD — e segure Shift para correr." },
    { speaker: "COSMO", text: "Sem energia, nenhuma porta abre. Aperte [E] no gerador — ou [R] para reprogramá-lo à distância, em câmara lenta." }
];

const SOLVED_SCRIPT = [
    { speaker: "COSMO", text: "Energia de volta — você criou sua primeira variável." },
    { speaker: "COSMO", text: "Porta destravada. A sala de arquivos é logo adiante." }
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
            puzzle: GENERATOR_PUZZLE,
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
            text: "> gravado só nesta máquina — nó de arquivo fora do ar",
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
