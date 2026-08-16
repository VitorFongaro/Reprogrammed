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

const API_BASE_URL = window.REPROGRAMMED_API_URL || "http://localhost:3000";
const AUTH_STORAGE_KEY = "reprogrammed.auth";
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

// --- Sessão ---

function getAuthData() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch (error) {
        return null;
    }
}

async function refreshSession() {
    const refreshToken = getAuthData()?.refreshToken;

    if (!refreshToken) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.error || "Sessão expirada. Faça login novamente.");
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken: data.session?.access_token || null,
        refreshToken: data.session?.refresh_token || null,
        user: data.user || null
    }));

    return data.session.access_token;
}

async function requestProgress(method, payload, allowRefresh = true) {
    const token = getAuthData()?.accessToken;

    if (!token) {
        throw new Error("Sessão não encontrada.");
    }

    const response = await fetch(`${API_BASE_URL}/game/progress`, {
        method,
        headers: {
            ...(payload ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`
        },
        ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    const data = await response.json().catch(() => null);

    if (response.status === 401 && allowRefresh) {
        await refreshSession();
        return requestProgress(method, payload, false);
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Reinicie o backend para carregar a rota de progresso.");
        }

        throw new Error(data?.error || "Não foi possível acessar o progresso.");
    }

    return data?.progress ?? null;
}

// --- API pública do save ---

// Grava o estado atual. O espelho local é escrito primeiro, para o save
// sobreviver mesmo se a API falhar; o retorno diz se o remoto entrou.
export async function save() {
    const data = snapshot();
    writeLocalSave({ ...data, savedAt: new Date().toISOString() });

    try {
        await requestProgress("PUT", data);
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
        data = await requestProgress("GET");
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

export function clearLocalSave() {
    try {
        localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch (error) {
        // Nada a fazer: sem localStorage não havia espelho para limpar.
    }
}
