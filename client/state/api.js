// Camada única de conversa com a API do jogo.
//
// Existe porque a lógica de token + refresh já estava duplicada em mais de um
// lugar, e cada cópia nova é uma chance de alguém corrigir só uma delas.
// Quem fala com a API passa por aqui.

import { API_BASE_URL } from "../config.js";

const AUTH_STORAGE_KEY = "reprogrammed.auth";

export function getAuthData() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch (error) {
        return null;
    }
}

function saveAuthData(data) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken: data.session?.access_token || null,
        refreshToken: data.session?.refresh_token || null,
        user: data.user || null
    }));
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

    saveAuthData(data);
    return data.session.access_token;
}

// Chama a API com o token do jogador. Um 401 tenta renovar a sessão UMA vez
// antes de desistir. Devolve o corpo já em JSON; erro vira exceção.
export async function apiFetch(path, { method = "GET", body, allowRefresh = true } = {}) {
    const token = getAuthData()?.accessToken;

    if (!token) {
        throw new Error("Sessão não encontrada.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => null);

    if (response.status === 401 && allowRefresh) {
        await refreshSession();
        return apiFetch(path, { method, body, allowRefresh: false });
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Reinicie o backend: a rota ${path} não existe nele.`);
        }

        throw new Error(data?.error || `Falha ao acessar ${path}.`);
    }

    return data;
}
