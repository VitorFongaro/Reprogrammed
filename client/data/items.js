// Catálogo de itens do jogo. Os itens ainda NÃO estão fechados — este é um
// conjunto inicial que exercita as 3 categorias que a Artemis vai usar (cura,
// reprogramação, upgrade) e serve de molde. Cada item descreve o efeito por
// METADADOS; a APLICAÇÃO do efeito fica com quem abre o inventário (a sala ou a
// batalha), porque "curar" mexe no HP daquele contexto.
//
// Como adicionar um item: crie uma entrada em ITEMS com id único, categoria,
// nome, descrição e as flags de uso. Ícone é procedural por categoria (ver
// InventoryScene.createIcons); quando houver arte própria, é só trocar por uma
// textura.

export const CATEGORIES = {
    cura: { label: "CURA", color: 0x51e36b },
    reprogramacao: { label: "REPROGRAMAÇÃO", color: 0x4ad6ff },
    upgrade: { label: "UPGRADE", color: 0xffb347 },
    chave: { label: "CHAVE", color: 0xb14aff }
};

export const ITEMS = {
    nanogel: {
        id: "nanogel",
        name: "Nanogel de reparo",
        category: "cura",
        description: "Selante de nanobots que remenda o chassi. Restaura 8 de HP — na batalha ou explorando.",
        heal: 8,
        usableInBattle: true,
        usableInRoom: true,
        consumable: true
    },
    "celula-energia": {
        id: "celula-energia",
        name: "Célula de energia",
        category: "cura",
        description: "Carga de emergência. Restaura 15 de HP de uma vez.",
        heal: 15,
        usableInBattle: true,
        usableInRoom: true,
        consumable: true
    },
    "modulo-sobrecarga": {
        id: "modulo-sobrecarga",
        name: "Módulo de sobrecarga",
        category: "reprogramacao",
        description: "Injeta ganho no próximo hack: a reprogramação vem mais forte. (efeito em desenvolvimento)",
        usableInBattle: true,
        usableInRoom: false,
        consumable: true
    },
    "chip-condicional": {
        id: "chip-condicional",
        name: "Chip lógico :: condicionais",
        category: "upgrade",
        description: "Recompensa de capítulo: ensina a Artemis a usar condicionais (if/else). Melhoria permanente.",
        usableInBattle: false,
        usableInRoom: false,
        consumable: false
    }
};

export function itemDef(id) {
    return ITEMS[id] ?? null;
}
