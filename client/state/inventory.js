// Inventário do jogador — itens coletados (id -> quantidade). Simples e, por ora,
// DESACOPLADO do save do servidor: espelha só no localStorage, para sobreviver ao
// F5 sem exigir mudança de schema no backend. Dá para integrar ao save
// (progress.js) depois — lembrando a regra do projeto: itens de save são
// REVERSÍVEIS, mas upgrades permanentes de fim de capítulo talvez pertençam ao
// perfil monotônico de aprendizagem (decisão futura).

import { ITEMS, itemDef } from "../data/items.js";

const STORAGE_KEY = "reprogrammed.inventory";

let counts = {};

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    } catch (error) {
        // Sem localStorage (aba anônima/cota): mantém em memória nesta sessão.
    }
}

// Carrega do localStorage. Começa VAZIO — os itens entram por coleta no mundo
// (addItem), ainda a implementar.
export function loadInventory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        counts = raw ? JSON.parse(raw) : {};
        if (!counts || typeof counts !== "object") counts = {};
    } catch (error) {
        counts = {};
    }
    return counts;
}

export function resetInventory() {
    counts = {};
    persist();
}

export function addItem(id, n = 1) {
    if (!itemDef(id)) return;
    counts[id] = (counts[id] ?? 0) + n;
    persist();
}

export function removeItem(id, n = 1) {
    if (!counts[id]) return;
    counts[id] = Math.max(0, counts[id] - n);
    if (counts[id] === 0) delete counts[id];
    persist();
}

export function countOf(id) {
    return counts[id] ?? 0;
}

export function hasItem(id) {
    return countOf(id) > 0;
}

// Itens possuídos, na ordem do catálogo, cada um com a def + quantidade.
export function ownedItems() {
    return Object.keys(ITEMS)
        .filter((id) => counts[id] > 0)
        .map((id) => ({ ...itemDef(id), count: counts[id] }));
}
