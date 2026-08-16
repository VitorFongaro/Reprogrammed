import { API_BASE_URL } from '../config.js';

const AUTH_STORAGE_KEY = 'reprogrammed.auth';

const sidebarActions = document.querySelectorAll('.sidebar-action[data-panel]');
const logoutButton = document.getElementById('logout-button');
const contentFrameTitle = document.getElementById('content-frame-title');
const playButton = document.querySelector('.play-button');

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

setActivePanel('progress');
