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
  - `scenes/chapter1/` — capítulo 1 (variáveis; porão → saguão): `PoraoScene` (int), `SalaArquivosScene` (nomeação da Artemis), `SalaControleScene` (string/float), `TreinamentoScene` (`"cap1-treinamento"` — desviar e desativar: barreira de laser cíclica + torretas, HP na sala com reinício ao zerar, painéis desligam com `lasers = false` e `municao = 0`; cenário procedural até a arte ficar pronta), `SentinelaScene` (`"cap1-sentinela"` — arena de treino: mini-batalha pré-boss reusando a `BattleScene` com config branda; cenário procedural), `SalaSegurancaScene` (antessala do boss: `[E]` no núcleo abre a batalha), `BattleScene` (`"cap1-batalha"` — combate por turnos estilo Undertale: ATACAR causa dano igual à variável `forca`, REPROGRAMAR cria/dobra a `forca` no console de blocos, ANALISAR descreve o boss; o turno do inimigo alterna bullet hell na caixa com WASD e sequência de defesa em blocos com tempo limite; aberta via `scene.launch("cap1-batalha", { config })` + `pause` — o `config` parametriza nome, `maxHp`, `returnScene`, defesa on/off, projéteis e o padrão do bullet hell (`dodgePattern`: `"rain"` chuva vertical do ENIAC, `"sweep"` varredura lateral com brecha da sentinela; padrão = ENIAC) — e devolve com `scene.resume(returnScene, { victory: true })`), `CorredorScene` (transmissão da Lua) e `SaguaoScene` (cutscene final). Todas estendem `BaseRoomScene`, exceto a `SaguaoScene` e a `BattleScene`. Chaves de cena: `"cap1-*"`.
- `ui/` — consoles de puzzle e `DialogueBox` (diálogo reutilizável com máquina de escrever):
  - `ProgrammingConsole` — puzzle de variável por **texto**: o jogador digita `nome = valor`; valida nome, tipo e valor (int/float/string/boolean).
  - `BlockProgrammingConsole` — mesmo puzzle em **blocos**: o jogador arrasta blocos para encaixes em sequência (`[variável] [=] [valor]`), no estilo dos cards do menu (`GameScene`). Deriva a solução do mesmo objeto `puzzle`; blocos extras (distratores) vêm em `puzzle.blockDistractors = { nome[], op[], valor[] }`. Sequências customizadas (ex. `forca = forca * 2`, 5 encaixes) vêm em `puzzle.blockSequence = [{ category, label }]`; `options.singleAttempt: true` congela e fecha no primeiro erro (modo combate — errar consome o turno); `options.timeLimitMs` adiciona contagem regressiva (estourar o tempo = falha). Convenção de texto: o `briefing` descreve só o OBJETIVO (diegético, sem a estrutura `nome = valor`); a estrutura sai no botão **[DICA]** (mostra `puzzle.hint` na voz do Cosmo, sob demanda). Chame `BlockProgrammingConsole.preload(scene)` no `preload` da cena (carrega o sheet `assets/sprites/blocks/`).
  - `BattleMenu` — menu de ações do combate por turnos (botões estilo Undertale; A/D ou setas + E/Enter, ou mouse). Usado na `BattleScene`.
  - `SaveConsole` — tela do ponto de salvamento (SIM/NÃO). Sem um `onSave`, avisa que o nó de arquivo ainda não está conectado em vez de fingir que salvou.
  - `DialogueBox` — **a** caixa de diálogo do jogo. Roteiro = `[{ speaker, text, color?, onEnter? }]`; avança com ESPAÇO/ENTER/clique e pula tudo com `[P]`. Não escreva outra caixa de diálogo: a `IntroScene` tinha uma cópia e foi justamente ela que criou um bug de profundidade que só aparecia lá.
  - Objeto `puzzle` esperado por ambos os consoles: `{ title, briefing[], hint, variable, expected, type?, successMessage?, wrongValueMessage?, blockDistractors?, blockSequence? }` (o `type` é inferido de `expected` quando omitido).
- `objects/` — coisas interagíveis da sala:
  - `PuzzleDevice.js` — máquina interagível que abre o console com um puzzle e acende a luz indicadora ao resolver. Por padrão usa o console de texto; `config.blocks: true` usa o `BlockProgrammingConsole`; `config.introScript` toca um diálogo (Cosmo explicando a mecânica) uma única vez antes da primeira abertura. Para máquinas que já vêm desenhadas na arte/nos props: `drawBody: false` (não desenha o corpo procedural) e `indicator: false` (não desenha a luz, quando o sprite já tem sinalização própria).
  - `SaveComputer.js` — ponto de salvamento estilo máquina de escrever do Resident Evil: sprite de 2 quadros com LED piscando, `[E] SALVAR` e o `SaveConsole`. O salvamento em si ainda não existe — só o `onSave` como gancho.
- `utils/tiledMap.js` — leitura dos `.json` do Tiled: `preloadProps` (carrega `assets/images/*/props/*.png` como `prop-<nome>`), `placeTiledObjects` (instancia a camada de objetos com y-sort), `tiledColliders` e `tiledPropNames`.
- `characters/` — entidades do jogo:
  - `PlayerCharacter` — protagonista jogável (movimento WASD; corrida segurando Shift — mesma animação de passos acelerada + velocidade maior; animações 8 direções carregadas via `import.meta.glob`).
  - `CosmoCompanion` — companheiro que flutua no ombro da protagonista; sprite de 4 direções
    (`assets/sprites/cosmo/`) que acompanha a direção da Artemis, com fallback para um
    placeholder gerado em runtime caso a textura não seja pré-carregada.
  - `EniacBoss` — boss da `SalaSegurancaScene`: unidade-sentinela do ENIAC, sprite animado
    (`assets/sprites/boss/`, sheet horizontal de 6 quadros 60×60) em idle contínuo; expõe
    `hit()` (reação ao perder um estágio), `attackAnim(cb)` (telegrafa o turno de ataque)
    e `powerDown()` (derrota). `EniacBoss.preload(scene)`.
- `assets/` — `fonts/` (VCR_OSD_MONO), `cursors/`, `sprites/`, `audio/`, `icons/`, `images/`.
- `pages/`, `scripts/`, `styles/` — páginas HTML auxiliares e auth fora do canvas Phaser.

### Servidor (`server/`)
- `server.js` — app Express; CORS manual; monta `/auth`, `/game`, `/ai`.
- `routes/` → `controllers/` → `services/`. `middlewares/authMiddleware.js` valida JWT.
- `config/supabase.js` — cliente Supabase. Segredos via `.env` (não commitar).
- Rotas: `/auth` (register, login, refresh, logout, me), `/game` (status, settings GET/PATCH), `/ai` (status).

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
  (`{ x, y, w, h, label, isAvailable, onReprogram }`) e permite alternar com ←/→ e abrir o
  console com E sem ir até a máquina; a Artemis segue em tempo normal (WASD compensado),
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
