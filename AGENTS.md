# Reprogrammed — Guia para Agentes

Jogo web educacional (TCC) que ensina **lógica de programação** via gamificação.
O jogador controla uma androide que desperta num mundo dominado por uma IA e resolve
desafios lógicos. Autores: Vitor Fongaro e Ryan Ramos.

> Projeto de TCC com dois desenvolvedores e prazo. Priorize soluções **simples e diretas**;
> evite over-engineering. O idioma do projeto (UI, textos, commits) é **português**.

## Arquitetura

Monorepo com dois pacotes independentes (não há `package.json` na raiz):

- **`client/`** — frontend do jogo em **Phaser 4** + **Vite**.
- **`server/`** — API **Node.js + Express** (ESM), com **Supabase/PostgreSQL** e **OpenAI**.

### Cliente (`client/`)
- `main.js` — config do Phaser (1280×720, `pixelArt`, physics `arcade`) e registro das cenas.
- `scenes/` — cenas do Phaser:
  - `GameScene` (`"game-scene"`) — menu principal, cards arrastáveis (drag-and-drop para executar).
  - `OptionsScene` (`"options-scene"`) — opções (Tela, Áudio, Controles, Legenda); sliders de volume integrados à API.
  - `IntroScene` (`"intro-scene"`) — cena de abertura no porão; diálogo com efeito máquina de escrever; a androide acorda e segue para o capítulo 1.
  - `SpritTestScene` (`"sprit-test-scene"`) — sala de teste jogável (WASD; ESC volta ao menu), usada como sandbox de dev.
  - `PauseMenuScene` (`"pause-menu"`) — overlay de ESC (continuar / configurações / sair, com aviso de progresso não salvo). Aberta pelo `BaseRoomScene` via `launch` + `pause`; só enquanto o jogador anda (`canPause()` barra durante diálogo, console e transição).
  - `scenes/chapter1/` — capítulo 1 (variáveis; porão → saguão): `PoraoScene` (int), `SalaArquivosScene` (`"cap1-arquivos"` — tematizada como SALA DE SERVIDORES (props via `tools/servidores.py`, feixe de laser do pack); é o TUTORIAL da reprogramação remota `[R]`: uma unidade de segurança (biped parado, guardião, só faz o slam) fica atrás de uma barreira de laser IMPASSÁVEL (parede sólida só contra a Artemis, do teto ao piso); o jogador não alcança para golpear, então usa `[R]` para desviar das bolas de energia e reprogramar à distância; ao ser desligado, o robô revela o nome dela ("Artemis... você nos traiu"), a barreira cai e a porta abre — é também onde entra a ideia de variável (`nome = "Artemis"`)), `SalaControleScene` (string/float), `TreinamentoScene` (`"cap1-treinamento"` — barreira de laser cíclica (painel `lasers = false`) + INIMIGOS; porta abre com a barreira desligada e todos os robôs desativados; cenário por `tools/treinamento_bg.py` + props no Tiled, com o nome da sala PINTADO na parede em vez de título de HUD e o painel do puzzle com arte própria por `tools/painel_laser.py`), `SentinelaScene` (`"cap1-sentinela"` — arena pré-boss: uma DUPLA de sentinelas (recolor do biped por rotação de matiz — teal + violeta, não-vermelhas; ver `tools/biped_recolor.py`) que lutam JUNTAS numa só `BattleScene` (config `combatants`, HP combinado → mais difícil); o turno delas cicla 3 padrões de bullet hell (`spiral`/`splitBounce`/`touhouCross`); reaproveita o mapa da sala de arquivos como cenário), `SalaSegurancaScene` (antessala do boss: `[E]` no núcleo abre a batalha), `BattleScene` (`"cap1-batalha"` — combate por turnos estilo Undertale: ATACAR causa dano igual à variável `forca`, REPROGRAMAR cria/dobra a `forca` no console de blocos (limitado a `config.maxReprograms` — default 2 no cap. 1, cresce nos próximos — por embate: o núcleo da Artemis sobrecarrega e trava, evitando o snowball da força dobrando; `[ESC]` antes de montar a instrução volta ao menu de ações **sem** gastar o turno), ANALISAR descreve o boss; o HP do ENIAC (`BOSS_MAX_HP = 80`) é calibrado para o embate durar uns 5-6 turnos mesmo na estratégia mais rápida possível (2 turnos de REPROGRAMAR até o teto + 4 ataques de 20 dano); o turno do inimigo é bullet hell na caixa com WASD (dominante) e, OCASIONALMENTE, uma sequência de defesa em blocos com tempo limite (`DEFENSE_CHANCE`; nunca no 1º turno nem duas seguidas); aberta via `scene.launch("cap1-batalha", { config })` + `pause` — o `config` parametriza nome, `maxHp`, `returnScene`, defesa on/off, projéteis e o(s) padrão(ões) de bullet hell (`dodgePattern` único ou `dodgePatterns[]` que CICLA a cada turno: `"rain"` chuva vertical do ENIAC, `"sweep"` varredura lateral com brecha, `"spiral"` orbe central girando e cuspindo balas, `"splitBounce"` bolas grandes que quicam e se dividem a cada quicada, `"touhouCross"` cruz de balas em volta da alma com aberturas nas diagonais, `"lightning"` colunas telegrafadas que caem como relâmpagos (zona de dano vertical, desvio horizontal), `"warpMines"` portais sci-fi que se abrem e EXPLODEM em zonas de dano circulares, `"nova"` o núcleo carrega e dispara um anel de balas com uma abertura giratória (linha-guia verde marca o corredor seguro) — os três últimos usam os efeitos do Super Pixel Effects Gigapack (ver docs/ASSETS.md) e o ENIAC (boss final) CICLA `["rain","lightning","warpMines","nova"]`; `"lightning"`/`"warpMines"` são ZONAS de perigo (não projéteis físicos): telegrafo → `hazards[]` ativo por um instante, checado em `updateHazards`); `config.combatants[]` (`{ key, walkUrl, disabledUrl, x, y, scale }`) troca o boss único do ENIAC por VÁRIOS sprites no topo com HP combinado (a dupla de sentinelas); `config.reward` é o ESPÓLIO da vitória (id do catálogo de itens, default `"cache"`) — ver "Espólio de boss" abaixo — e devolve com `scene.resume(returnScene, { victory: true })`), `ReprogramScene` (`"cap1-reprograma"` — batalha de reprogramação de um inimigo: telinha "HACKING EFETUADO", depois o robô revida com um ataque de ESQUIVA estilo Undertale (`DodgeBox`, WASD; cada acerto tira HP), então o jogador monta com tempo a instrução que o desliga, erro/tempo esgotado = nova esquiva; `config.stages` (default 1) define quantas CAMADAS o robô aguenta — cada acerto quebra uma (com barra de integridade do núcleo; o HP do jogador é o GLOBAL do `state/vitals`, sem escala por estágio) e só a última desativa (o biped-guardião da `SalaArquivosScene` usa 3); aberta pelo modo `[R]` da sala via `launch` + `pause`, devolve com `scene.resume(returnScene, { enemyReprogram: { index, disabled } })`), `CorredorScene` (transmissão da Lua) e `SaguaoScene` (cutscene final). Todas estendem `BaseRoomScene`, exceto a `SaguaoScene`, a `BattleScene` e a `ReprogramScene`. Chaves de cena: `"cap1-*"`.
