const modal = document.getElementById('modal');
const teamContent = document.getElementById('team-content');
const contactContent = document.getElementById('contact-content');
const teamButton = document.getElementById('team-button');
const contactButton = document.getElementById('contact-button');
const closeModal = document.getElementById('close-modal');
const sectionLinks = document.querySelectorAll('.section-link');
const sectionButtons = document.querySelectorAll('.section-button');
const mediaPanel = document.getElementById('media-panel');
const consoleKicker = document.getElementById('console-kicker');
const consoleCommand = document.getElementById('console-command');
const consoleTitle = document.getElementById('console-title');
const consoleText = document.getElementById('console-text');

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
                id: 'vilao',
                label: 'COSMO',
                preview: 'villain-preview',
                kicker: 'ARQUIVO / PERSONAGENS',
                command: 'exec COSMO.exe',
                title: 'O Último Sinal',
                text: 'Cosmo é um pequeno robô de manutenção que atua como mensageiro entre Artemis e a colônia lunar. Apesar de sua aparência simples e de suas capacidades limitadas, foi ele quem conseguiu invadir os sistemas abandonados da Elysium para reativar Artemis após anos de esquecimento. Curioso, otimista e sempre disposto a ajudar, Cosmo acompanha a androide durante sua jornada, ensinando o básico sobre o mundo e fornecendo informações enviadas pelos rebeldes da Lua. Embora não tenha sido projetado para o combate, sua determinação prova que até mesmo a menor das máquinas pode desafiar um sistema que controla toda a humanidade.'
            },
            {
                id: 'aliado',
                label: 'ADA',
                preview: 'ally-preview',
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
});

contactButton.addEventListener('click', () => {
    modal.style.display = 'flex';
    contactContent.style.display = 'block';
    teamContent.style.display = 'none';
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    teamContent.style.display = 'none';
    contactContent.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        teamContent.style.display = 'none';
        contactContent.style.display = 'none';
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

setActiveSection(currentSection);
