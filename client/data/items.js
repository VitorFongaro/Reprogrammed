// Catálogo de itens do jogo.
//
// Tudo é PEÇA DE COMPUTADOR de propósito: além de casar com a ficção da
// Elysium, o jogador sai sabendo o que cada peça faz de verdade — RAM guarda
// dado, dissipador tira calor, fonte alimenta o sistema. É ensino de graça,
// que é o objetivo do trabalho.
//
// Cada item descreve o efeito por METADADOS; a APLICAÇÃO fica com quem abre o
// inventário (sala ou batalha), porque "curar" mexe no HP daquele contexto.
// Na BATALHA, usar item CONSOME O TURNO (ver BattleScene.useBattleItem) — sem
// isso, dois itens de cura tornariam qualquer luta imperdível.
//
// `icon` é o nome do PNG em assets/sprites/itens/ (32x32, exibido em 2x).

export const CATEGORIES = {
    cura: { label: "CURA", color: 0x51e36b },
    reprogramacao: { label: "REPROGRAMAÇÃO", color: 0x4ad6ff },
    upgrade: { label: "UPGRADE", color: 0xffb347 },
    chave: { label: "CHAVE", color: 0xb14aff }
};

export const ITEMS = {
    // --- CURA: peças que remendam o chassi (MAX_HP = 20) ---
    "pente-ram": {
        id: "pente-ram",
        name: "Pente de RAM",
        icon: "pente-ram",
        category: "cura",
        description: "Memória volátil de sobra, reaproveitada como buffer de reparo. Restaura 6 de HP.",
        heal: 6,
        usableInBattle: true,
        usableInRoom: true,
        consumable: true
    },
    "memoria-ecc": {
        id: "memoria-ecc",
        name: "Memória ECC",
        icon: "memoria-ecc",
        category: "cura",
        description: "Memória que corrige o próprio erro. Restaura 12 de HP.",
        heal: 12,
        usableInBattle: true,
        usableInRoom: true,
        consumable: true
    },
    "pasta-termica": {
        id: "pasta-termica",
        name: "Pasta térmica",
        icon: "pasta-termica",
        category: "cura",
        description: "Reassenta o dissipador do núcleo. Restaura 8 de HP, mas exige tempo parada — só fora de combate.",
        heal: 8,
        usableInBattle: false,
        usableInRoom: true,
        consumable: true
    },
    "fonte-alimentacao": {
        id: "fonte-alimentacao",
        name: "Fonte de alimentação",
        icon: "fonte-alimentacao",
        category: "cura",
        description: "Fonte inteira, arrancada de um servidor morto. Restaura TODO o HP. Raríssima.",
        heal: 999,
        usableInBattle: true,
        usableInRoom: true,
        consumable: true
    },

    // --- COMBATE ---
    overclock: {
        id: "overclock",
        name: "Overclock",
        icon: "overclock",
        category: "reprogramacao",
        description: "Força o clock do núcleo além do seguro: o PRÓXIMO ataque causa o dobro de dano.",
        battleEffect: "dobrarAtaque",
        usableInBattle: true,
        usableInRoom: false,
        consumable: true
    },
    dissipador: {
        id: "dissipador",
        name: "Dissipador",
        icon: "dissipador",
        category: "reprogramacao",
        description: "Aletas de cobre que absorvem o impacto: o próximo turno do inimigo causa metade do dano.",
        battleEffect: "reduzirDano",
        usableInBattle: true,
        usableInRoom: false,
        consumable: true
    },
    cache: {
        id: "cache",
        name: "Cache",
        icon: "cache",
        category: "reprogramacao",
        description: "Memória de acesso rápido que alivia a sobrecarga: libera MAIS UMA reprogramação neste embate.",
        battleEffect: "maisUmaReprogramacao",
        usableInBattle: true,
        usableInRoom: false,
        consumable: true
    },

    // --- UPGRADES: o que a Artemis APRENDE, um por capítulo ---
    "chip-condicional": {
        id: "chip-condicional",
        name: "Chip lógico :: condicionais",
        icon: "chip-condicional",
        category: "upgrade",
        description: "Ensina a Artemis a decidir: se isto, então aquilo. Melhoria permanente do capítulo 2.",
        usableInBattle: false,
        usableInRoom: false,
        consumable: false
    },
    "chip-repeticoes": {
        id: "chip-repeticoes",
        name: "Chip lógico :: repetições",
        icon: "chip-repeticoes",
        category: "upgrade",
        description: "Ensina a Artemis a repetir uma ação sem reescrevê-la. Melhoria permanente do capítulo 3.",
        usableInBattle: false,
        usableInRoom: false,
        consumable: false
    },
    "chip-funcoes": {
        id: "chip-funcoes",
        name: "Chip lógico :: funções",
        icon: "chip-funcoes",
        category: "upgrade",
        description: "Ensina a Artemis a guardar um trecho de código e chamá-lo pelo nome. Melhoria permanente do capítulo 4.",
        usableInBattle: false,
        usableInRoom: false,
        consumable: false
    },

    // --- CHAVE ---
    "setor-corrompido": {
        id: "setor-corrompido",
        name: "Setor de disco corrompido",
        icon: "setor-corrompido",
        category: "chave",
        description: "Um pedaço de disco que a ADA não conseguiu apagar por inteiro. Ainda dá para ler o que sobrou.",
        usableInBattle: false,
        usableInRoom: false,
        consumable: false
    }
};

export function itemDef(id) {
    return ITEMS[id] ?? null;
}