- `ui/` — consoles de puzzle e `DialogueBox` (diálogo reutilizável com máquina de escrever):
  - `ProgrammingConsole` — puzzle de variável por **texto**: o jogador digita `nome = valor`; valida nome, tipo e valor (int/float/string/boolean).
  - `BlockProgrammingConsole` — mesmo puzzle em **blocos**: o jogador arrasta blocos para encaixes em sequência (`[variável] [=] [valor]`), no estilo dos cards do menu (`GameScene`). Deriva a solução do mesmo objeto `puzzle`; blocos extras (distratores) vêm em `puzzle.blockDistractors = { nome[], op[], valor[] }`. Sequências customizadas (ex. `forca = forca * 2`, 5 encaixes) vêm em `puzzle.blockSequence = [{ category, label }]`; `options.singleAttempt: true` congela e fecha no primeiro erro (modo combate — errar consome o turno); `options.timeLimitMs` adiciona contagem regressiva (estourar o tempo = falha). `options.onCancel` distingue **cancelar** de **tentar**: sair pelo `[ESC]` ANTES de submeter uma tentativa (tabuleiro cheio avaliado ou tempo esgotado) chama `onCancel` em vez de `onClose` e NÃO conta como tentativa — na batalha, o REPROGRAMAR usa isso para voltar ao menu de ações sem perder o turno. Convenção de texto: o `briefing` descreve só o OBJETIVO (diegético, sem a estrutura `nome = valor`); a estrutura sai no botão **[DICA]** (mostra `puzzle.hint` na voz do Cosmo, sob demanda). Chame `BlockProgrammingConsole.preload(scene)` no `preload` da cena (carrega o sheet `assets/sprites/blocks/`).
  - `BattleMenu` — menu de ações do combate por turnos (botões estilo Undertale; A/D ou setas + E/Enter, ou mouse). Usado na `BattleScene`.
  - `DodgeBox` — mini-jogo de esquiva estilo Undertale reutilizável (caixa + alma WASD + projéteis + duração; `start({ onHit, onEnd })`). Autossuficiente (gera texturas, escuta o `update` da cena). Usado na `ReprogramScene` como o ataque do inimigo.
  - `SaveConsole` — tela do ponto de salvamento (SIM/NÃO). Sem um `onSave`, avisa que o nó de arquivo ainda não está conectado em vez de fingir que salvou.
  - `DialogueBox` — **a** caixa de diálogo do jogo. Roteiro = `[{ speaker, text, color?, onEnter? }]`; avança com ESPAÇO/ENTER/clique e pula tudo com `[P]`. Não escreva outra caixa de diálogo: a `IntroScene` tinha uma cópia e foi justamente ela que criou um bug de profundidade que só aparecia lá.
  - Objeto `puzzle` esperado por ambos os consoles: `{ title, briefing[], hint, variable, expected, type?, successMessage?, wrongValueMessage?, blockDistractors?, blockSequence?, gauge? }` (o `type` é inferido de `expected` quando omitido). `gauge` (só no `BlockProgrammingConsole`) liga um MEDIDOR VISUAL que reage AO VIVO ao valor no encaixe `valor`, para o puzzle ser resolvido por RACIOCÍNIO em vez de o texto entregar a resposta. Tipos (`kind`): `"battery"` (`{ label, max }` — enche até `max`; cheia = correto), `"thermometer"` (`{ label, min, max, target }` — mercúrio sobe até o valor, marcador verde no alvo), `"sector"` (`{ label, rows[], cols[] }` — grade/mapa com o ponto "você está aqui" no `expected`; escolha a célula certa) e `"toggle"` (`{ label }` — barreira de feixes que liga/desliga conforme o booleano). Com `gauge`, um encaixe errado NÃO devolve a peça (sem punição) — o jogador ajusta olhando o medidor; o briefing descreve só o objetivo visual. Aplicado nos 4 puzzles de sala do cap. 1 (energia/bateria, temperatura/termômetro, setor/mapa, lasers/barreira).
