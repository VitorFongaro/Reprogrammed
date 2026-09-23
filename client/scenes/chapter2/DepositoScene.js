import BaseRoomScene from "../chapter1/BaseRoomScene";
import PuzzleDevice from "../../objects/PuzzleDevice";
import CrateCorridor from "../../objects/CrateCorridor";
import CrateBridge from "../../objects/CrateBridge";
import { addServicePanel } from "../../objects/ServicePanel";
import Effects from "../../ui/Effects";

// Capítulo 2, SALA DE TESTE dos PUZZLES DE MUNDO: o programa do jogador não
// acende luz nem pinta cartão de teste — ele MEXE NO MAPA. Cada caso de teste é
// um objeto (uma caixa), o console fecha ao completar o programa e o mapa
// executa caso a caso. Se a lógica estiver errada, não aparece mensagem: o
// jogador vê a caixa que travou ou o buraco que ficou na ponte. (Erro de
// SINTAXE continua no console, como um compilador: programa que nem roda não
// tem o que mostrar no mapa.) Ver ConditionalConsole, "modo mundo".
//
// Percurso, da esquerda para a direita:
//   1. CORREDOR (se/senão, limite numérico): caixas travam a passagem; cada uma
//      tem um nicho em cima ou embaixo. Caixa de 50 kg no nicho de CIMA: é o
//      caso de borda que separa `> 50` de `>= 50`.
//   2. PONTE (`ou`): o guindaste monta a ponte com as caixas da esteira. Aço OU
//      cheia aguenta; papelão vazio afunda e leva o vão junto.
//
// Fora do fluxo do jogo como as outras salas de teste do cap. 2: sem porta, sem
// checkpoint (`autoSave: false`), sem música e puzzles sem `id`. Acesso pelo
// painel do laboratório ou por  __game.scene.start("cap2-deposito").

const CORREDOR = { x0: 300, y: 420 };                      // parede de x 300 a 604
const PONTE = {
    x0: 820, y: 420,                                       // abismo de x 820 a 1000
    queue: { x: 760, y0: 150, gap: 58 },                   // esteira com a fila
    chute: { x: 690, y: 600 }                              // buraco de descarte
};
const TERMINAL_CORREDOR = { x: 190, y: 250 };
const TERMINAL_PONTE = { x: 668, y: 230 };
const OUTRO_LADO_X = 1010;                                 // passou do abismo

// 1) Corredor. As caixas vão na ORDEM dos testes, da esquerda para a direita, e o
// lado do nicho de cada uma é o `expect` dela.
// O `<=` é obrigatório: o briefing fala do caso LEVE primeiro ("até 50 kg"), e a
// tradução natural disso é `peso <= 50`. Sem ele, a única saída era inverter
// tudo (`peso > 50` mandando para baixo) — resolvível, mas nada no texto leva
// até lá. Com os dois, `<` e `>=` continuam de isca: são eles que travam a
// caixa de 50 kg.
const CORREDOR_PUZZLE = {
    title: "CORREDOR DE CARGA",
    briefing: [
        "As caixas travam o corredor. Os nichos de cima aguentam",
        "caixa LEVE, até 50 kg; as mais pesadas vão para os de baixo."
    ],
    hint: 'monte:  se peso <= 50 :  lado = "cima"  /  senão :  lado = "baixo"',
    lines: [
        "se [nome] [op] [valor] :",
        "    lado = [valor]",
        "senão :",
        "    lado = [valor]"
    ],
    blocks: { nome: ["peso"], op: ["<=", "<", ">", ">="], valor: ["50", "20", '"cima"', '"baixo"'] },
    tests: [
        { label: "A", given: { peso: 80 }, expect: { lado: "baixo" } },
        { label: "B", given: { peso: 20 }, expect: { lado: "cima" } },
        { label: "C", given: { peso: 50 }, expect: { lado: "cima" } },
        { label: "D", given: { peso: 120 }, expect: { lado: "baixo" } }
    ]
};

