// Volumes de ÁUDIO (efeitos e música). A OptionsScene edita e salva na API; aqui
// fica um espelho em memória + localStorage para o jogo tocar no volume certo SEM
// consultar a API a cada som (mesmo padrão desacoplado do inventário/HP). A
// OptionsScene sincroniza os dois ao carregar e ao mexer nos sliders.

const SFX_KEY = "reprogrammed.sfxVolume";
const MUSIC_KEY = "reprogrammed.musicVolume";
const DEFAULT = 0.8;   // = 80 nos sliders (0..100), o default da OptionsScene.

let sfxVolume = load(SFX_KEY);      // guardados normalizados em 0..1.
let musicVolume = load(MUSIC_KEY);

function load(key) {
    try {
        const raw = localStorage.getItem(key);
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
function persist(key, value0to100) {
    const v = Math.max(0, Math.min(100, Number(value0to100) || 0)) / 100;
    try {
        localStorage.setItem(key, String(v));
    } catch (error) {
        // Sem localStorage: mantém só em memória nesta sessão.
    }
    return v;
}

export function setSfxVolume(value0to100) {
    sfxVolume = persist(SFX_KEY, value0to100);
    return sfxVolume;
}

export function getSfxVolume() {
    return sfxVolume;
}

export function setMusicVolume(value0to100) {
    musicVolume = persist(MUSIC_KEY, value0to100);
    return musicVolume;
}

export function getMusicVolume() {
    return musicVolume;
}
