// Inventário do jogador — itens coletados (id -> quantidade).
//
// Faz parte do SAVE: `snapshot`/`apply` são lidos e escritos por state/progress.js,
// então carregar um save devolve os itens que o jogador tinha no momento em que
// gravou. Item é estado de JOGO (reversível), não registro de aprendizagem.
//
// O localStorage continua aqui, mas como ESPELHO DE SESSÃO: mantém o inventário
// de pé num F5 no meio da jogatina, sem obrigar a passar pelo computador de
// salvamento. Quem manda, ao carregar um save, é o save.
//
// Ressalva para o futuro: os itens de categoria `upgrade` (os chips lógicos de
// fim de capítulo) são melhorias PERMANENTES. Quando eles passarem a ser
// distribuídos de verdade, provavelmente pertencem ao perfil monotônico e não ao
// save — senão um load os desfaz.

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

// Carrega o espelho de sessão do localStorage. Começa VAZIO; o save sobrescreve
// isto quando o jogador dá CONTINUAR.
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

// --- Ponte com o save (state/progress.js) ---

// Cópia rasa do mapa { id: quantidade }, para entrar no snapshot do save.
export function snapshotInventory() {
    return { ...counts };
}

// Substitui o inventário pelo do save. Ids que não existem mais no catálogo são
// descartados: renomear um item não deve quebrar o save de ninguém.
export function applyInventory(data) {
    counts = {};

    if (data && typeof data === "object") {
        Object.entries(data).forEach(([id, quantity]) => {
            const n = Math.round(Number(quantity));
            if (itemDef(id) && Number.isFinite(n) && n > 0) {
                counts[id] = n;
            }
        });
    }

    persist();
    return counts;
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