- `objects/` — coisas interagíveis da sala:
  - `PuzzleDevice.js` — máquina interagível que abre o console com um puzzle e acende a luz indicadora ao resolver. Por padrão usa o console de texto; `config.blocks: true` usa o `BlockProgrammingConsole`; `config.introScript` toca um diálogo (Cosmo explicando a mecânica) uma única vez antes da primeira abertura. Para máquinas que já vêm desenhadas na arte/nos props: `drawBody: false` (não desenha o corpo procedural) e `indicator: false` (não desenha a luz, quando o sprite já tem sinalização própria).
  - `SaveComputer.js` — ponto de salvamento estilo máquina de escrever do Resident Evil: sprite de 2 quadros com LED piscando, `[E] SALVAR` e o `SaveConsole`. O `onSave` liga a estação ao save da sala (`saveGame()` do porão
    e do corredor); é o salvamento MANUAL, ao lado do checkpoint automático de entrada de sala
    (ver a seção Save).
- `utils/tiledMap.js` — leitura dos `.json` do Tiled: `preloadProps` (carrega `assets/images/*/props/*.png` como `prop-<nome>`), `placeTiledObjects` (instancia a camada de objetos com y-sort), `tiledColliders` e `tiledPropNames`.
- `characters/` — entidades do jogo:
  - `PlayerCharacter` — protagonista jogável (movimento WASD 4-direções; corrida segurando Shift — mesma animação de passos acelerada + velocidade maior). Sprite em `assets/sprites/artemis/` (template Eris Esra 16x32, quadros 32×32): caminhada sul/leste/norte, oeste espelhado em runtime (`flipX`); parada usa o quadro 0 e corrida reusa a caminhada acelerada (até haver ciclos de idle/run dedicados). `PlayerCharacter.idleTexture(dir)` dá a textura de repouso para cutscenes.
  - `CosmoCompanion` — companheiro que flutua no ombro da protagonista; sprite de 4 direções
    (`assets/sprites/cosmo/`) que acompanha a direção da Artemis, com fallback para um
    placeholder gerado em runtime caso a textura não seja pré-carregada.
  - `Enemy` — inimigos do cap. 1 (packs SteamRobotsPack + biped_robot + carro, quadros 32×32: `exploding`/`pistol`/`shotgun`/`biped`/`car`). Patrulha/persegue a Artemis e ataca (contato/tiro → HP da sala); os robôs à distância empunham uma **arma** (`pistol`/`shotgun`, folha própria sobreposta 1:1, mira e dispara). O `biped` anda **aleatório** (não persegue) e periodicamente **pula soltando 4 bolas de energia** que quicam nas paredes até sumirem (`scene.spawnEnergyBall`). O `car` dirige pelo mapa (patrulha) e, ao **avistar** a Artemis, toca a animação de **ativar a arma** (torreta sobe, uma vez) e passa a **manter distância** (kite: recua se perto, aproxima se longe) **atirando** um projétil animado próprio; máquina de estados em `updateCar` (arma embutida na animação, sem folha de arma sobreposta). Neutraliza-se por REPROGRAMAR (`[R]` mira com o mouse → `ReprogramScene`) ou MELEE (`[F]`, placeholder até a animação de ataque). `new Enemy(scene, x, y, { type, overrides })` — `overrides` ajusta as flags do tipo por instância sem tocar no `TYPES` (ex.: `{ wander: false, speed: 0 }` faz um biped guardião, parado, que só executa o slam — usado na `SalaArquivosScene`). Auto-registra-se via `scene.registerEnemy`/`registerReprogrammable`. `Enemy.preload(scene)`. Assets em `assets/sprites/enemies/` (biped é CC BY-SA 4.0, Silver Ink — ver docs/ASSETS.md).
  - `EniacBoss` — boss da `SalaSegurancaScene`: unidade-sentinela do ENIAC, sprite animado
    (`assets/sprites/boss/`, sheet horizontal de 6 quadros 60×60) em idle contínuo; expõe
    `hit()` (reação ao perder um estágio), `attackAnim(cb)` (telegrafa o turno de ataque)
    e `powerDown()` (derrota). `EniacBoss.preload(scene)`.
