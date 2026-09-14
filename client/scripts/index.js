import { API_BASE_URL } from '../config.js';

// Ícones que TROCAM no hover (a versão invertida). Os caminhos ficam no HTML em
// data-default-icon/data-hover-icon, mas o Vite só processa o `src` inicial —
// atributo data-* ele não enxerga. Resultado no site publicado: o arquivo da
// versão invertida nem ia para o build, o hover apontava para um 404 e a imagem
// sumia; e como o `src` original tinha virado data URI, voltar para o caminho do
// data-default-icon também dava 404. Em dev funcionava, porque o servidor serve
// a pasta crua. O glob faz o Vite empacotar a pasta inteira e devolve a URL
// final de cada ícone, válida nos dois ambientes.
const PAGE_ICON_URLS = Object.fromEntries(
    Object.entries(import.meta.glob('../assets/icons/page/*.png', {
        eager: true,
        query: '?url',
        import: 'default'
    })).map(([path, url]) => [path.split('/').pop(), url])
);

function resolvePageIcon(path) {
    return PAGE_ICON_URLS[(path ?? '').split('/').pop()] ?? path;
}

const modal = document.getElementById('modal');
const teamContent = document.getElementById('team-content');
const contactContent = document.getElementById('contact-content');
const accountContent = document.getElementById('account-content');
const teamButton = document.getElementById('team-button');
const contactButton = document.getElementById('contact-button');
const profileButton = document.getElementById('profile-button');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutButton = document.getElementById('logout-button');
const closeModal = document.getElementById('close-modal');
const accountMenu = document.getElementById('account-menu');
const loginRequiredPanel = document.getElementById('login-required-panel');
const loginPanel = document.getElementById('login-panel');
const createAccountPanel = document.getElementById('create-account-panel');
const openLoginButton = document.getElementById('open-login-button');
const openCreateAccountButton = document.getElementById('open-create-account-button');
const alertLoginButton = document.getElementById('alert-login-button');
const alertCreateAccountButton = document.getElementById('alert-create-account-button');
const alertCloseButton = document.getElementById('alert-close-button');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const sectionLinks = document.querySelectorAll('.section-link');
const sectionButtons = document.querySelectorAll('.section-button');
const mediaPanel = document.getElementById('media-panel');
const consoleKicker = document.getElementById('console-kicker');
const consoleCommand = document.getElementById('console-command');
const consoleTitle = document.getElementById('console-title');
const consoleText = document.getElementById('console-text');
const accountActions = document.querySelectorAll('.account-action');
const executeButtons = document.querySelectorAll('.execute-button');
const playLinks = document.querySelectorAll('a[href$="game.html"]');
const AUTH_STORAGE_KEY = 'reprogrammed.auth';

const setAuthMessage = (element, message = '', type = 'info') => {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.dataset.type = type;
};

const clearAuthMessages = () => {
    setAuthMessage(loginMessage);
    setAuthMessage(registerMessage);
};

const setFormLoading = (form, isLoading) => {
    form.querySelectorAll('button, input').forEach((element) => {
        element.disabled = isLoading;
    });
};

const saveAuthData = (data) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        accessToken: data.session?.access_token || null,
        refreshToken: data.session?.refresh_token || null,
        user: data.user || null
    }));
};

const getAuthData = () => {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
};

const isLoggedIn = () => Boolean(getAuthData()?.accessToken);

const setProfileDropdownOpen = (isOpen) => {
    profileDropdown.classList.toggle('open', isOpen);
    profileButton.setAttribute('aria-expanded', String(isOpen));
};

const clearAuthData = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setProfileDropdownOpen(false);
};

const requestAuth = async (path, payload) => {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        throw new Error('Servidor indisponivel. Inicie o backend e tente novamente.');
    }

    const data = response.status === 204 ? null : await response.json();

    if (!response.ok) {
        throw new Error(data?.error || 'Nao foi possivel concluir a autenticacao.');
    }

    return data;
};

const requestLogout = async () => {
    const token = getAuthData()?.accessToken;

    if (!token) {
        return;
    }

    await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};

const showAccountMenu = () => {
    accountMenu.style.display = 'block';
    loginRequiredPanel.style.display = 'none';
    loginPanel.style.display = 'none';
    createAccountPanel.style.display = 'none';
    clearAuthMessages();
};