// 2) Ponte. A caixa fraca (B) vem em SEGUNDO de propósito: se viesse por último,
// "tudo para a ponte" encheria os 3 vãos antes dela e passaria com a ponte
// inteira (ver o topo do CrateBridge).
const PONTE_PUZZLE = {
    title: "PONTE DE CARGA",
    briefing: [
        "Caixa de AÇO aguenta a Artemis, e caixa CHEIA também.",
        "Essas vão para a ponte; o resto, para o descarte."
    ],
    hint: 'monte:  se aco ou cheia :  destino = "ponte"  /  senão :  destino = "descarte"',
    lines: [
        "se [nome] [op] [nome] :",
        "    destino = [valor]",
        "senão :",
        "    destino = [valor]"
    ],
    blocks: { nome: ["aco", "cheia"], op: ["e", "ou"], valor: ['"ponte"', '"descarte"'] },
    tests: [
        { label: "A", given: { aco: true, cheia: true }, expect: { destino: "ponte" } },
        { label: "B", given: { aco: false, cheia: false }, expect: { destino: "descarte" } },
        { label: "C", given: { aco: true, cheia: false }, expect: { destino: "ponte" } },
        { label: "D", given: { aco: false, cheia: true }, expect: { destino: "ponte" } }
    ]
};

const ENTRY_SCRIPT = [
    { speaker: "COSMO", text: "Depósito de carga. Aqui o seu código não acende luzinha: ele MEXE nas coisas." },
    { speaker: "COSMO", text: "Se a lógica estiver certa, o caminho abre. Se não estiver... você vai ver exatamente onde travou." }
];
const CORREDOR_LIVRE = [
    { speaker: "COSMO", text: "Corredor livre. Ninguém te disse que estava certo: você só viu as caixas saindo da frente." }
];
const PONTE_PRONTA = [
    { speaker: "COSMO", text: "Ponte montada. Cada caixa ali embaixo é um caso de teste que passou." }
];
const OUTRO_LADO = [
    { speaker: "COSMO", text: "Do outro lado. Esse caminho não existia: foi o seu programa que construiu." }
];

export default class DepositoScene extends BaseRoomScene {
    constructor() {
        super("cap2-deposito", {
            title: "CAP. 2 :: DEPÓSITO",
            spawn: { x: 140, y: 420 },
            autoSave: false,
            music: null
        });
    }

    preload() {
        super.preload();
        Effects.preload(this);   // faíscas das caixas batendo/rachando
    }

    onRoomCreate() {
        Effects.createAnimations(this);

        const corredor = new CrateCorridor(this, {
            ...CORREDOR,
            tests: CORREDOR_PUZZLE.tests,
            field: "lado",
            labelOf: (given) => `${given.peso} kg`
        });
        const ponte = new CrateBridge(this, {
            ...PONTE,
            tests: PONTE_PUZZLE.tests,
            field: "destino",
            bridgeValue: "ponte",
            discardValue: "descarte",
            lookOf: (given) => ({ kind: given.aco ? "aco" : "papelao", tag: given.cheia ? "CHEIA" : "VAZIA" })
        });

        new PuzzleDevice(this, {
            ...TERMINAL_CORREDOR,
            label: "CORREDOR",
            puzzle: CORREDOR_PUZZLE,
            onRun: (results, done) => corredor.play(results, done),
            onSolved: () => this.playDialogue(CORREDOR_LIVRE)
        });
        new PuzzleDevice(this, {
            ...TERMINAL_PONTE,
            label: "PONTE",
            puzzle: PONTE_PUZZLE,
            onRun: (results, done) => ponte.play(results, done),
            onSolved: () => this.playDialogue(PONTE_PRONTA)
        });

        addServicePanel(this, {
            x: 110, y: 610, prompt: "[E] VOLTAR AOS TESTES", label: "LAB", color: 0x4ad6ff,
            onInteract: () => this.scene.start("cap2-laboratorio")
        });
        addServicePanel(this, {
            x: 1130, y: 420, prompt: "[E] REINICIAR SALA", label: "RESET", color: 0xffb347,
            onInteract: () => this.scene.restart()
        });

        this.reachedOtherSide = false;
        this.playDialogue(ENTRY_SCRIPT);
    }

    onRoomUpdate() {
        if (!this.reachedOtherSide && this.player.sprite.x > OUTRO_LADO_X) {
            this.reachedOtherSide = true;
            this.playDialogue(OUTRO_LADO);
        }
    }
}
