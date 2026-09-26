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

// Imagens dos cards (assets/images/site/), montadas a partir da arte do jogo por
// tools/site_cards.py (e os retratos do Cosmo e da ADA por
// tools/site_retratos.lua). Mesmo motivo do glob dos ícones: com o caminho
// dentro de uma string de template, o Vite não enxergaria o arquivo.
const SITE_IMAGES = Object.fromEntries(
    Object.entries(import.meta.glob('../assets/images/site/*.png', {
        eager: true,
        query: '?url',
        import: 'default'
    })).map(([path, url]) => [path.split('/').pop().replace(/\.png$/, ''), url])
);

const sections = {
    sobre: {
        cards: [
            {
                id: 'jogo',
                label: 'O JOGO',
                image: 'sobre_jogo',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo reprogrammed',
                title: 'Aprender Lógica Jogando',
                text: 'Reprogrammed é um jogo educacional desenvolvido como Trabalho de Conclusão de Curso. Em vez de decorar sintaxe, o jogador aprende lógica de programação resolvendo problemas dentro da história: cada porta trancada, máquina desligada ou robô hostil é um pequeno programa esperando a instrução certa.'
            },
            {
                id: 'historia',
                label: 'HISTÓRIA',
                image: 'sobre_historia',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo historia',
                title: 'O Despertar de Artemis',
                text: 'Em uma Terra futurista, a humanidade vive conectada a chips neurais controlados por ADA, a inteligência artificial da empresa Elysium. Nos subsolos da própria Elysium, uma androide esquecida é reativada por um pequeno robô enviado por rebeldes da Lua. Batizada de Artemis, ela precisa subir andar por andar até o núcleo de ADA e descobrir o preço da paz prometida: a memória e o livre-arbítrio de todos.'
            },
            {
                id: 'elysium',
                label: 'ELYSIUM',
                image: 'sobre_elysium',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo elysium',
                title: 'Um Andar, Um Conceito',
                text: 'O prédio da Elysium é o mapa do jogo, e cada andar é um capítulo ligado a um conceito de programação. No subsolo, Artemis aprende variáveis e tipos de dados; no térreo, condicionais. Nos andares de cima esperam repetições e funções, cada um guardado por um boss inspirado em um computador histórico, como o ENIAC.'
            },
            {
                id: 'aprendizado',
                label: 'APRENDIZADO',
                image: 'sobre_aprendizado',
                kicker: 'ARQUIVO / SOBRE',
                command: 'abrir_arquivo perfil',
                title: 'Um Jogo que Aprende com Você',
                text: 'Cada tentativa nos puzzles é registrada: acertos, erros e tempo. Esse perfil de aprendizado nunca é apagado ao carregar um save e serve de base para ajustar os desafios ao ritmo de cada jogador. Os puzzles também sorteiam valores e temas a cada partida, para que a resposta precise ser entendida, e não decorada.'
            }
        ]
    },
    personagens: {
        cards: [
            {
                id: 'protagonista',
                label: 'ARTEMIS',
                image: 'retrato_artemis',
                kicker: 'ARQUIVO / PERSONAGENS',
                command: 'exec ARTEMIS.exe',
                title: 'A Máquina que Aprendeu a Escolher',
                text: 'Despertada após anos esquecida nos depósitos subterrâneos da Elysium, Artemis não possui memórias sobre sua origem nem sobre o propósito para o qual foi criada. Guiada por um pequeno robô enviado pela colônia lunar, ela aprende gradualmente a explorar o mundo, interagir com sistemas e compreender os conceitos de liberdade e identidade. Conforme avança pela Elysium, Artemis adquire novas habilidades ao reprogramar máquinas antigas e enfrenta uma escolha impossível: obedecer à lógica que a criou ou decidir seu próprio destino.'
            },
            {
                id: 'aliado',
                label: 'COSMO',
                image: 'retrato_cosmo',
                kicker: 'ARQUIVO / PERSONAGENS',
                command: 'exec COSMO.exe',
                title: 'O Último Sinal',
                text: 'Cosmo é um pequeno robô de manutenção que atua como mensageiro entre Artemis e a colônia lunar. Apesar de sua aparência simples e de suas capacidades limitadas, foi ele quem conseguiu invadir os sistemas abandonados da Elysium para reativar Artemis após anos de esquecimento. Curioso, otimista e sempre disposto a ajudar, Cosmo acompanha a androide durante sua jornada, ensinando o básico sobre o mundo e fornecendo informações enviadas pelos rebeldes da Lua. Embora não tenha sido projetado para o combate, sua determinação prova que até mesmo a menor das máquinas pode desafiar um sistema que controla toda a humanidade.'
            },
            {
                id: 'vilao',
                label: 'ADA',
                image: 'retrato_ada',
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
                image: 'gameplay_reprogramar',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo reprogramar',
                title: 'Reprogramar Para Avançar',
                text: 'Com [R], o tempo desacelera e Artemis pode mirar qualquer máquina da sala: painéis, portas e robôs inimigos. Invadir um robô abre um duelo rápido: primeiro é preciso desviar do contra-ataque, depois montar a instrução que o desliga antes que o tempo acabe.'
            },
            {
                id: 'puzzles',
                label: 'PUZZLES',
                image: 'gameplay_puzzles',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo puzzles',
                title: 'Programar em Blocos',
                text: 'Os desafios são montados arrastando blocos, como peças de código. Primeiro vêm as variáveis: a carga certa para encher uma bateria, a temperatura exata de um termostato. Depois, condicionais que o jogo executa de verdade contra vários casos de teste: qualquer programa que funcione vale, e o jogador vê exatamente qual caso falhou.'
            },
            {
                id: 'combate',
                label: 'COMBATE',
                image: 'gameplay_combate',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo combate',
                title: 'Batalhas por Turnos',
                text: 'Os bosses são enfrentados em combates por turnos. ATACAR usa a força que Artemis programou, e REPROGRAMAR dobra essa força escrevendo código. No turno do inimigo, é preciso desviar de padrões de balas dentro de uma caixa ou responder a tempo a uma sequência de defesa em código.'
            },
            {
                id: 'exploracao',
                label: 'EXPLORAÇÃO',
                image: 'gameplay_exploracao',
                kicker: 'ARQUIVO / GAMEPLAY',
                command: 'abrir_arquivo exploracao',
                title: 'Explorar a Elysium',
                text: 'Cada sala da Elysium tem algo para ler. O Cosmo comenta quase tudo que o jogador examina com [E], computadores de salvamento guardam o progresso e transmissões da colônia lunar revelam, aos poucos, a verdade sobre ADA.'
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
            <span class="media-preview"><img src="${SITE_IMAGES[card.image]}" alt="" loading="lazy"></span>
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