- `config.js` — `API_BASE_URL`, o endereço do backend. **Único lugar** que define isso;
  vem de `VITE_API_URL` (ver Deploy) e cai em `localhost:3000` no desenvolvimento.
- `state/progress.js` — save do jogador: sala atual e puzzles resolvidos, gravados em
  `PUT /game/progress` e espelhados no `localStorage` (o jogo continua salvando se a API
  cair). Estilo Resident Evil: vale o último save no `SaveComputer`.
- `state/vitals.js` — **HP da Artemis: UMA vida só** (`MAX_HP = 20`), compartilhada entre
  exploração e combate — a mesma vida dentro e fora de batalha. Persiste ao trocar de sala
  (passar de sala **não cura**); o **único** meio de cura são os **itens** (usáveis em qualquer
  contexto) e a exceção é a **troca de capítulo**, que restaura tudo (`fullHeal`, disparado por
  `enterChapterScene` quando o prefixo `capN` da cena muda). **Entra no SAVE**
  (`applySavedHp`, chamado pelo `applySnapshot` do `progress.js`): carregar um save devolve a
  vida que a Artemis tinha ao gravar. O `localStorage` (`reprogrammed.vitals`) continua, mas
  como ESPELHO DE SESSÃO — segura o HP num F5 no meio da jogatina; num load, quem manda é o
  save. `adoptChapter` marca o capítulo do save SEM curar, senão o `enterChapterScene` logo em
  seguida veria "mudou de capítulo" e apagaria o HP restaurado. Novo jogo (`resetVitals`) e
  troca de capítulo restauram. O
  `BaseRoomScene` (dano/cura/`resyncHp` ao voltar de sub-cenas; `playHealFx` toca um coração verde
  do pack de efeitos sobre a Artemis ao usar item de cura na sala) e a `BattleScene` (`getHp`/`setHp`)
  leem daqui; a "derrota" (morte na sala / restart do embate / falha no `[R]`) faz `fullHeal` — é
  reset de checkpoint, não cura de jogo. A `ReprogramScene` (`[R]`) também usa o HP global: entra
  com o HP atual, **sem** escala por estágio (chegar ferida torna reprogramar mais arriscado).
- `state/inventory.js` + `data/items.js` — **inventário** (itens coletados: `id -> qtd`).
  **Entra no SAVE** (`snapshotInventory`/`applyInventory`, via `progress.js`): carregar devolve
  os itens que o jogador tinha ao gravar. O `localStorage` (`reprogrammed.inventory`) continua
  como espelho de sessão, para sobreviver a um F5 sem exigir uma ida ao ponto de salvamento.
  Ressalva para o futuro: os itens de categoria `upgrade` (chips lógicos de fim de capítulo)
  são melhorias PERMANENTES — quando forem distribuídos de verdade, provavelmente pertencem ao
  perfil monotônico e não ao save, senão um load os desfaz. `data/items.js` é o catálogo (categorias
  `cura`/`reprogramacao`/`upgrade`/`chave`); o inventário começa VAZIO e a única fonte de item
  hoje é o **espólio de boss** (ver abaixo) — a coleta avulsa no mundo ainda será implementada. Abre pela `InventoryScene` (`"inventory"`):
  tecla `[I]` nas salas e ação **ITENS** na `BattleScene`, ambas via `launch` + `pause`. Layout em
  DUAS ABAS na paleta AZUL-CIANO do jogo: **INVENTÁRIO** (itens usáveis; grade de slots + cursor de
  seleção ANIMADO no item escolhido; coluna de ações USAR/DESCARTAR/FECHAR — USAR chama
  `config.useItem(item)` da sala/batalha: curar mexe no HP daquele contexto e, na batalha, consome o
  turno) e **MELHORIAS** (upgrades permanentes — os itens de categoria `upgrade`, as melhorias fixas
  que a Artemis ganha nas fases). Slots (azul/ciano) e a animação de seleção vêm do Complete UI
  Essential Pack (Crusenho, CC BY 4.0, ver docs/ASSETS.md); painel/abas/botões são desenhados no
  código e os ícones de item são PNGs de 32×32 em `assets/sprites/itens/` (campo `icon` do
  catálogo), exibidos em 2x — sem ícone, o desenho procedural por categoria entra como reserva.

  **Espólio de boss.** `config.reward` da `BattleScene` é o id do item que a vitória entrega
  (`dropReward`: entra no inventário e é anunciado na tela — item que o jogador não vê cair é
  item que ele nunca usa). O default é `"cache"`, o chip que libera **uma reprogramação a mais
  por embate**: como é a peça mais forte do jogo, o balanceamento é a ESCASSEZ — só o boss
  final de cada capítulo larga um. Todo embate que não seja boss de capítulo passa
  `reward: null` (é o caso da dupla de sentinelas, que é arena de treino).

  > O drop acontece a cada vitória, e por um tempo isso foi um buraco: dava para refazer o
  > boss e acumular chips. Com o **inventário dentro do save**, o buraco fechou sozinho —
  > carregar um save anterior ao boss também devolve o inventário de antes dele, então vencer
  > de novo só recupera o chip que o load tirou. Continua possível farmar em teoria, salvando
  > DEPOIS da vitória e recarregando um save mais antigo do servidor, mas isso já é um
  > malabarismo deliberado, não um efeito colateral do fluxo normal.
