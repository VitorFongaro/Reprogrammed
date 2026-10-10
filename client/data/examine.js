// Comentários do Cosmo ao EXAMINAR coisas do cenário ([E] perto do objeto),
// no espírito das descrições do Undertale: curtos, e de preferência engraçados.
//
// Chave = nome do prop (basename do PNG em assets/images/<sala>/props/, o mesmo
// que o Tiled usa). Cada entrada é uma LISTA: a cada interação o Cosmo diz a
// próxima fala, e depois da última volta para a primeira. Prop sem entrada aqui
// simplesmente não é examinável.
//
// Máquinas que são puzzle (gerador do porão, painel da barreira) ficam de fora:
// o [E] delas abre o console, e o "examinar" nunca compete com isso (ver
// nearestAvailable no BaseRoomScene).
//
// ATENÇÃO: a fonte VCR não tem o travessão longo; use "-", ":" ou "...".
export const PROP_EXAMINE = {
    // --- Porão / depósitos ---
    prateleira_cheia: [
        "Uma estante cheia de líquidos químicos. Infelizmente, nem um óleo para a sua lata-velha.",
        "Os rótulos dizem: ÁCIDO, MAIS ÁCIDO e NÃO BEBA. Organização impecável."
    ],
    prateleira_vazia: [
        "Uma prateleira vazia. Alguém chegou antes da gente na liquidação.",
        "Nem poeira sobrou. Isso é que é faxina."
    ],
    barril_azul: [
        "Um barril azul com um líquido misterioso dentro. Recomendo fortemente não descobrir o que é.",
        "Continua sendo um barril. Eu conferi duas vezes."
    ],
    caixote_amarelo: [
        "Um caixote lacrado. A etiqueta diz FRÁGIL. A tampa diz NEM TENTE.",
        "Se tivesse algo útil aí dentro, a IA já teria confiscado."
    ],
    caixote_aberto: [
        "Um caixote aberto, cheio de enchimento verde. Quem manda isso para um porão?",
        "Ainda é enchimento. Ainda é verde. Ainda não faz sentido."
    ],
    caixote_alto: [
        "Caixotes empilhados até quase o teto. O sonho de todo gato.",
        "Se essa pilha cair, a culpa é sua. Só avisando."
    ],
    cilindro_grande: [
        "Um cilindro de gás inflamável. Por favor, não teste seus socos aqui.",
        "Ele está chiando baixinho. Vamos fingir que é normal."
    ],
    cilindro_pequeno: [
        "O primo menor do cilindro de gás. Igualmente explosivo, só que mais fofo."
    ],
    placa_perigo: [
        "Uma placa escrito PERIGO. Obrigado, placa. Muito específico.",
        "Perigo de quê? A placa não explica. Típico."
    ],
    placa_radiacao: [
        "Aviso de radiação. Relaxa, o seu chassi aguenta. Já eu...",
        "Se eu começar a brilhar no escuro, você me avisa?"
    ],
    prancheta: [
        "Uma prancheta com um checklist: DESLIGAR A ANDROIDE - OK. Pelo visto não deu muito certo.",
        "Tem mais um item embaixo: COMPRAR CAFÉ. Esse também ninguém fez."
    ],
    armario_fechado: [
        "Um armário trancado. Deve guardar os segredos mais bem protegidos do prédio. Ou vassouras.",
        "Aposto nas vassouras."
    ],
    armario_aberto: [
        "Um armário aberto com uma capa de chuva amarela. No subsolo. Isso é que é otimismo."
    ],
    cadeira: [
        "Uma cadeira. Pode sentar, mas não prometo que ela aguenta o seu peso de metal."
    ],
    mesa_madeira: [
        "Uma mesa de madeira de verdade. Aqui embaixo, isso é praticamente uma antiguidade."
    ],
    papeis: [
        "Uma pilha de relatórios e memorandos. Ninguém nunca leu nenhum, isso eu garanto.",
        "Um deles tem uma mancha de café em formato de sorriso. É a coisa mais alegre deste andar."
    ],
    bancada: [
        "Uma bancada de manutenção. As ferramentas sumiram, só ficaram as manchas de graxa."
    ],

    // --- Salas de servidores / treinamento ---
    server_rack_closed: [
        "Um rack de servidores zumbindo. Parece que está pensando. Espero que não seja em nós.",
        "Tem uma etiqueta: NÃO DESLIGAR. Nem precisava pedir, eu nem sei onde é o botão."
    ],
    server_rack_open: [
        "Um rack aberto, com cabos para todo lado. Quem montou isso odiava organização.",
        "Ou odiava a si mesmo. Difícil dizer."
    ],
    server_rack_toppled: [
        "Um servidor tombado. Descanse em paz, pequeno amigo. Você processou muito."
    ],
    server_tower_small: [
        "Um servidor pequeno. Deve rodar a planilha de café do andar inteiro."
    ],
    server_mainframe: [
        "Um mainframe enorme. Aposto que ainda roda código dos anos 70. E roda melhor que muita coisa nova."
    ],
    network_panel: [
        "Um painel de rede. Os cabos coloridos seguem uma lógica bem clara. Mentira, não seguem."
    ],
    crt_monitor_off: [
        "Um monitor de tubo desligado. O seu reflexo nele até que ficou bonito, Artemis."
    ],
    cable_spool: [
        "Um carretel de cabo. Metros e metros de fio para ninguém usar."
    ],
    toolbox: [
        "Uma caixa de ferramentas vazia. As chaves de fenda foram as primeiras a fugir."
    ],
    ups_battery: [
        "Um nobreak. Guarda energia para emergências. Tipo agora. Só que não para a gente."
    ],
    industrial_fan: [
        "Um ventilador industrial. É o único neste andar que está trabalhando de verdade."
    ],

    // --- Recepção (térreo) ---
    sofa_espera: [
        "Um sofá de espera. Pelo afundado no meio, alguém esperou MUITO.",
        "Tem uma moeda entre as almofadas. De 2031. Deixa aí, é patrimônio histórico."
    ],
    poltrona_espera: [
        "Uma poltrona. Confortável demais para uma sala onde ninguém é atendido."
    ],
    mesa_centro: [
        "Revistas: 'CHIP NEURAL: 10 MOTIVOS PARA AMAR O SEU'. Edição especial, pelo visto a única.",
        "A outra revista é sobre decoração. Cheia de salas iguais a esta. Que coincidência."
    ],
    vaso_ficus: [
        "Um ficus. De plástico. Até a planta aqui é controlada.",
        "Encostei na folha. Continua de plástico. Eu tinha esperança."
    ],
    floreira: [
        "Um canteiro separando os visitantes de quem trabalha aqui. Bonito jeito de dizer 'não passe'."
    ],
    bebedouro: [
        "Um bebedouro. Você não bebe água e eu não tenho boca. Seguimos.",
        "O galão faz 'glub'. Foi a coisa mais simpática que ouvi neste prédio."
    ],
    totem_info: [
        "O totem diz: 'BEM-VINDO À ELYSIUM. POR FAVOR, NÃO PENSE.' Acho que é erro de tradução.",
        "Toquei na tela. Ela pediu meu chip neural. Recusei educadamente."
    ],
    lixeira: [
        "Uma lixeira. Vazia. Até o lixo daqui é organizado.",
        "Ainda vazia. Estou começando a achar suspeito."
    ],
    mesa_seguranca: [
        "O posto da segurança. As câmeras mostram... a gente, olhando as câmeras.",
        "Tem um botão vermelho escrito ALARME. Não, Artemis."
    ],

    // Jardim de inverno (cap2-jardim). Canteiros e plantas ficam de fora: são o
    // puzzle, e o [E] perto deles é do painel.
    chafariz: [
        "Um chafariz no meio de uma estufa, num prédio fechado, com neve lá fora. Alguém aqui gosta de água.",
        "Tem moedas no fundo. Todas com a cara da ADA."
    ],
    banco_jardim: [
        "Um banco para sentar e olhar as plantas. Ninguém senta. Ninguém tem tempo.",
        "Tem uma plaquinha: 'DESCANSO AUTORIZADO: 4 MIN'. Claro que tem."
    ],
    arvore_vaso: [
        "Esta é de verdade! Toquei na folha. Pela primeira vez neste prédio, uma coisa viva.",
        "Tem um sensor pendurado no galho. Até a árvore é monitorada."
    ],
    regador: [
        "Um regador manual. Peça de museu: a irrigação aqui é toda automática.",
        "Vazio. Quem regava na mão foi substituído pelo painel ali."
    ],
    sacos_terra: [
        "Terra adubada, marca Elysium. 'Cresça dentro das especificações.'"
    ],
    prateleira_mudas: [
        "Mudas em fila, todas do mesmo tamanho. Nem as plantas escapam do padrão.",
        "Uma delas está torta. Gostei dela."
    ],
    vaso_flores: [
        "Flores de várias cores. Alguém aqui dentro ainda tem bom gosto.",
        "Cheiram bem, eu acho. Meu sensor de cheiro é teórico."
    ],

    // --- Depósito (cap. 2) ---
    empilhadeira: [
        "Uma empilhadeira manual. Precisa de alguém sentado para andar. Por isso está parada desde o bloqueio.",
        "A chave está no contato. Não, você não vai dirigir isso."
    ],
    pallet_caixas: [
        "Caixas embrulhadas em filme plástico. Etiqueta: 'PEÇAS DE REPOSIÇÃO - UNIDADES ARTEMIS'.",
        "...Peças de reposição suas. Vamos fingir que não lemos isso."
    ],
    pallets_vazios: [
        "Pallets empilhados. O depósito inteiro é uma pilha de coisas esperando outra coisa em cima."
    ],
    tambores: [
        "Tambores de óleo lubrificante. Para robô. Ou seja: comida de faxineiro.",
        "O vermelho diz 'INFLAMÁVEL'. Vamos deixar quieto."
    ],
    cone: [
        "Um cone. Ele não faz nada além de existir com autoridade.",
        "Nunca vi ninguém desobedecer um cone. Nem a ADA."
    ],
    paleteira: [
        "Uma paleteira. É o carrinho de mão do século seguinte."
    ],
    caixote: [
        "Um caixote sem peso escrito. Esse ninguém precisa decidir para onde vai.",
        "Bati nele: oco. Igual a metade das reuniões da diretoria."
    ]
};

// Robôs DESLIGADOS também podem ser examinados (chave = `type` do Enemy).
// Inimigo ativo não: ninguém para para ler descrição com bala voando.
export const ENEMY_EXAMINE = {
    exploding: [
        "Um robô-kamikaze desligado. O plano de carreira dele era bem curto."
    ],
    pistol: [
        "Um robô atirador fora do ar. Mirava bem, pensava mal."
    ],
    shotgun: [
        "Esse carregava uma escopeta. Sutileza não era o ponto forte dele."
    ],
    biped: [
        "Um bípede desligado. Pulava tanto que devia ser o mascote da academia."
    ],
    car: [
        "Um carrinho armado. Alguém achou que carrinho de controle remoto precisava de torreta."
    ],
    vigia: [
        "Uma vigia desligada. Passou a vida inteira esperando alguém se mexer. Agora é ela que não se mexe."
    ],
    faxineiro: [
        "Um faxineiro fora do ar. O chão em volta dele está impecável, isso eu tenho que admitir."
    ],
    mensageiro: [
        "Um mensageiro capotado. Uma roda só: rápido, mas nunca soube frear.",
        "A caixa de entregas está vazia. Ele corria para o lado errado há anos."
    ]
};
