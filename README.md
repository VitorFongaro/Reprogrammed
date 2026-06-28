# 🎮 Reprogrammed

> *“Reprogramming a machine… or rediscovering humanity?”*

## 📖 Sobre o Projeto

**Reprogrammed** é um jogo web educacional desenvolvido como Trabalho de Conclusão de Curso (TCC), com foco no ensino de **lógica de programação** por meio de mecânicas interativas e elementos de **gamificação**.

O jogo coloca o jogador no controle de uma androide que desperta em um mundo controlado por uma Inteligência Artificial dominante. Ao longo da jornada, o jogador resolve desafios lógicos que representam conceitos fundamentais da programação, enquanto influencia a própria IA a reconsiderar suas diretrizes.

---

## 🧠 Objetivo

Ensinar conceitos como:

* Sequência lógica
* Condicionais
* Loops (repetições)
* Variáveis
* Funções
* Resolução de problemas

Tudo isso de forma **lúdica, interativa e progressiva**.

---

## 🎮 Mecânicas do Jogo

* 🧩 **Fases de lógica**
  Monte sequências de instruções para resolver desafios.

* ⚙️ **Sistema de execução**
  Veja sua lógica sendo executada em tempo real.

* 🧠 **Adaptação inteligente**
  O sistema analisa seu desempenho e ajusta os desafios.

* ⚔️ **Batalha final (RPG por turnos)**
  Responda corretamente para atacar ou evitar dano.

* 🤖 **Narrativa dinâmica**
  Suas decisões influenciam a evolução da IA.

---

## 🤖 Inteligência Artificial

O backend já expõe a rota `/ai` e a integração com **IA generativa (OpenAI)** está em implementação, com o objetivo de:

* Gerar desafios automaticamente
* Adaptar o nível de dificuldade
* Personalizar a experiência do jogador

⚠️ O sistema **não treina modelos próprios**; os dados do usuário servem apenas para orientar a geração de conteúdo.

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
* Supabase (BaaS — banco de dados e autenticação)

---

## 🏗️ Arquitetura do Sistema

```text
Frontend (Jogo - Phaser + Vite)
        ↓  REST (JSON / JWT)
Backend (Node.js + Express)
        ↓
Supabase (PostgreSQL + Auth)
        ↓
IA Generativa (OpenAI) — em implementação
```

---

## 📊 Funcionalidades

* Sistema de login e cadastro
* Salvamento de progresso
* Análise de desempenho do jogador
* Geração dinâmica de desafios
* Sistema de pontuação e progressão

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

### 🔹 Backend

```bash
cd server
npm install

# Crie um arquivo .env (veja o exemplo abaixo) e então:
npm run dev        # http://localhost:3000
```

Exemplo de `server/.env`:

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=sua-url-do-supabase
SUPABASE_ANON_KEY=sua-anon-key
```

### 🔹 Frontend

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

---

## 📌 Status do Projeto

🚧 Em desenvolvimento (TCC)

---

## 📜 Licença

* 📦 Código: Licenciado sob a MIT License
* 🎨 Assets (arte, som, narrativa): Todos os direitos reservados

> O uso comercial dos assets não é permitido sem autorização.

---

## 👨‍💻 Autores

* Vitor Augusto Silva Fongaro
* Ryan Ramos da Silva

---

## 🎯 Trabalhos Futuros

* Implementação de Machine Learning para recomendação
* Sistema multiplayer competitivo
* Expansão da narrativa
* Editor de fases (modo sandbox)

---

## 💡 Inspiração

* Jogos educacionais de lógica
* Programação visual
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