- `state/audio.js` + `ui/Sfx.js` — **efeitos sonoros** (packs Kenney Interface Sounds e SweetSounds,
  em `assets/audio/*.ogg`; ver docs/ASSETS.md). `Sfx.preload(scene)` no `preload` (já embutido em
  `BlockProgrammingConsole.preload` e `Enemy.preload`) e `Sfx.play(scene, nome, volumeScale?)` no
  evento — UI: `"select"` (bloco encaixado), `"confirm"` (código correto), `"error"` (código errado /
  tempo esgotado), `"hack"` (robô invadido, na `ReprogramScene`); inimigos: `"gun"` (tiro de
  pistol/shotgun), `"laser"` (tiro do carro) e `"bump"` (o biped atingindo o chão no slam) — os tiros
  usam `volumeScale` menor para não dominarem; menu/inventário: `"crunch"` (card iniciar/continuar
  encaixado no espaço EXECUTAR, na `GameScene`) e `"menuIn"`/`"menuOut"` (inventário abre/fecha). O
  volume vem do slider de EFEITOS SONOROS da
  `OptionsScene`, espelhado em `state/audio.js` (`getSfxVolume`), então os sons tocam de qualquer cena
  sem consultar a API.
- `ui/Music.js` — **música de fundo** (`assets/audio/music/`: `menu.mp3` no menu principal,
  `cap1_subsolo.mp3` no capítulo 1 e `boss.mp3` no embate com o boss). `Music.preload(scene, nome)`
  carrega UMA faixa — são vários MB cada, o menu não deve baixar as outras antes de abrir. Como o menu é a primeira tela e o
  navegador só libera áudio na primeira interação, o `play` detecta o contexto travado
  (`scene.sound.locked`) e adia a faixa para o evento `unlocked`, em vez de perder o play. O
  `SoundManager` do Phaser é GLOBAL (criado pelo Game, não pela cena), então a faixa **atravessa as
  trocas de cena sozinha**: ela começa na `IntroScene`, no fim do diálogo de abertura, junto do card
  "CAPÍTULO 1 :: SUBSOLO" (estilo Katana Zero), e segue tocando por todas as salas. `Music.play` é
  IDEMPOTENTE — o `BaseRoomScene` chama a cada sala só para cobrir quem entrou direto pelo CONTINUAR,
  sem passar pela intro, e isso NÃO reinicia a faixa. O embate do boss troca para o TEMA PRÓPRIO
  dele (`config.theme` da `BattleScene`, default `"boss"`) via `Music.playTheme`, que lembra a faixa
  anterior; o `Music.restore` no `shutdown` devolve essa faixa ao sair — assim a `BattleScene` não
  precisa saber em que capítulo está. A arena de treino das sentinelas passa `theme: null` e mantém
  a faixa do capítulo.
  Voltar ao menu troca de volta para o tema do menu (`Music.play` troca a faixa sozinho); a
  `IntroScene` dá `Music.stop()` no `create`, porque a abertura corre em SILÊNCIO até o card.
  Volume pelo slider de MÚSICA da `OptionsScene`
  (`getMusicVolume` em `state/audio.js`; `Music.applyVolume()` aplica na faixa que já está tocando).
- `assets/` — `fonts/` (VCR_OSD_MONO), `cursors/`, `sprites/`, `audio/` (SFX soltos + `music/`), `icons/`, `images/`, `ui/`.
- `pages/`, `scripts/`, `styles/` — páginas HTML auxiliares e auth fora do canvas Phaser.

### Servidor (`server/`)
- `server.js` — app Express; CORS manual; monta `/auth`, `/game`, `/ai`.
- `routes/` → `controllers/` → `services/`. `middlewares/authMiddleware.js` valida JWT.
- `config/supabase.js` — cliente Supabase. Segredos via `.env` (não commitar).
- Rotas: `/auth` (register, login, refresh, logout, me), `/game` (status, settings GET/PATCH,
  progress GET/PUT), `/ai` (status).

**Auth:** JWT Bearer; no cliente fica em `localStorage` como `reprogrammed.auth`
(`accessToken` + `refreshToken` + `user`), com refresh automático.

## Como rodar

```bash
# Frontend (porta 5173, ou a próxima livre)
cd client && npm install && npm run dev

# Backend (porta 3000 por padrão; precisa de .env com Supabase/OpenAI)
cd server && npm install && npm run dev
```

Não há suíte de testes nem linter configurados.

