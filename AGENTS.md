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
  - `IntroScene` (`"intro-scene"`) — cena de abertura no porão; diálogo com efeito máquina de escrever; a androide acorda.
  - `SpritTestScene` (`"sprit-test-scene"`) — sala de teste jogável (WASD; ESC volta ao menu).
- `characters/` — entidades do jogo:
  - `PlayerCharacter` — protagonista jogável (movimento WASD, animações 8 direções carregadas via `import.meta.glob`).
  - `CosmoCompanion` — companheiro que flutua no ombro da protagonista (placeholder 24×24 até existir sprite).
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

Não há suíte de testes nem linter configurados. Valide mudanças **rodando o jogo**
no navegador (o Vite tem HMR; um F5 recarrega a cena).

## Convenções

- **ESM** em todo o projeto (`import`/`export`, `"type": "module"`).
- **Estética visual:** fundo `#050505`, fonte `"VCR"`, paleta monocromática com acentos
  (ciano `#4ad6ff`, vermelho `#ff4545`), scanlines. Mantenha cenas novas nesse estilo.
- **Cenas Phaser:** uma classe por arquivo, `super("nome-da-cena")` em kebab-case;
  registre a cena no array `scene` de `main.js`.
- **Entidades** (personagens/companheiros): classe própria em `characters/`, expondo
  `update(time, delta)` e limpando recursos em `scene.events.once("shutdown", ...)`.
- Parâmetros ajustáveis (velocidade, offsets, etc.) ficam como **constantes no topo do
  arquivo** e aceitam override via `options` no construtor.
- Mensagens de commit em português (ver histórico do git).

## Não commitar

`.env`, segredos de Supabase/OpenAI, `node_modules/`.
