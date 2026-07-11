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
  - `scenes/chapter1/` — capítulo 1 (variáveis; porão → saguão): `PoraoScene` (int), `SalaArquivosScene` (nomeação da Artemis), `SalaControleScene` (string/float), `SalaSegurancaScene` (boss ENIAC, boolean), `CorredorScene` (transmissão da Lua) e `SaguaoScene` (cutscene final). Todas estendem `BaseRoomScene`, exceto a `SaguaoScene`. Chaves de cena: `"cap1-*"`.
- `ui/` — `ProgrammingConsole` (terminal de puzzle de variável; valida nome, tipo e valor — int/float/string/boolean) e `DialogueBox` (diálogo reutilizável com máquina de escrever).
  - Objeto `puzzle` esperado pelo console: `{ title, briefing[], hint, variable, expected, type?, successMessage?, wrongValueMessage? }` (o `type` é inferido de `expected` quando omitido).
- `objects/PuzzleDevice.js` — máquina interagível que abre o console com um puzzle e acende a luz indicadora ao resolver.
- `characters/` — entidades do jogo:
  - `PlayerCharacter` — protagonista jogável (movimento WASD, animações 8 direções carregadas via `import.meta.glob`).
  - `CosmoCompanion` — companheiro que flutua no ombro da protagonista; sprite de 4 direções
    (`assets/sprites/cosmo/`) que acompanha a direção da Artemis, com fallback para um
    placeholder gerado em runtime caso a textura não seja pré-carregada.
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
  abre com `unlockDoor()` e leva à `nextScene` da config.
- **Entidades** (personagens/companheiros): classe própria em `characters/`, expondo
  `update(time, delta)` e limpando recursos em `scene.events.once("shutdown", ...)`.
- Parâmetros ajustáveis (velocidade, offsets, etc.) ficam como **constantes no topo do
  arquivo** e aceitam override via `options` no construtor.
- Mensagens de commit em português (ver histórico do git).

## Assets (pixel art)

Sprites/tilesets são pixel art gerada no **Aseprite**. O executável é específico de cada
máquina — **cada dev configura o próprio caminho** (não há caminho fixo no repo). O fluxo
usado até agora é gerar por script Lua em modo batch:

```bash
# <aseprite> = caminho local do Aseprite na sua máquina
<aseprite> -b -script-param out=nome -script gera.lua   # exporta nome.png + nome.aseprite
```

Convenção de sprite de personagem/companheiro: **sheet horizontal**, quadros de 32×32, uma
direção por quadro (ex: Cosmo = frente/costas/esquerda/direita). Versione o `.aseprite`
fonte junto do `.png` em `assets/sprites/<nome>/`.

**Mapas e colisões (Tiled):** cada sala com mapa em imagem tem um `.json` do Tiled em
`assets/maps/` (camada de imagem `fundo` + camada de objetos `colisao` com retângulos).
Edite as colisões abrindo o `.json` no Tiled; a cena carrega via
`addCollidersFromTiled(mapJson, "colisao", offset)` do `BaseRoomScene`. Objetos avulsos da
sala (caixotes, barris, etc.) ficam em `assets/images/<sala>/props/` (PNG + `.aseprite`).

## Não commitar

`.env`, segredos de Supabase/OpenAI, `node_modules/`.
