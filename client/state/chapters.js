// Capítulos CONCLUÍDOS: o que libera a seleção de capítulos do menu.
//
// É MONOTÔNICO, como o perfil de aprendizagem, e por isso não mora no save:
// carregar um save antigo ou zerar o progresso nunca tranca um capítulo de
// novo. Fonte da verdade no servidor (user_chapter_progress, GET/POST
// /game/chapters), com espelho no localStorage para o menu decidir na hora e
// para o registro não se perder com o Render dormindo — o que ficou só aqui é
// reenviado na próxima sincronização.

import { apiFetch, getAuthData } from "./api.js";

// Um espelho POR CONTA: como a sincronização reenvia ao servidor o que só
// existe aqui, um espelho compartilhado passaria os capítulos de um jogador
// para o próximo que entrasse no mesmo navegador.
const storageKey = () => `reprogrammed.chapters.${getAuthData()?.user?.id ?? "anon"}`;

function readLocal() {
    try {
        const list = JSON.parse(localStorage.getItem(storageKey()));
        return Array.isArray(list) ? list.filter(Number.isInteger) : [];
    } catch (error) {
        return [];
    }
}

function writeLocal(list) {
    try {
        localStorage.setItem(storageKey(), JSON.stringify(list));
    } catch (error) {
        // Sem localStorage: o servidor ainda guarda.
    }
}

const union = (...lists) => [...new Set(lists.flat())].sort((a, b) => a - b);

// Síncrono, do espelho local: é o que o menu usa para desenhar.
export function completedChapters() {
    return readLocal();
}

export function isChapterCompleted(number) {
    return readLocal().includes(number);
}

// Fim de capítulo. Fogo e esquece: grava aqui na hora e tenta o servidor.
export function markChapterCompleted(number) {
    writeLocal(union(readLocal(), [number]));
    apiFetch("/game/chapters", { method: "POST", body: { chapter: number } }).catch(() => {});
}

// Quem jogou antes da seleção de capítulos existir não tem registro: se o
// save está no capítulo N, os anteriores foram vencidos.
export function backfillFromScene(sceneKey) {
    const match = /^cap(\d+)-/.exec(sceneKey ?? "");
    const current = match ? Number(match[1]) : 0;
    const before = Array.from({ length: Math.max(0, current - 1) }, (_, i) => i + 1);
    const local = readLocal();
    if (before.some((n) => !local.includes(n))) {
        writeLocal(union(local, before));
    }
}

// Junta o servidor com o espelho local (nenhum dos dois perde nada) e reenvia
// o que só existia aqui. Devolve a lista final; sem API, a local.
export async function syncChapters() {
    const local = readLocal();
    let remote;
    try {
        remote = (await apiFetch("/game/chapters"))?.chapters ?? [];
    } catch (error) {
        return local;
    }
    local.filter((n) => !remote.includes(n)).forEach((n) => {
        apiFetch("/game/chapters", { method: "POST", body: { chapter: n } }).catch(() => {});
    });
    const all = union(local, remote);
    writeLocal(all);
    return all;
}
