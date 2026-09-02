// Volume dos efeitos sonoros (SFX). A OptionsScene edita e salva na API (junto
// com o volume de música); aqui fica um espelho em memória + localStorage para o
// jogo tocar os efeitos no volume certo SEM consultar a API a cada som (mesmo
// padrão desacoplado do inventário/HP). A OptionsScene sincroniza este valor ao
// carregar e ao mexer no slider de EFEITOS SONOROS.

const STORAGE_KEY = "reprogrammed.sfxVolume";
const DEFAULT = 0.8;   // = 80 no slider (0..100), o default da OptionsScene.

let sfxVolume = load();   // guardado normalizado em 0..1.

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
            const v = Number(raw);
            if (Number.isFinite(v) && v >= 0 && v <= 1) {
                return v;
            }
        }
    } catch (error) {
        // Sem localStorage (aba anônima/cota): usa o default em memória.
    }
    return DEFAULT;
}

// Recebe 0..100 (como a OptionsScene guarda) e normaliza para 0..1.
export function setSfxVolume(value0to100) {
    const v = Math.max(0, Math.min(100, Number(value0to100) || 0)) / 100;
    sfxVolume = v;
    try {
        localStorage.setItem(STORAGE_KEY, String(v));
    } catch (error) {
        // Sem localStorage: mantém só em memória nesta sessão.
    }
    return v;
}

export function getSfxVolume() {
    return sfxVolume;
}
