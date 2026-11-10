// Preferências de LEGENDA (as falas da DialogueBox): velocidade da máquina de
// escrever e tamanho do texto. Ficam só no navegador (localStorage), como um
// ajuste de leitura de quem está jogando; a OptionsScene edita e a DialogueBox lê
// a cada roteiro novo, então a mudança vale já na próxima fala.

const STORAGE_KEY = "reprogrammed.subtitles";

// `delay` = ms por letra (0 = a fala inteira aparece de uma vez).
export const SUBTITLE_SPEEDS = [
    { id: "lenta", label: "LENTA", delay: 55 },
    { id: "normal", label: "NORMAL", delay: 32 },
    { id: "rapida", label: "RÁPIDA", delay: 14 },
    { id: "instantanea", label: "INSTANTÂNEA", delay: 0 }
];

// `body`/`speaker` = tamanho da fonte; `boxH` = altura da caixa (cresce para
// cima, a base fica no mesmo lugar), para duas linhas grandes ainda caberem.
export const SUBTITLE_SIZES = [
    { id: "pequeno", label: "PEQUENO", body: 18, speaker: 17, boxH: 84 },
    { id: "medio", label: "MÉDIO", body: 22, speaker: 20, boxH: 96 },
    { id: "grande", label: "GRANDE", body: 28, speaker: 24, boxH: 128 }
];

const DEFAULTS = { speed: "normal", size: "medio" };

let prefs = load();

function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return {
            speed: SUBTITLE_SPEEDS.some((s) => s.id === raw?.speed) ? raw.speed : DEFAULTS.speed,
            size: SUBTITLE_SIZES.some((s) => s.id === raw?.size) ? raw.size : DEFAULTS.size
        };
    } catch (error) {
        return { ...DEFAULTS };
    }
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
        // Sem localStorage: vale só nesta sessão.
    }
}

export function getSubtitleSpeed() {
    return SUBTITLE_SPEEDS.find((s) => s.id === prefs.speed);
}

export function getSubtitleSize() {
    return SUBTITLE_SIZES.find((s) => s.id === prefs.size);
}

export function setSubtitleSpeed(id) {
    if (SUBTITLE_SPEEDS.some((s) => s.id === id)) {
        prefs = { ...prefs, speed: id };
        persist();
    }
}

export function setSubtitleSize(id) {
    if (SUBTITLE_SIZES.some((s) => s.id === id)) {
        prefs = { ...prefs, size: id };
        persist();
    }
}