> **Não teste o jogo pelo navegador** (nem via ferramentas de preview/automação de browser).
> Quem valida rodando o jogo são os próprios desenvolvedores. Entregue a mudança pronta,
> descreva o que precisa ser testado e deixe o teste manual para o Vitor e o Ryan.
> O Vite tem HMR; um F5 recarrega a cena.

## Deploy

Três peças, todas com deploy automático a cada push na `main`:

| peça | onde | endereço |
|---|---|---|
| cliente | Vercel (projeto `reprogrammed`) | https://reprogrammed.vercel.app |
| API | Render (web service `reprogrammed-api`, plano free, Virginia) | https://reprogrammed-api.onrender.com |
| banco | Supabase (projeto `Reprogrammed`, sa-east-1) | — |

**Cliente.** O build é declarado no [`vercel.json`](vercel.json) **da raiz do repositório**, não
no painel: `cd client && npm run build`, servindo `client/dist`. Ele existe porque não há
`package.json` na raiz — com o Root Directory vazio, a Vercel não detecta framework nenhum,
cai no detector de servidor Node e falha com *"No entrypoint found in /vercel/path0"*. Deixar
a configuração no repositório faz funcionar com o Root Directory vazio e continuar
funcionando se alguém apontá-lo para `client/` (aí o arquivo é ignorado e o Vite é detectado
sozinho).

**Endereço da API.** Vem de `VITE_API_URL`, fixada em `client/.env.production` — versionada
de propósito: é endereço público, não segredo, e assim o build não depende de ninguém lembrar
de configurar variável no painel. **É assada no bundle durante o build**, não lida em tempo de
execução: trocar o endereço exige um novo deploy do cliente.

**API.** Comandos `cd server && npm install` e `cd server && npm start` (o Render clona o repo
inteiro; não há Root Directory). Variáveis no painel do Render: `SUPABASE_URL`,
`SUPABASE_ANON_KEY` e `CLIENT_ORIGIN` (a URL da Vercel — sem ela o CORS libera `*`). O `PORT`
quem injeta é o Render.

> **O plano free do Render dorme depois de 15 min parado** e leva ~30–50s para acordar. Como o
> login passa pela API, com o serviço dormindo não dá nem para entrar no jogo. Antes de
> qualquer apresentação, abra o site alguns minutos antes.

**Banco.** `database/schema.sql` e `database/seed.sql` são a fonte da verdade e refletem o que
está aplicado no Supabase; migração nova entra nos dois (arquivo + banco). O `.env` nunca é
commitado — o que cada host precisa está nos `.env.example` do cliente e do servidor.

O canvas Phaser vive em `pages/game.html`, atrás de um `authGuard` que exige login
(token em `localStorage` como `reprogrammed.auth`). Fluxo de entrada: menu (`GameScene`)
→ `IntroScene` → `cap1-porao`.

## Convenções

- **ESM** em todo o projeto (`import`/`export`, `"type": "module"`).
- **Estética visual:** fundo `#050505`, fonte `"VCR"`, paleta monocromática com acentos
  (ciano `#4ad6ff`, vermelho `#ff4545`), scanlines. Mantenha cenas novas nesse estilo.
- **Cenas Phaser:** uma classe por arquivo, `super("nome-da-cena")` em kebab-case;
  registre a cena no array `scene` de `main.js`.
- **Salas de capítulo:** estendem `BaseRoomScene` e implementam `onRoomCreate`/`onRoomUpdate`
  (não sobrescreva `create`/`update`). Objetos interagíveis se registram via
  `registerInteractable(...)` (o `[E]` age no mais próximo em alcance); a porta de saída
  abre com `unlockDoor()` e leva à `nextScene` da config. O modo de **reprogramação
  remota** (`[R]`, estilo câmara lenta de Luna Nights) desacelera o tempo (física, timers,
  tweens e animações), destaca os alvos registrados via `registerReprogrammable(...)`
  (`{ x, y, w, h, label, isAvailable, onReprogram }`) e permite MIRAR o alvo com o mouse
  (o mais próximo do ponteiro) e confirmar com clique/E sem ir até a máquina; a Artemis
  segue em tempo normal (WASD compensado),
  deixando um rastro de imagens residuais; o modo tem duração limitada e recarga
  (`REPROGRAM_DURATION`/`REPROGRAM_COOLDOWN`, em ms reais) — o `PuzzleDevice` se
  registra automaticamente.
- **Entidades** (personagens/companheiros): classe própria em `characters/`, expondo
  `update(time, delta)` e limpando recursos em `scene.events.once("shutdown", ...)`.
- Parâmetros ajustáveis (velocidade, offsets, etc.) ficam como **constantes no topo do
  arquivo** e aceitam override via `options` no construtor.
- Mensagens de commit em português (ver histórico do git).

### Profundidade (`setDepth`)

Nas salas, props e personagens usam **y-sort**: `depth = y` (a base do sprite). Como a sala
tem 720px de altura, isso significa que um caixote lá embaixo chega a `depth ≈ 630`. Regra
prática: **o que tem que ficar sempre por cima do cenário usa depth ≥ 700.**