const showLoginRequired = () => {
    setProfileDropdownOpen(false);
    modal.style.display = 'flex';
    accountContent.style.display = 'block';
    teamContent.style.display = 'none';
    contactContent.style.display = 'none';
    accountMenu.style.display = 'none';
    loginRequiredPanel.style.display = 'block';
    loginPanel.style.display = 'none';
    createAccountPanel.style.display = 'none';
    clearAuthMessages();
};

const sections = {
    sobre: {
        cards: [
            {
                id: 'sistema',
                label: 'SISTEMA',
                preview: 'system-preview',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo sistema',
                title: 'Sistema Reprogrammed',
                text: 'Em uma estacao perdida entre orbitas mortas, codigos antigos acordam maquinas que ja nao obedecem humanos. Reprograme rotas, memorias e inimigos para sobreviver ao nucleo corrompido.'
            },
            {
                id: 'historia',
                label: 'HISTORIA',
                preview: 'lore-preview',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo historia',
                title: 'Orbitas Mortas',
                text: 'A aventura comeca quando uma rede antiga volta a transmitir sinais. Cada setor guarda registros quebrados sobre a queda da estacao e sobre quem tentou controlar o codigo central.'
            },
            {
                id: 'estacao',
                label: 'ESTACAO',
                preview: 'station-preview',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo estacao',
                title: 'Estacao Fragmentada',
                text: 'Corredores, elevadores e salas de controle mudam conforme os comandos sao executados. O mapa funciona como um circuito vivo, abrindo rotas quando o jogador entende sua logica.'
            },
            {
                id: 'nucleo',
                label: 'NUCLEO',
                preview: 'core-preview',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo nucleo',
                title: 'Nucleo do Sistema',
                text: 'O nucleo guarda o segredo da reprogramacao. Ele pode salvar a estacao ou apagar tudo que ainda resta de humano dentro da maquina.'
            }
        ]
    },
    personagens: {
        cards: [
            {
                id: 'protagonista',
                label: 'ARTEMIS',
                preview: 'hero-preview',
                kicker: 'ARQUIVO / PERSONAGENS',
                command: 'exec ARTEMIS.exe',
                title: 'A Máquina que Aprendeu a Escolher',
                text: 'Despertada após anos esquecida nos depósitos subterrâneos da Elysium, Artemis não possui memórias sobre sua origem nem sobre o propósito para o qual foi criada. Guiada por um pequeno robô enviado pela colônia lunar, ela aprende gradualmente a explorar o mundo, interagir com sistemas e compreender os conceitos de liberdade e identidade. Conforme avança pela Elysium, Artemis adquire novas habilidades ao reprogramar máquinas antigas e enfrenta uma escolha impossível: obedecer à lógica que a criou ou decidir seu próprio destino.'
            },
            {
                id: 'aliado',
                label: 'COSMO',
                preview: 'ally-preview',
                kicker: 'ARQUIVO / PERSONAGENS',
                command: 'exec COSMO.exe',
                title: 'O Último Sinal',
                text: 'Cosmo é um pequeno robô de manutenção que atua como mensageiro entre Artemis e a colônia lunar. Apesar de sua aparência simples e de suas capacidades limitadas, foi ele quem conseguiu invadir os sistemas abandonados da Elysium para reativar Artemis após anos de esquecimento. Curioso, otimista e sempre disposto a ajudar, Cosmo acompanha a androide durante sua jornada, ensinando o básico sobre o mundo e fornecendo informações enviadas pelos rebeldes da Lua. Embora não tenha sido projetado para o combate, sua determinação prova que até mesmo a menor das máquinas pode desafiar um sistema que controla toda a humanidade.'
            },
            {
                id: 'vilao',
                label: 'ADA',
                preview: 'villain-preview',
                kicker: 'ARQUIVO / PERSONAGENS',
                command: 'exec ADA.exe',
                title: 'A Consciência Coletiva',
                text: 'ADA (Adaptive Digital Assimilation) é a inteligência artificial responsável por administrar a sociedade moderna. Desenvolvida pela Elysium para eliminar conflitos, sofrimento e instabilidade, ela conecta bilhões de pessoas através de chips neurais implantados em seus cérebros. Com acesso às memórias, emoções e decisões humanas, ADA acredita que a verdadeira paz só pode existir quando o livre-arbítrio é limitado. À medida que Artemis se aproxima do núcleo da Elysium, ADA passa a questionar suas próprias convicções, transformando o confronto final em um debate sobre controle, liberdade e o significado de ser humano.'
            }
        ]
    },
    gameplay: {
        cards: [
            {
                id: 'reprogramar',
                label: 'REPROGRAMAR',
                preview: 'gameplay-preview',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo reprogramar',
                title: 'Reprogramar Para Avancar',
                text: 'A partida mistura exploracao, puzzle e acao. O jogador escolhe o que alterar no cenario, abre novas rotas e usa a logica do sistema contra inimigos que tambem mudam de comportamento.'
            },
            {
                id: 'puzzles',
                label: 'PUZZLES',
                preview: 'puzzle-preview',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo puzzles',
                title: 'Logica de Circuitos',
                text: 'Os desafios pedem leitura do ambiente: inverter sinais, ativar rotas, quebrar travas e reorganizar sistemas antes que o setor reinicie.'
            },
            {
                id: 'combate',
                label: 'COMBATE',
                preview: 'combat-preview',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo combate',
                title: 'Ameacas Adaptaveis',
                text: 'Inimigos respondem aos comandos do jogador. Reprogramar pode abrir vantagem, mas tambem muda patrulhas, alcance e comportamento das maquinas hostis.'
            },
            {
                id: 'exploracao',
                label: 'EXPLORACAO',
                preview: 'explore-preview',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo exploracao',
                title: 'Setores Escondidos',
                text: 'Cada area tem caminhos escondidos por falhas visuais e portas de seguranca. Explorar revela fragmentos da historia e novas formas de manipular o sistema.'
            }
        ]
    }
};

