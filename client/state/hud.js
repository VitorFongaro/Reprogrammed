// Preferência de TAMANHO DO HUD (barra de HP, avisos de status, prompts [E],
// dicas do [R] e o HUD da batalha). Separada da legenda (state/subtitles.js):
// quem quer fala grande não necessariamente quer o HUD grande. Fica só no
// navegador; quem desenha HUD chama `hudPx(n)` no lugar de `"${n}px"`, e o valor
// vale a partir da próxima sala/batalha aberta.
//
// Só o HUD escala: os textos presos ao cenário (etiquetas de caixa, plaquinhas
// de canteiro, moldes) e os consoles de puzzle têm layout fixo e não mudam.

const STORAGE_KEY = "reprogrammed.hudSize";

export const HUD_SIZES = [
    { id: "normal", label: "NORMAL", scale: 1 },
    { id: "grande", label: "GRANDE", scale: 1.25 },
    { id: "maior", label: "MAIOR", scale: 1.5 }
];

let current = load();

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (HUD_SIZES.some((s) => s.id === raw)) {
            return raw;
        }
    } catch (error) {
        // Sem localStorage: default.
    }
    return "normal";
}

export function getHudSize() {
    return HUD_SIZES.find((s) => s.id === current);
}

export function setHudSize(id) {
    if (!HUD_SIZES.some((s) => s.id === id)) {
        return;
    }
    current = id;
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch (error) {
        // Vale só nesta sessão.
    }
}

export function hudScale() {
    return getHudSize().scale;
}

// Tamanho de fonte do HUD já escalado: hudPx(18) -> "18px" / "23px" / "27px".
export function hudPx(px) {
    return `${Math.round(px * hudScale())}px`;
}
