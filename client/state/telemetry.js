// Telemetria de aprendizado — a entrada do sistema adaptativo.
//
// Cada abertura de console vira UMA tentativa: acertou ou não, quantas vezes
// errou dentro dela e quanto tempo levou. É com isso que o gerador de desafios
// decide o que propor depois.
//
// Diferente do save, isto NÃO é reversível: é gravado quando acontece e
// carregar um save nunca o desfaz (ver "Save" no AGENTS.md).
//
// Regra de ouro: telemetria nunca pode atrapalhar o jogo. Toda falha aqui é
// engolida — no máximo se perde um dado, jamais uma partida.

import { apiFetch } from "./api.js";

export function recordAttempt(puzzleId, { correct, errors = 0, seconds = 0 } = {}) {
    // Console sem id (batalha, reprogramação de inimigo) ainda não é medido.
    if (!puzzleId) {
        return;
    }

    apiFetch("/game/attempts", {
        method: "POST",
        body: {
            puzzle: puzzleId,
            correct: Boolean(correct),
            errors,
            seconds
        }
    }).catch((error) => {
        console.warn("[telemetria] tentativa não registrada:", error.message);
    });
}
