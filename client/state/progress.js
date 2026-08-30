// Progresso do jogador — o estado que sobrevive ao fechar o jogo.
//
// Modelo estilo Resident Evil: o que vale é o último SAVE. O jogador resolve
// puzzles à vontade, mas se sair sem passar pelo computador de salvamento, os
// puzzles resolvidos depois do último save voltam a ser pedidos.
//
// O que NÃO passa por aqui: tentativas, acertos e a dificuldade adaptativa da
// IA. Isso é registro de aprendizagem, é gravado no momento em que acontece e
// nunca é revertido por um load — senão o jogador zeraria a dificuldade só
// saindo e voltando do jogo.
//
// Grava em dois lugares: na API (fonte da verdade, por usuário) e no
// localStorage (espelho, para o jogo continuar salvando se o backend cair).

import { apiFetch } from "./api.js";

const SAVE_STORAGE_KEY = "reprogrammed.save";

// Onde um jogo novo começa (a intro leva para cá).
export const FIRST_SCENE = "cap1-porao";

// --- Estado da sessão (some ao dar F5; só o save é durável) ---
let currentScene = FIRST_SCENE;
let solved = new Set();

export function startNewGame() {
    currentScene = FIRST_SCENE;
    solved = new Set();
}

export function enterScene(sceneKey) {
    if (sceneKey) {
        currentScene = sceneKey;
    }
}

export function markSolved(puzzleId) {
    if (puzzleId) {
        solved.add(puzzleId);
    }
}

export function isSolved(puzzleId) {
    return Boolean(puzzleId) && solved.has(puzzleId);
}

export function snapshot() {
    return { scene: currentScene, solvedPuzzles: [...solved] };
}

export function applySnapshot(data) {
    currentScene = data?.scene || FIRST_SCENE;
    solved = new Set(Array.isArray(data?.solvedPuzzles) ? data.solvedPuzzles : []);
}

// --- Espelho local ---

function readLocalSave() {
    try {
        const raw = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY));
        return raw?.scene ? raw : null;
    } catch (error) {
        return null;
    }
}

function writeLocalSave(data) {
    try {
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        // Sem localStorage (aba anônima, cota cheia): o save remoto ainda vale.
    }
}

// --- API pública do save ---

// Grava o estado atual. O espelho local é escrito primeiro, para o save
// sobreviver mesmo se a API falhar; o retorno diz se o remoto entrou.
export async function save() {
    const data = snapshot();
    writeLocalSave({ ...data, savedAt: new Date().toISOString() });

    try {
        await apiFetch("/game/progress", { method: "PUT", body: data });
        return { ok: true, remote: true };
    } catch (error) {
        return { ok: true, remote: false, error: error.message };
    }
}

// Carrega o save e já aplica na sessão. Prefere o remoto; cai no local se a
// API não responder. Devolve null quando não há save nenhum.
export async function load() {
    let data = null;

    try {
        data = (await apiFetch("/game/progress"))?.progress ?? null;
    } catch (error) {
        data = null;
    }

    if (!data) {
        data = readLocalSave();
    }

    if (!data) {
        return null;
    }

    applySnapshot(data);
    return snapshot();
}

// Só olha o espelho local: é síncrono, e o menu precisa decidir na hora se
// mostra CONTINUAR. Um save remoto sem espelho local aparece assim que o
// jogador tenta continuar.
export function hasLocalSave() {
    return Boolean(readLocalSave());
}

// CONTINUAR do menu: carrega SÍNCRONO do espelho local e aplica na sessão. O menu
// só mostra CONTINUAR quando há save local (hasLocalSave), então este é o caminho
// certo — e evita travar esperando a API do Render (que dorme). Devolve o snapshot
// aplicado, ou null se não houver espelho local.
export function loadLocal() {
    const data = readLocalSave();
    if (!data) {
        return null;
    }
    applySnapshot(data);
    return snapshot();
}

// Zera o save: apaga no servidor e no espelho local, e devolve a sessão ao
// começo. NÃO toca no perfil de aprendizado — tentativas e dificuldade
// adaptativa são registro de aprendizagem, não estado de jogo.
export async function reset() {
    clearLocalSave();
    startNewGame();

    try {
        await apiFetch("/game/progress", { method: "DELETE" });
        return { ok: true, remote: true };
    } catch (error) {
        return { ok: true, remote: false, error: error.message };
    }
}

export function clearLocalSave() {
    try {
        localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch (error) {
        // Nada a fazer: sem localStorage não havia espelho para limpar.
    }
}
