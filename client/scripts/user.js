import { API_BASE_URL } from '../config.js';
import { load as loadProgress, reset as resetProgress } from '../state/progress.js';

const AUTH_STORAGE_KEY = 'reprogrammed.auth';

const sidebarActions = document.querySelectorAll('.sidebar-action[data-panel]');
const logoutButton = document.getElementById('logout-button');
const contentFrameTitle = document.getElementById('content-frame-title');
const playButton = document.querySelector('.play-button');
const panelProgress = document.getElementById('panel-progress');
const saveScene = document.getElementById('save-scene');
const saveDate = document.getElementById('save-date');
const resetIdle = document.getElementById('reset-idle');
const resetConfirm = document.getElementById('reset-confirm');
const resetResult = document.getElementById('reset-result');
const resetButton = document.getElementById('reset-button');
const resetYes = document.getElementById('reset-yes');
const resetNo = document.getElementById('reset-no');

// Nome legível de cada cena, para o painel não mostrar a chave crua do Phaser.
const SCENE_NAMES = {
    'cap1-porao': 'Capítulo 1 — Porão',
    'cap1-arquivos': 'Capítulo 1 — Sala de Arquivos',
    'cap1-controle': 'Capítulo 1 — Controle Ambiental',
    'cap1-treinamento': 'Capítulo 1 — Sala de Treinamento',
    'cap1-sentinela': 'Capítulo 1 — Arena da Sentinela',
    'cap1-seguranca': 'Capítulo 1 — Sala de Segurança',
    'cap1-corredor': 'Capítulo 1 — Corredor',
    'cap1-saguao': 'Capítulo 1 — Saguão'
};

const panelTitles = {
    progress: 'ARQUIVO / PROGRESSO',
    settings: 'ARQUIVO / CONFIGURAÇÕES'
};

const getAuthData = () => {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
};

const setActivePanel = (panelName) => {
    sidebarActions.forEach((button) => {
        button.classList.toggle('active', button.dataset.panel === panelName);
    });

    contentFrameTitle.textContent = panelTitles[panelName] || panelTitles.progress;
    panelProgress.hidden = panelName !== 'progress';
};

const renderSave = (progress) => {
    if (!progress) {
        saveScene.textContent = '> nenhum save encontrado — o jogo começa do início';
        saveDate.textContent = '';
        resetIdle.hidden = true;
        return;
    }

    saveScene.textContent = `> ${SCENE_NAMES[progress.scene] || progress.scene}`;
    saveDate.textContent = progress.savedAt
        ? `salvo em ${new Date(progress.savedAt).toLocaleString('pt-BR')}`
        : '';
    resetIdle.hidden = false;
};

const carregarProgresso = async () => {
    if (!isLoggedIn()) {
        saveScene.textContent = '> faça login para ver o seu progresso';
        resetIdle.hidden = true;
        return;
    }

    try {
        renderSave(await loadProgress());
    } catch (error) {
        saveScene.textContent = '> não foi possível ler o progresso';
        saveDate.textContent = error.message;
    }
};

// Confirmação em dois passos: apagar o save é definitivo, então não sai num
// clique só nem atrás de um confirm() do navegador, que ninguém lê.
const pedirConfirmacao = (mostrar) => {
    resetIdle.hidden = mostrar;
    resetConfirm.hidden = !mostrar;
    resetResult.hidden = true;
};

const zerarProgresso = async () => {
    resetYes.disabled = true;
    resetNo.disabled = true;

    const resultado = await resetProgress();

    resetConfirm.hidden = true;
    resetResult.hidden = false;
    resetResult.textContent = resultado.remote
        ? '> progresso apagado. O jogo recomeça do início.'
        : `> apagado nesta máquina, mas o servidor não respondeu (${resultado.error}).`;
    resetResult.className = resultado.remote ? 'panel-line' : 'panel-line panel-warn';

    resetYes.disabled = false;
    resetNo.disabled = false;
    await carregarProgresso();
};

const isLoggedIn = () => Boolean(getAuthData()?.accessToken);

const requireLoginToPlay = (event) => {
    if (isLoggedIn()) {
        return;
    }

    event.preventDefault();
    alert('Faça login para jogar.');
};

const logout = async () => {
    const token = getAuthData()?.accessToken;

    logoutButton.disabled = true;

    if (token) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        } catch (error) {
            console.warn('Não foi possível encerrar a sessão no servidor.', error);
        }
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = '../index.html';
};

sidebarActions.forEach((button) => {
    button.addEventListener('click', () => {
        setActivePanel(button.dataset.panel);
    });
});

logoutButton.addEventListener('click', logout);
playButton.addEventListener('click', requireLoginToPlay);

resetButton.addEventListener('click', () => pedirConfirmacao(true));
resetNo.addEventListener('click', () => pedirConfirmacao(false));
resetYes.addEventListener('click', zerarProgresso);

setActivePanel('progress');
carregarProgresso();
