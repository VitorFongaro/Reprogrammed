// Vitalidade da Artemis — UMA vida só, compartilhada entre exploração e combate.
//
// Regras do jogo (decisão de design):
//  - o HP é o MESMO dentro e fora de batalha (não há duas barras);
//  - persiste ao trocar de sala — passar de sala NÃO cura;
//  - o ÚNICO meio de cura são os ITENS (usáveis em qualquer contexto);
//  - a exceção é a troca de CAPÍTULO, que restaura o HP ao máximo.
//
// Espelha no localStorage (como o inventário: desacoplado do save do servidor por
// ora), então o HP SOBREVIVE ao recarregar a página — a Artemis volta com a mesma
// vida com que estava. Novo jogo (resetVitals) e troca de capítulo (fullHeal)
// restauram tudo.

export const MAX_HP = 20;

const STORAGE_KEY = "reprogrammed.vitals";

let hp = loadHp();
let lastChapter = null;

function loadHp() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const value = raw?.hp;
        if (typeof value === "number" && value >= 0 && value <= MAX_HP) {
            return Math.round(value);
        }
    } catch (error) {
        // Sem localStorage (aba anônima/cota): começa cheia, só em memória.
    }
    return MAX_HP;
}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ hp }));
    } catch (error) {
        // Sem localStorage: mantém em memória nesta sessão.
    }
}

export function getMaxHp() {
    return MAX_HP;
}

export function getHp() {
    return hp;
}

function clamp(value) {
    return Math.max(0, Math.min(MAX_HP, Math.round(value)));
}

export function setHp(value) {
    hp = clamp(value);
    persist();
    return hp;
}

export function damage(amount) {
    return setHp(hp - amount);
}

export function heal(amount) {
    return setHp(hp + amount);
}

export function isFull() {
    return hp >= MAX_HP;
}

// Restaura tudo. Usado na troca de capítulo e como reset de "derrota" (respawn).
export function fullHeal() {
    hp = MAX_HP;
    persist();
    return hp;
}

// Novo jogo: HP cheio e esquece o capítulo corrente (o controle de troca de
// capítulo recomeça do zero).
export function resetVitals() {
    hp = MAX_HP;
    lastChapter = null;
    persist();
}

// Chamado ao ENTRAR numa sala. Se o CAPÍTULO mudou desde a última sala, cura por
// completo. O capítulo vem do prefixo da chave da cena ("cap1-porao" -> "cap1");
// cenas sem capítulo (menu, intro) não alteram o controle.
export function enterChapterScene(sceneKey) {
    const match = /^cap\d+/.exec(sceneKey ?? "");
    if (!match) {
        return;
    }
    const chapter = match[0];
    if (lastChapter && chapter !== lastChapter) {
        fullHeal();
    }
    lastChapter = chapter;
}