| faixa | o quê |
|---|---|
| −10 … −4 | fundo, letreiros/emblemas pintados na parede, luz, scanlines |
| `= y` | props do Tiled, Artemis (`player.feetY`), sombra do player (`depth − 1`) |
| 750 | Cosmo |
| 790 / 800 | luz do `PuzzleDevice` / prompts `[E]` |
| 900 | `DialogueBox`, HUD de HP |
| 940 / 950 | overlay de reprogramação remota / `BattleMenu` |
| 1000 | consoles de puzzle e o `SaveConsole` |

A `BattleScene` é uma cena separada por cima da sala, então tem escala própria (25–30 +
HUD) e não se compara com a tabela acima.

### Armadilhas do Phaser (já custaram bug aqui)

- **`launch`/`start` sem dados mantém os dados anteriores.** O `Systems.start` só sobrescreve
  `settings.data` se você passar algo, então uma segunda abertura sem dados reusa os da
  primeira. Sempre passe o objeto explícito — inclusive vazio, como
  `scene.launch("cap1-batalha", { config: {} })`.
- **`events.once("resume")` não sobrevive ao menu de pausa.** O menu de ESC também dá
  `resume` na sala, consumindo o listener de uso único e quebrando o retorno da batalha.
  Use `events.on(...)` + `events.off(...)` no `shutdown` (ver `SalaSegurancaScene`).
- Ao retomar de um `pause`, o Phaser guarda o estado das teclas; o `PauseMenuScene` chama
  `input.keyboard.resetKeys()` antes do `resume` para a Artemis não sair andando sozinha.

## Save (progresso do jogador)

### A regra que não pode ser quebrada

Existem **dois estados com ciclos de vida diferentes**, e misturá-los estraga o jogo:

| | onde mora | comportamento |
|---|---|---|
| **Save** | `user_game_state` | **reversível** — carregar volta para o ponto salvo |
| **Perfil de aprendizado** | `puzzle_attempts`, `user_level_progress`, `user_topic_performance` | **monotônico** — gravado quando acontece, nunca revertido |

Tentativas, acertos e a dificuldade adaptativa da IA **não entram no save**. Carregar um save
não escreve nessas tabelas: é só isso que impede o jogador de zerar o ajuste de dificuldade
saindo e voltando do jogo. Se um dia alguém colocar `current_difficulty` dentro do save "para
restaurar direitinho", o sistema adaptativo do TCC morre em silêncio.

### O modelo é Resident Evil

Vale **o último save**. O jogador resolve puzzles à vontade, mas se sair sem passar pelo
computador de salvamento, o que resolveu depois do último save é pedido de novo. Foi decisão
consciente — o `solved_puzzles` grava a lista de puzzles resolvidos *no momento* em que o
jogador salva, não conforme ele resolve.

### `slug` é o contrato

O cliente nunca conhece id gerado do banco. A ponte é o slug:

- `levels.slug` = a chave da cena no Phaser (`"cap1-porao"`), gravada em `current_scene`
- `puzzles.slug` = o `id` passado ao `PuzzleDevice` (`"porao-gerador"`), e o que entra na
  lista `solved_puzzles`

**Renomear um slug invalida os saves existentes.** O servidor resolve `current_level_id` e
`current_chapter_id` a partir da cena; cena de transição (corredor, saguão) não tem fase, e
nesse caso o save guarda só a cena e deixa a fase nula.

### No cliente

- `state/progress.js` — `markSolved`/`isSolved`, `snapshot`, `save()` e `load()`. Grava na API
  e espelha no `localStorage`, para o jogo continuar salvando se o backend cair; `save()`
  devolve `{ ok, remote }` para a tela dizer se o "nó de arquivo" recebeu. O snapshot leva
  `scene`, `solvedPuzzles`, `hp` e `inventory` — os dois últimos moram em `state/vitals.js` e
  `state/inventory.js`, e aqui só entram e saem do save, para não haver dois donos da mesma
  verdade. `startNewGame()` zera os quatro.
- `BaseRoomScene.create()` chama `enterScene(...)` sozinho — sala nova não precisa fazer nada
  para o save saber onde o jogador está.
- `PuzzleDevice` com `id` nasce resolvido quando o save diz que foi, e aí chama `onRestore`.
- `SaveComputer` com `onSave` é o ponto de salvamento MANUAL. Hoje são dois: o **porão**
  (começo do capítulo) e o **corredor do elevador** (depois do boss — o embate com o ENIAC é o
  trecho mais longo do capítulo, e fica antes do elevador de propósito, porque passar de
  capítulo cura por completo e gravar deste lado guarda o estado real em que o jogador terminou
  o andar).
