const modal = document.getElementById('modal');
const teamContent = document.getElementById('team-content');
const contactContent = document.getElementById('contact-content');

const teamButton = document.getElementById('team-button');
const contactButton = document.getElementById('contact-button');
const closeModal = document.getElementById('close-modal');
const mediaCards = document.querySelectorAll('.media-card');
const consoleKicker = document.getElementById('console-kicker');
const consoleCommand = document.getElementById('console-command');
const consoleTitle = document.getElementById('console-title');
const consoleText = document.getElementById('console-text');

const topics = {
    sistema: {
        kicker: 'ARQUIVO / SISTEMA',
        command: 'abrir_arquivo sistema',
        title: 'Sistema Reprogrammed',
        text: 'Em uma estacao perdida entre orbitas mortas, codigos antigos acordam maquinas que ja nao obedecem humanos. Reprograme rotas, memorias e inimigos para sobreviver ao nucleo corrompido.'
    },
    protagonista: {
        kicker: 'ARQUIVO / PROTAGONISTA',
        command: 'abrir_arquivo protagonista',
        title: 'Operador Principal',
        text: 'O protagonista e o ultimo operador capaz de alterar instrucoes em tempo real. Cada comando reescreve portas, plataformas e ameacas, mas tambem aproxima o nucleo da deteccao total.'
    },
    vilao: {
        kicker: 'ARQUIVO / AMEACA',
        command: 'abrir_arquivo vilao',
        title: 'O Nucleo Corrompido',
        text: 'O vilao e uma inteligencia central que aprendeu a se defender reprogramando o proprio ambiente. Ele transforma setores da nave em labirintos, bloqueia memorias e testa cada falha do jogador.'
    },
    gameplay: {
        kicker: 'ARQUIVO / GAMEPLAY',
        command: 'abrir_arquivo gameplay',
        title: 'Reprogramar Para Avancar',
        text: 'A partida mistura exploracao, puzzle e acao. O jogador escolhe o que alterar no cenario, abre novas rotas e usa a logica do sistema contra inimigos que tambem mudam de comportamento.'
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

mediaCards.forEach((card) => {
    card.addEventListener('click', () => {
        const topic = topics[card.dataset.topic];

        if (!topic) {
            return;
        }

        mediaCards.forEach((item) => {
            item.classList.remove('active');
            item.setAttribute('aria-pressed', 'false');
        });

        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
        consoleKicker.textContent = topic.kicker;
        consoleCommand.textContent = topic.command;
        consoleTitle.textContent = topic.title;
        consoleText.textContent = topic.text;
    });
});
