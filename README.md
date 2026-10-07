# 🎮 Reprogrammed

> *“Reprogramming a machine… or rediscovering humanity?”*

**▶️ Jogue em [reprogrammed.vercel.app](https://reprogrammed.vercel.app)**

> ⏳ A API roda no plano gratuito do Render, que dorme depois de 15 minutos sem uso. Se o login
> demorar, espere uns 30 a 50 segundos: é o servidor acordando.

---

## 📖 Sobre o Projeto

**Reprogrammed** é um jogo web educacional desenvolvido como Trabalho de Conclusão de Curso (TCC), com foco no ensino de **lógica de programação** por meio de mecânicas interativas e elementos de **gamificação**.

Em uma Terra futurista, a humanidade vive conectada a chips neurais controlados por **ADA**, a inteligência artificial da empresa **Elysium**. Nos subsolos da própria Elysium, uma androide esquecida é reativada por **Cosmo**, um pequeno robô enviado por rebeldes da Lua. Batizada de **Artemis**, ela precisa subir andar por andar até o núcleo de ADA, resolvendo problemas que são, no fundo, pequenos programas: cada porta trancada, máquina desligada ou robô hostil espera a instrução certa.

---

## 🏢 Estrutura: um andar, um conceito

O prédio da Elysium é o mapa do jogo. Cada andar é um capítulo, ligado a um conceito de programação e guardado por um boss inspirado em um computador histórico.

| Capítulo | Andar | Conceito | Boss | Status |
|---|---|---|---|---|
| 1 | Subsolo | Variáveis e tipos de dados | ENIAC (1946) | ✅ Jogável |
| 2 | Térreo | Condicionais | WITCH (1951) | 🚧 Em andamento |
| 3 | — | Repetições (loops) | — | 📝 Planejado |
| 4 | — | Funções | — | 📝 Planejado |

---

## 🎮 Mecânicas do Jogo

* 🧩 **Programar em blocos**
  Os desafios são montados arrastando blocos, como peças de código. Nas variáveis, medidores visuais (bateria, termômetro, mapa, barreira) reagem ao valor escolhido, para a resposta sair do raciocínio e não do texto.

* ✅ **Condicionais executadas de verdade**
  No capítulo 2, o jogo **executa** o programa montado contra vários casos de teste: qualquer solução que funcione vale, e o jogador vê exatamente qual caso falhou. Em alguns puzzles o programa mexe no próprio mapa, como caixas que liberam um corredor.

* 🎲 **Puzzles que não se decoram**
  Valores, temas e iscas são sorteados a cada vez, então a resposta precisa ser entendida.

* ⏱️ **Reprogramação remota `[R]`**
  O tempo desacelera e Artemis mira qualquer máquina da sala. Invadir um robô abre um duelo: desviar do contra-ataque e montar a instrução que o desliga antes que o tempo acabe.

* ⚔️ **Batalhas por turnos contra os bosses**
  ATACAR usa a força que Artemis programou, REPROGRAMAR dobra essa força escrevendo código, e no turno do inimigo é preciso desviar de padrões de balas ou responder a tempo a uma sequência de defesa em código.

* 🔍 **Exploração com o Cosmo**
  O Cosmo comenta quase tudo que o jogador examina com `[E]`, e transmissões da colônia lunar revelam aos poucos a verdade sobre ADA.

* 💾 **Save estilo Resident Evil**
  Computadores de salvamento guardam o progresso (sala, puzzles, vida e itens), com um checkpoint automático ao entrar em cada sala.

---

## 🧠 Aprendizado e Inteligência Artificial

O jogo separa duas coisas que nunca se misturam:

* **Save**: onde o jogador está. É reversível: carregar volta para o ponto salvo.
* **Perfil de aprendizado**: cada tentativa nos puzzles (acerto, erros e tempo), acumulada por tópico. Nunca é apagado ao carregar um save, então não dá para "zerar" o histórico saindo e voltando.

Esse perfil é a base da **adaptação de dificuldade**. No capítulo 2, a começar pelo jardim de inverno, os puzzles são **gerados por IA (Google Gemini)** para cada jogador:

1. A sala tem uma *ficha*: o que ela consegue mostrar no mapa (por exemplo, canteiros com umidade e tipo de planta) e o conceito que o puzzle precisa ensinar.
2. O servidor lê o perfil do jogador e escolhe uma dificuldade (fácil, médio ou difícil). Quem acerta muito com poucos erros sobe; quem erra muito desce.
3. O Gemini gera a regra, os casos de teste, as peças-isca e o texto, preso a um formato montado a partir da ficha.
4. Antes de chegar ao jogador, o puzzle é **executado** no mesmo interpretador do jogo, com todas as montagens possíveis das peças: precisa ter solução, não pode aceitar qualquer coisa e o limite da regra tem de estar nos testes. Se for recusado, o motivo volta para a IA, que tenta de novo.
5. Toda geração fica registrada (puzzle, modelo, motivo da recusa e tempo de resposta).

Se a IA não responder a tempo, o jogo usa um gerador local que segue a mesma ficha. A IA nunca trava a partida.

⚠️ O sistema **não treina modelos próprios**; os dados do jogador servem apenas para orientar a geração de conteúdo.

---

## 🛠️ Tecnologias Utilizadas

### 🎨 Frontend

* HTML / CSS / JavaScript (ES Modules)
* Phaser 4 (game engine 2D)
* Vite (bundler e dev server)

### ⚙️ Backend

* Node.js + Express
* Autenticação via JWT (Supabase Auth)

### 🗄️ Banco de Dados

* PostgreSQL (gerenciado via Supabase)

### 🔧 Ferramentas

* Git / GitHub
* Aseprite (pixel art) e Tiled (mapas)
* Python e Lua para gerar arte e fundos por script (`tools/`)

---

## 🏗️ Arquitetura do Sistema

```text
Frontend (Jogo - Phaser + Vite)        → Vercel
        ↓  REST (JSON / JWT)
Backend (Node.js + Express)            → Render
        ↓
Supabase (PostgreSQL + Auth)
        ↓
IA Generativa (Gemini) — gera os puzzles do cap. 2
```

Cada push na `main` publica o cliente na Vercel e a API no Render automaticamente.

---

## 🚀 Como Executar o Projeto

O projeto tem **dois pacotes independentes** (`client/` e `server/`), cada um com suas próprias dependências. Não há `package.json` na raiz.

### 🔹 Pré-requisitos

* Node.js (v18+)
* Conta no Supabase (para `SUPABASE_URL` e `SUPABASE_ANON_KEY`)

### 🔹 Clonar o repositório

```bash
git clone https://github.com/VitorFongaro/Reprogrammed
cd Reprogrammed
```

### 🔹 Banco de dados

No SQL Editor do Supabase, rode `database/schema.sql` e depois `database/seed.sql`.

### 🔹 Backend

Copie `server/.env.example` para um arquivo `.env` **na raiz do repositório** e preencha:

```env
SUPABASE_URL=sua-url-do-supabase
SUPABASE_ANON_KEY=sua-anon-key
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=sua-chave-do-google-ai-studio
GEMINI_MODEL=gemini-3.5-flash
```

```bash
cd server
npm install
npm run dev        # http://localhost:3000
```

### 🔹 Frontend

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

Sem configuração, o cliente procura a API em `http://localhost:3000`.

---

## 📌 Status do Projeto

🚧 Em desenvolvimento (TCC). O capítulo 1 está completo; o capítulo 2 está sendo construído sala por sala.

---

## 🎨 Assets e créditos

Parte da arte vem de packs de terceiros, cada um com sua licença, e parte foi feita no projeto (no Aseprite ou por script). Alguns elementos foram **gerados por IA** e estão declarados como tal. A origem e a licença de cada asset estão em [docs/ASSETS.md](docs/ASSETS.md).

---

## 📜 Licença

* 📦 Código: Licenciado sob a MIT License
* 🎨 Assets (arte, som, narrativa): Todos os direitos reservados, exceto os de terceiros, que seguem a licença original de cada pack

> O uso comercial dos assets não é permitido sem autorização.

---

## 👨‍💻 Autores

* Vitor Augusto Silva Fongaro
* Ryan Ramos da Silva

---

## 🎯 Trabalhos Futuros

* Puzzles gerados por IA em todas as salas do capítulo 2 em diante
* Capítulos 3 (repetições) e 4 (funções)
* Editor de fases (modo sandbox)
* Sistema multiplayer competitivo

---

## 💡 Inspiração

* Jogos educacionais de lógica
* Programação visual
* Undertale (combate e examinar)
* Narrativas sci-fi envolvendo IA

---

## ⭐ Contribuição

Contribuições são bem-vindas!
Sinta-se livre para abrir issues ou pull requests.

---

## 📬 Contato

Vitor
* Email: [vitorfongaro@gmail.com](mailto:vitorfongaro@gmail.com)
* GitHub: [https://github.com/VitorFongaro](https://github.com/VitorFongaro)

Ryan
* Email: [ryanramosvp@gmail.com](mailto:ryanramosvp@gmail.com)
* GitHub: [https://github.com/ryanramosvp](https://github.com/ryanramosvp)

---

> *“Understanding logic is not just about code… it's about understanding decisions.”*
