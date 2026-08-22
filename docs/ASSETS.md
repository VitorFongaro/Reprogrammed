# Assets — origem e licença

Nem toda a arte do jogo é nossa. Este arquivo registra **de onde veio cada coisa e o que a
licença permite**, porque as condições dos packs não são iguais entre si — e uma delas
proíbe justamente o tipo de uso que passa despercebido num projeto que usa agentes de IA.

Os packs baixados não são versionados no repo: só entram os recortes efetivamente usados,
já processados, em `client/assets/`. Os originais ficam na máquina de cada dev.

## Regras que valem para todos

- **Nenhum pack pode ser revendido ou redistribuído.** Vale para o repositório também: não
  commite a pasta original do pack, só os recortes usados no jogo.
- **Não use os assets de terceiros como entrada de IA generativa** (nem para treinar, nem
  para "gerar variações a partir daqui"). Os packs Post Apoc proíbem isso explicitamente, e
  é de onde vem a maior parte da nossa arte de cenário. Sprite novo no estilo do pack se
  desenha no Aseprite, à mão ou por script.
- Crédito no TCC: liste os packs abaixo com autor e link.

## Packs usados

### Post Apoc Shelter — 0-mem0ry ([itch.io](https://0-mem0ry.itch.io/))

Origem dos **props do porão** (prateleiras, caixotes, barris, mesa, cadeira, armários,
cilindros de gás, prancheta, placas de perigo/radiação e o gerador), em
`client/assets/images/porao/props/`.

> These assets may be used for commercial and non-commercial projects. Asset pack may be
> used/modified — but may not be resold or redistributed. Assets may not be used for AI/nft
> or AI learning.

### Post Apoc Office — 0-mem0ry ([itch.io](https://0-mem0ry.itch.io/))

Mesma licença do Shelter, mesmo autor. Baixado e disponível; compartilha a paleta com o
Shelter, então serve para as salas seguintes sem quebrar a unidade visual.

### Sci-Fi Facility — Murphy's Dad ([itch.io](https://murphysdad.itch.io/sci-fi-facility))

Origem do **computador do ponto de salvamento** (`computer_spritesheet.png`, os 2 quadros
do LED piscando) e da **tela de monitor** usada pelo `SaveConsole`.

> CC0: use this however you like. Crediting is appreciated but not necessary.

Único pack sem restrição — é o mais seguro quando houver dúvida. A licença está copiada em
`client/assets/sprites/computador/CREDITOS.txt`, junto dos arquivos usados.

### Parede/piso (versão DEMO) — Trevor Pupkin ([itch.io](https://trevor-pupkin.itch.io/))

Origem dos **tiles de piso do porão**, carimbados por `tools/porao_piso.lua` e
`tools/porao_parede.lua` a partir de `tileset x2.png` (com `darken = 0.6`, para casar com a
paleta quase preta do jogo).

> This asset pack can be used in both free and commercial projects. You can modify it to
> suit your own needs. You may not redistribute or resell it.

É a **versão demo**, com poucos tiles — foi por isso que a parede do fundo do porão continuou
procedural em vez de virar tile do pack. Se a parede for trocada de verdade, provavelmente é
com o Post Apoc Office/Shelter ou com a versão completa deste pack.

### SteamRobotsPack — inimigos robôs

Origem dos **inimigos** `exploding` (kamikaze), `pistol` e `shotgun`
(`client/assets/sprites/enemies/`, recortes por tag: walk/idle/shoot/explode/disabled, 32×32),
mais o `.ase` fonte de cada um. O pack não trouxe arquivo de licença próprio — **confirmar
autor, licença e forma de crédito com quem baixou** antes da entrega do TCC.

### biped_robot — Silver Ink ([itch.io](https://silverink.itch.io/))

Origem do **inimigo `biped`** (mech vermelho, `client/assets/sprites/enemies/biped/`).
Licença **CC BY-SA 4.0**: uso livre (comercial e não-comercial), mas **exige atribuição**
(creditar "Silver Ink") **e share-alike** (derivados herdam a mesma licença). Creditar no TCC.

## Arte feita no projeto

Sem restrição de licença de terceiros. Sempre com o `.aseprite` fonte versionado ao lado do
`.png`:

- `client/assets/sprites/` — Cosmo, boss do ENIAC, blocos do puzzle, arma e projétil.
- `client/assets/images/porao/porao_bg.png` — parede, porta, luminárias e emblema Elysium são
  procedurais (só o piso vem de pack).
- Props em `client/assets/images/porao/props/` que **não** aparecem no `porao.json`
  (`armario`, `banco`, `barril`, `caixote`, `caixote_grande`, `caixote_lona`, `dreno`, `mesa`,
  `palete`, `prateleira`, `ventilador`) são da geração procedural anterior à troca pelos
  packs. Estão sem uso; dá para apagar quando houver certeza de que nenhuma sala futura vai
  reaproveitá-los.

## Arte gerada por IA

A **Artemis** (`client/assets/sprites/A_cute_android_maid_with/`, 8 direções + animações) foi
gerada por uma ferramenta de sprites por prompt; o prompt, o tamanho (60×60), as 8 direções e
a data ficaram registrados em `client/assets/sprites/metadata.json`. As imagens soltas
`ChatGPT Image *.png` na mesma pasta são referências, também geradas.

Duas consequências práticas:

1. **Declare isso no TCC.** Arte gerada por IA no trabalho precisa estar dita no texto, não
   descoberta pela banca no repositório.
2. Isso **não** conflita com a cláusula anti-IA dos packs Post Apoc: o que eles proíbem é usar
   a arte *deles* como entrada de treino ou de geração. A Artemis foi gerada antes e à parte.
   O que continua proibido é pedir a uma IA "faça um sprite no estilo destes aqui" passando os
   assets do pack.
