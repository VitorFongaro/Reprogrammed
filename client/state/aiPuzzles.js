// Puzzles GERADOS POR IA: pede ao servidor (POST /ai/puzzle), que monta o
// pedido ao Gemini a partir do perfil de aprendizado do jogador, confere o
// puzzle executando todas as montagens e só então devolve.
//
// Mesma regra de ouro da telemetria: a IA nunca pode travar o jogo. Esta função
// SEMPRE resolve com um puzzle — o da IA, ou o do gerador local da mesma ficha
// (`fallback`) se a API cair, demorar ou recusar. O campo `source` diz qual
// veio ("ai" ou "local"); o console mostra a marca só no primeiro.

import { apiFetch } from "./api.js";

// O servidor desiste em ~16 s (ele tenta outros modelos quando o Gemini está
// lotado). Aqui, um pouco mais: chegar atrasado com puzzle bom ainda vale.
const TIMEOUT_MS = 20000;

export function requestAiPuzzle(slug, fallback, { timeoutMs = TIMEOUT_MS } = {}) {
    const local = () => ({ ...fallback(), source: "local" });

    const request = apiFetch("/ai/puzzle", { method: "POST", body: { slug } })
        .then((data) => {
            if (!data?.puzzle?.lines) {
                throw new Error("resposta sem puzzle");
            }
            console.info(`[ia] ${slug}: ${data.difficulty} por ${data.model} em ${data.latencyMs} ms`);
            return { ...data.puzzle, source: "ai" };
        });

    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("tempo esgotado")), timeoutMs);
    });

    return Promise.race([request, timeout]).catch((error) => {
        console.warn(`[ia] ${slug}: usando o gerador local (${error.message})`);
        return local();
    });
}