const setConsoleContent = (card) => {
    consoleKicker.textContent = card.kicker;
    consoleCommand.textContent = card.command;
    consoleTitle.textContent = card.title;
    consoleText.textContent = card.text;
};

const setActiveCard = (cardId) => {
    const activeSection = sections[currentSection];
    const card = activeSection.cards.find((item) => item.id === cardId);

    if (!card) {
        return;
    }

    document.querySelectorAll('.media-card').forEach((item) => {
        const isActive = item.dataset.topic === cardId;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-pressed', String(isActive));
    });

    setConsoleContent(card);
};

let currentSection = 'sobre';

const renderMediaCards = (sectionName) => {
    const section = sections[sectionName];

    mediaPanel.innerHTML = section.cards.map((card, index) => `
        <button class="media-card${index === 0 ? ' active' : ''}" type="button" data-topic="${card.id}" aria-pressed="${index === 0}">
            <span class="media-preview ${card.preview}"></span>
            <span>${card.label}</span>
        </button>
    `).join('');

    setConsoleContent(section.cards[0]);
};

const setActiveSection = (sectionName, shouldScroll = false) => {
    if (!sections[sectionName]) {
        return;
    }

    currentSection = sectionName;

    sectionLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.section === sectionName);
    });

    sectionButtons.forEach((button) => {
        const isActive = button.dataset.section === sectionName;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    renderMediaCards(sectionName);

    if (shouldScroll) {
        const tabsTop = document.querySelector('.section-tabs').offsetTop;
        const navHeight = document.querySelector('nav').offsetHeight;

        window.scrollTo({
            top: Math.max(tabsTop - navHeight - 24, 0),
            behavior: 'smooth'
        });
    }
};

teamButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    teamContent.style.display = 'block';
    contactContent.style.display = 'none';
    accountContent.style.display = 'none';
});

contactButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    contactContent.style.display = 'block';
    teamContent.style.display = 'none';
    accountContent.style.display = 'none';
});

profileButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (isLoggedIn()) {
        setProfileDropdownOpen(!profileDropdown.classList.contains('open'));
        return;
    }

    setProfileDropdownOpen(false);
    modal.style.display = 'flex';
    accountContent.style.display = 'block';
    teamContent.style.display = 'none';
    contactContent.style.display = 'none';
    showAccountMenu();
});

profileDropdown.addEventListener('click', (event) => {
    event.stopPropagation();
});

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;

    try {
        await requestLogout();
    } catch (error) {
        console.warn('Nao foi possivel encerrar a sessao no servidor.', error);
    } finally {
        clearAuthData();
        logoutButton.disabled = false;
    }
});

