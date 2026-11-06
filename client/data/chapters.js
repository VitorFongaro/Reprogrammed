// Capítulos do jogo, para a SELEÇÃO DE CAPÍTULOS do menu (GameScene).
//
// `number` é o contrato com o servidor (chapters.order_index). `start` é a sala
// onde o capítulo começa (é ela que vai para o save) e `intro`, a cena que toca
// antes, quando houver. `reward` é a MELHORIA que o boss final do capítulo
// larga: um capítulo escolhido no menu começa com as melhorias de todos os
// anteriores e nada mais (ver startInventory), como se o jogador tivesse
// acabado de chegar ali.
//
// Capítulo novo só entra aqui quando tiver começo e fim no fluxo do jogo.

export const CHAPTERS = [
    { number: 1, title: "SUBSOLO", topic: "VARIÁVEIS", start: "cap1-porao", intro: "intro-scene", reward: "cache" },
    { number: 2, title: "TÉRREO", topic: "CONDICIONAIS", start: "cap2-recepcao", reward: "chip-repeticoes" }
];

export function chapterDef(number) {
    return CHAPTERS.find((c) => c.number === number) ?? null;
}

// Inventário de quem começa o capítulo `number`: as melhorias dos anteriores.
export function startInventory(number) {
    return Object.fromEntries(CHAPTERS
        .filter((c) => c.number < number && c.reward)
        .map((c) => [c.reward, 1]));
}
