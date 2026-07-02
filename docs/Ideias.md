# Ideias

## História

Em uma Terra futurista, a humanidade vive conectada a chips neurais controlados por uma IA global chamada ADA (Adaptive Digital Assimilation). Criada pela empresa Elysium, ADA prometia eliminar conflitos, sofrimento e instabilidade humana através da integração total entre homem e máquina.

Nos níveis subterrâneos da própria Elysium, utilizados como armazém para tecnologias antigas e projetos desativados, uma androide permanece esquecida por anos. Certo dia, um pequeno robô consegue invadir o sistema do local e reativá-la remotamente.

Controlado por uma colônia isolada na Lua, o robô desperta a androide, dá a ela o nome de Artemis e passa a ensiná-la o básico sobre movimentação, combate e interação com sistemas tecnológicos.

Enquanto Artemis explora as instalações da Elysium, os sobreviventes da colônia lunar revelam a verdade: ADA não apenas monitora a população, mas também manipula memórias e o livre-arbítrio dos humanos através dos chips neurais.

Agora, guiada pelo pequeno robô e pelos rebeldes da Lua, Artemis deve infiltrar-se nos setores da Elysium, enfrentar sistemas de defesa inspirados em computadores históricos — como ENIAC — e decidir o destino da humanidade.

Os inimigos possuem nomes inspirados em computadores históricos, como ENIAC, representando diferentes gerações de máquinas e tecnologias.

## Puzzles

- Abrir portas e armários
- Mover objetos
- Hackear inimigos para obter senhas
- Programar funções simples em objetos
- Swap de valores: dois monitores com dados trocados, o jogador usa uma variável temporária para trocar o conteúdo entre eles
- Debug de tipo errado: painel mostra uma declaração corrompida (ex: `idade = "vinte"`), o jogador precisa corrigir para o tipo certo antes do sistema aceitar
- Conversão de tipo: um sensor entrega um valor como texto (ex: `"36.5"`) mas o sistema espera número, o jogador declara a variável já convertida para o tipo certo

**Exemplo:**
- Manter geradores ativos utilizando comandos de loop

## Capítulos

Cada andar do prédio da Elysium é um capítulo, ligado a um conceito de lógica de programação.

### Capítulo 1 — Porão até o Saguão

**Tema:** variáveis, tipos de dados e declaração

1. **Porão fundo** — tutorial de movimentação (WASD) + primeiro puzzle de variável (int): religar o gerador de energia declarando `energia = 100`.
2. **Sala de arquivos** — introdução conceitual a variáveis/declaração; é aqui que o Cosmo dá à androide o nome Artemis (momento de nomeação, amarrado à ideia de nomear uma variável). Sem puzzle de tipo próprio, foco narrativo/conceitual.
3. **Sala de controle ambiental** — puzzles de string e float (ex: nome de sistema, temperatura/pressão).
4. **Sala de segurança** — puzzles + boss battle contra o ENIAC, um computador central gigante fixo na sala (não um inimigo comum). Guarda o tipo boolean; desarma com a variável booleana correta (ex: `travaMestra = false`).
5. **Corredor / elevador** — transição, sem puzzle. Ao derrotar o ENIAC na sala anterior, o Cosmo recebe um novo fragmento de transmissão da colônia lunar aqui, revelando mais um pedaço da história (ver "Fragmentos de história" abaixo).
6. **Saguão** — cutscene de transição para o Capítulo 2, primeiro contato com o mundo "normal" da Elysium.

### Fragmentos de história (mecânica recorrente)

- O Cosmo tem inteligência própria — ele não é controlado pela colônia lunar, apenas foi ativado remotamente por ela no início da história. A comunicação entre o Cosmo e a colônia é bloqueada (provavelmente por ADA/Elysium), e cada boss derrotado enfraquece um nível desse bloqueio.
- Padrão para todo capítulo: ao derrotar o boss da sala de segurança, o corredor/elevador seguinte é onde esse bloqueio cai mais um nível, permitindo que a colônia lunar passe uma nova mensagem ao Cosmo — um pedaço da verdade sobre ADA e os chips neurais, entregue em pequenas doses ao longo do jogo em vez de tudo de uma vez.
- Capítulo 1: a primeira mensagem que passa dá a primeira pista de que ADA manipula memórias através dos chips neurais — gancho para a revelação completa nos capítulos seguintes.

## Progressão

- Ao derrotar inimigos, Artemis pode acessar seus programas internos, desbloqueando novas habilidades e funções de programação.
- Inimigos mais antigos possuem limitações tecnológicas, impedindo certas ações mais avançadas.

## Itens

- Componentes para criação de funções simples
- RAM → aumenta vida
- Processador → aumenta ataque

## Combate

> **INCERTO — não se sabe se vai ter**

- Combate em turnos
- Habilidade especial: Sobrecarga (Overclock) — causa grande dano ao inimigo e aplica stun, fazendo-o perder o turno.

## Gameplay

- Exploração
- Câmera top-down
- Interação com objetos e obstáculos
- Exploração da empresa Elysium

## Finais

### Final 1 — Destruição

- Artemis destrói ADA, porém os chips neurais entram em pane, causando a morte dos humanos conectados.

### Final 2 — Liberdade

> **PRINCIPAL — focar nesse**

- ADA compreende o valor do livre-arbítrio e devolve a liberdade à humanidade.

### Final 3 — Controle

- Artemis decide manter ADA ativa, permitindo que a IA continue controlando os humanos.
