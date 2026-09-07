// Vitalidade da Artemis — UMA vida só, compartilhada entre exploração e combate.
//
// Regras do jogo (decisão de design):
//  - o HP é o MESMO dentro e fora de batalha (não há duas barras);
//  - persiste ao trocar de sala — passar de sala NÃO cura;
//  - o ÚNICO meio de cura são os ITENS (usáveis em qualquer contexto);
//  - a exceção é a troca de CAPÍTULO, que restaura o HP ao máximo.
//
// O HP faz parte do SAVE (ver state/progress.js): carregar um save devolve a vida
// que a Artemis tinha na hora de gravar. Antes ele vivia só no localStorage, e o
// resultado era salvar com 20, apanhar até 4 e voltar o save ainda com 4 — o save
// desfazia a sala e os puzzles, mas não o estrago.
//
// O localStorage continua aqui como ESPELHO DE SESSÃO: segura o HP num F5 no meio
// da jogatina, sem obrigar a passar pelo ponto de salvamento. Quem manda, ao
// carregar um save, é o save. Novo jogo (resetVitals) e troca de capítulo
// (fullHeal) restauram tudo.

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

// --- Ponte com o save (state/progress.js) ---

// Aplica o HP vindo de um save. `null`/inválido vira vida cheia: é o caso do save
// gravado ANTES de o HP entrar no save, e quem já tinha save não deve ser punido
// por isso. Zero também vira cheia — save com a Artemis morta seria um beco sem
// saída, já que a morte é reset de checkpoint e não fim de jogo.
export function applySavedHp(value) {
    const n = Math.round(Number(value));

    if (!Number.isFinite(n) || n <= 0 || n > MAX_HP) {
        return fullHeal();
    }

    return setHp(n);
}

// Adota o capítulo de uma cena SEM curar. É o que um load precisa: carregar um
// save do capítulo 2 estando no 1 não é progressão, é retomada — sem isto, o
// enterChapterScene logo em seguida veria "mudou de capítulo" e curaria por cima
// do HP que o save acabou de restaurar.
export function adoptChapter(sceneKey) {
    const match = /^cap\d+/.exec(sceneKey ?? "");
    lastChapter = match ? match[0] : null;
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