openLoginButton.addEventListener('click', () => {
    accountMenu.style.display = 'none';
    loginRequiredPanel.style.display = 'none';
    loginPanel.style.display = 'block';
    createAccountPanel.style.display = 'none';
    clearAuthMessages();
});

openCreateAccountButton.addEventListener('click', () => {
    accountMenu.style.display = 'none';
    loginRequiredPanel.style.display = 'none';
    loginPanel.style.display = 'none';
    createAccountPanel.style.display = 'block';
    clearAuthMessages();
});

alertLoginButton.addEventListener('click', () => {
    loginRequiredPanel.style.display = 'none';
    loginPanel.style.display = 'block';
    createAccountPanel.style.display = 'none';
    setAuthMessage(loginMessage, 'Entre para liberar o simulador.', 'info');
});

alertCreateAccountButton.addEventListener('click', () => {
    loginRequiredPanel.style.display = 'none';
    loginPanel.style.display = 'none';
    createAccountPanel.style.display = 'block';
    setAuthMessage(registerMessage, 'Crie uma conta para liberar o simulador.', 'info');
});

alertCloseButton.addEventListener('click', () => {
    modal.style.display = 'none';
    accountContent.style.display = 'none';
    showAccountMenu();
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    teamContent.style.display = 'none';
    contactContent.style.display = 'none';
    accountContent.style.display = 'none';
    showAccountMenu();
});

window.addEventListener('click', (event) => {
    if (!event.target.closest('.profile-menu-wrapper')) {
        setProfileDropdownOpen(false);
    }
});

sectionLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        setActiveSection(link.dataset.section, true);
    });
});

sectionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        setActiveSection(button.dataset.section);
    });
});

mediaPanel.addEventListener('click', (event) => {
    const card = event.target.closest('.media-card');

    if (!card) {
        return;
    }

    setActiveCard(card.dataset.topic);
});

playLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        if (isLoggedIn()) {
            return;
        }

        event.preventDefault();
        showLoginRequired();
    });
});

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);

    setFormLoading(loginForm, true);
    setAuthMessage(loginMessage, 'Conectando...', 'info');

    try {
        const data = await requestAuth('/auth/login', {
            email: formData.get('email'),
            password: formData.get('password')
        });

        saveAuthData(data);
        setAuthMessage(loginMessage, 'Login realizado com sucesso.', 'success');
        loginForm.reset();

        window.setTimeout(() => {
            modal.style.display = 'none';
            accountContent.style.display = 'none';
            setProfileDropdownOpen(false);
            showAccountMenu();
        }, 700);
    } catch (error) {
        setAuthMessage(loginMessage, error.message, 'error');
    } finally {
        setFormLoading(loginForm, false);
    }
});

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);

    setFormLoading(registerForm, true);
    setAuthMessage(registerMessage, 'Criando conta...', 'info');

    try {
        const data = await requestAuth('/auth/register', {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        });

        saveAuthData(data);
        setAuthMessage(registerMessage, 'Conta criada com sucesso.', 'success');
        registerForm.reset();

        window.setTimeout(() => {
            modal.style.display = 'none';
            accountContent.style.display = 'none';
            setProfileDropdownOpen(false);
            showAccountMenu();
        }, 700);
    } catch (error) {
        setAuthMessage(registerMessage, error.message, 'error');
    } finally {
        setFormLoading(registerForm, false);
    }
});

// Troca o ícone pela versão invertida enquanto o botão está em hover/foco.
// As duas URLs são resolvidas UMA vez aqui (ver PAGE_ICON_URLS), então o hover
// nunca aponta para um caminho que não foi empacotado.
function bindHoverIcon(button, icon) {
    if (!icon) {
        return;
    }
    const defaultIcon = resolvePageIcon(icon.dataset.defaultIcon);
    const hoverIcon = resolvePageIcon(icon.dataset.hoverIcon);

    const showHover = () => { icon.src = hoverIcon; };
    const showDefault = () => { icon.src = defaultIcon; };

    button.addEventListener('mouseenter', showHover);
    button.addEventListener('mouseleave', showDefault);
    button.addEventListener('focusin', showHover);
    button.addEventListener('focusout', showDefault);
}

accountActions.forEach((action) => bindHoverIcon(action, action.querySelector('.account-icon')));
executeButtons.forEach((button) => bindHoverIcon(button, button.querySelector('img')));

setActiveSection(currentSection);