- **Checkpoint automático:** `BaseRoomScene.saveCheckpoint()` grava sozinho ao ENTRAR numa sala,
  depois do `onRoomCreate` (é lá que os puzzles restaurados reaplicam o estado — gravar antes
  salvaria um retrato pela metade). Fogo e esquece, como a telemetria: a ida à API não segura a
  sala nem estoura se o Render estiver dormindo. Um aviso discreto some no canto superior
  direito, porque checkpoint que o jogador não vê é checkpoint em que ele não confia. Sala que
  precise ficar de fora passa `autoSave: false` na config.

  > Isso ABRANDA o modelo Resident Evil, de propósito: o jogador ainda perde o que resolveu
  > desde que entrou na sala atual, mas não perde mais salas inteiras. Duas consequências que
  > valem saber: o puzzle resolvido na sala N só é gravado ao entrar na sala N+1, e o botão
  > INICIAR do menu (que some quando há save) passa a sumir logo na primeira sala de uma
  > partida nova — para recomeçar do zero, é o ZERAR PROGRESSO do painel do jogador.

> **`onRestore` NÃO cai para `onSolved`, de propósito.** O `onSolved` das salas com mais de um
> painel lê os outros painéis, que ainda não existem quando o primeiro é construído — cair no
> `onSolved` daria crash ao carregar um save. Sala com vários dispositivos reaplica o estado
> num passo próprio, depois de construir todos (ver `SalaControleScene.restoreFromSave`).

## Assets (pixel art)

Sprites/tilesets são pixel art gerada no **Aseprite**. O executável é específico de cada
máquina — **cada dev configura o próprio caminho** (não há caminho fixo no repo). O fluxo
usado até agora é gerar por script Lua em modo batch:

```bash
# <aseprite> = caminho local do Aseprite na sua máquina
<aseprite> -b -script-param out=nome -script gera.lua   # exporta nome.png + nome.aseprite
```

> **Script que gera arte mora em `tools/`, versionado.** Os geradores originais dos fundos
> do porão foram escritos em pasta temporária e se perderam — por isso `tools/porao_piso.lua`
> e `tools/porao_parede.lua` são cirúrgicos: compõem por cima do PNG existente em vez de
> regerar a sala inteira. Não repita o erro; um fundo sem gerador versionado só pode ser
> editado por remendo.

> **Pegadinha do Aseprite:** arquivo cujo nome termina em dígito é aberto como **sequência de
> quadros** (`tileset x2.png` vira uma animação de 3 frames junto com `x1`/`x3`, e `--crop`
> passa a recortar a região errada). Copie para um nome sem dígito final antes de usar
> (`demo_tileset.png`, `obj_010_p.png`).

Convenção de sprite de personagem/companheiro: **sheet horizontal**, quadros de 32×32, uma
direção por quadro (ex: Cosmo = frente/costas/esquerda/direita). Versione o `.aseprite`
fonte junto do `.png` em `assets/sprites/<nome>/`.

Boa parte da arte de cenário vem de **packs de terceiros**, não do Aseprite. Origem e
licença de cada pack estão em [docs/ASSETS.md](docs/ASSETS.md) — leia antes de mexer neles,
porque as licenças não são todas iguais.

**Blocos do puzzle:** `assets/sprites/blocks/` tem o sheet `blocks.png` (3 quadros de 152×48:
nome/ciano, operador/âmbar, valor/azul). O chassi do bloco é desenhado no Aseprite
(`chassi.aseprite`, fonte editável do dev); `gera.py` parte do `chassi-fonte.png` (export do
chassi), **remove o texto pintado**, **recolore em 3 tons** por categoria (troca só a matiz,
preserva a sombra) e usa **9-slice** para esticar o chassi 32×32 até 152×48 sem distorcer os
cantos. O **rótulo** de cada bloco é sobreposto em runtime pelo `BlockProgrammingConsole` com
a fonte VCR, então o mesmo chassi serve a qualquer texto. Fluxo:
`<aseprite> -b chassi.aseprite --save-as chassi-fonte.png && python gera.py`. Para trocar
o desenho do bloco, edite `chassi.aseprite`; para as cores das categorias, ajuste
`CATEGORY_HUES` no `gera.py`.

**Mapas e colisões (Tiled):** cada sala com mapa em imagem tem um `.json` do Tiled em
`assets/maps/` com três camadas — imagem `fundo`, objetos `objetos` (os props, como tile
objects) e objetos `colisao` (retângulos). Edite tudo isso abrindo o `.json` no Tiled; a
cena carrega via `addObjectsFromTiled(mapJson, "objetos", offset)` e
`addCollidersFromTiled(mapJson, "colisao", offset)` do `BaseRoomScene`. Objetos avulsos da
sala (caixotes, barris, etc.) ficam em `assets/images/<sala>/props/`.

Detalhes que mordem ao posicionar props:

- O fundo tem **1280×704** e é centralizado no canvas de 720, então o mapa vai para a tela
  com `mapOffset = { x: 0, y: 8 }`. Coordenada do Tiled ≠ coordenada de tela.
- Tile object no Tiled tem origem no **canto inferior esquerdo**: o `y` do objeto é a base
  do móvel (é ele que alimenta o y-sort). Para encostar um objeto na parede do fundo, o que
  importa é o **topo** (`y − altura`) chegar na base da parede — no porão, `y = 128`.

## Não commitar

`.env`, segredos de Supabase/OpenAI, `node_modules/`.
