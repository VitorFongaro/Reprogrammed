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

Os sentinelas da arena pré-boss (`biped_teal/`, `biped_violet/`) são **derivados** deste
sprite, recoloridos por rotação de matiz (HSV) via `tools/biped_recolor.py` — transformação
determinística (NÃO é IA generativa). Herdam a CC BY-SA 4.0 (mesma atribuição + share-alike).

### RC Car — inimigo `car`

Origem do **inimigo `car`** (`client/assets/sprites/enemies/car/`). O sheet fonte é
`RC Car Sprite Sheet.png` (192×256, grade 32×32, 8 linhas: idle/move/jump/activate/deactivate/
shoot/damage/broken) + `Projectile.png` (2 quadros 8×8). `tools/car_slice.py` fatia o sheet em
um PNG por animação (nomes minúsculos) e normaliza o projétil pra `projectile.png`. **Confirmar
autor, licença e forma de crédito com quem baixou** antes da entrega do TCC.

### Complete UI Essential Pack — UI do inventário — Crusenho ([itch.io](https://crusenho.itch.io))

Origem da UI do **inventário** (`client/assets/ui/`): `inv_slot.png` (FrameSlot02a, slot azul),
`inv_slot_sel.png` (FrameSlot02b, slot ciano do item selecionado) e `inv_select.png` (os 4 quadros
de `Select01a` do `UI_FlatAnimated`, os cantos que animam sobre o item selecionado). O painel, as
abas e os botões (USAR/DESCARTAR/FECHAR) são desenhados no código na paleta azul-ciano do jogo; os
ícones de item ainda são placeholder procedural (o pack não traz ícones de item). Licença
**CC BY 4.0**: uso/edição livres (inclusive comercial), **exige atribuição** (creditar "Crusenho
Agus Hennihuno" + link da licença). Creditar no TCC.

### Super Pixel Effects Gigapack (Free) — Will Tice / unTied Games ([itch.io](https://untiedgames.itch.io/super-pixel-effects-gigapack))

Efeitos dos **padrões novos do boss ENIAC** (`client/assets/sprites/effects/`), spritesheets
horizontais recortados do pack: `fx_lightning.png` (lightning_strike, 7×128, violeta — padrão
`lightning`), `fx_warp.png` (scifi_warp, 10×128, verde) e `fx_explosion.png` (symmetrical_explosion,
8×64, laranja — padrão `warpMines`), `fx_charge.png` (scifi_charge_up, 12×96) e `fx_spark.png`
(scifi_spark_burst, 12×128 — padrão `nova`). Carregados/animados na `BattleScene` (tabela
`BOSS_FX`). O mesmo diretório traz `fx_heal.png` (spell_heal, 16×128, um coração que estoura) —
tocado pelo `BaseRoomScene` (`playHealFx`) **tingido de verde** (`setTint` na cor de cura do jogo)
sobre a Artemis quando ela usa um item de cura FORA da batalha. Licença unTied Games: uso comercial e não-comercial OK e **empacotar com o jogo é
permitido**, mas **não se pode redistribuir o pack solto** (nem subir para asset store) e **exige
atribuição** — creditar "Super Pixel Effects Gigapack — Will Tice / unTied Games". Creditar no TCC.
(Só a versão FREE está no repo; a paga tem mais efeitos/cores.)

### Interface Sounds — Kenney ([kenney.nl](https://kenney.nl/assets/interface-sounds))

Efeitos sonoros da UI (`client/assets/audio/`, `.ogg`): `select.ogg` (bloco encaixado),
`confirm.ogg` (código correto), `error.ogg` (código errado / tempo esgotado) e `hack.ogg` (robô
inimigo invadido, na `ReprogramScene`). Carregados/tocados pelo helper `client/ui/Sfx.js`
(`Sfx.preload`/`Sfx.play`) no volume do slider de EFEITOS SONOROS da OptionsScene (`state/audio.js`).
Licença **CC0** (domínio público): uso livre (pessoal/educacional/comercial), **sem atribuição
obrigatória** — creditar "Kenney / kenney.nl" é apreciado (vale pôr no TCC).

## Arte feita no projeto

Sem restrição de licença de terceiros. Sempre com o `.aseprite` fonte versionado ao lado do
`.png`:

- `client/assets/sprites/` — Cosmo, boss do ENIAC, blocos do puzzle, arma e projétil.
- `client/assets/images/porao/porao_bg.png` — parede, porta, luminárias e emblema Elysium são
  procedurais (só o piso vem de pack).
- Props procedurais anteriores à troca pelos packs. **Vários continuam em uso** por outras
  salas — `caixote`, `banco`, `barril`, `mesa`, `palete` e `caixote_grande` aparecem nos mapas
  do capítulo 1, então não saem sem antes conferir. Hoje estão sem referência em mapa nenhum:
  `armario`, `caixote_lona`, `dreno`, `prateleira`, `ventilador` e `arquivo` (este último saiu
  quando a sala de arquivos virou sala de servidores).
- `client/assets/images/arquivos/props/server_*.png` e companhia são gerados por
  `tools/servidores.py`, no mesmo estilo dos packs mas desenhados por script — ver a seção
  seguinte.

## Arte gerada por script

`tools/servidores.py` desenha os props de sala de servidor (racks, torre, no-break, bobina,
painel de rede, ventilador...) por código, em tamanho nativo, e exporta em 2x.

Foi feito assim porque a perspectiva do jogo é 3/4 top-down com **faces alinhadas aos eixos**
— a face de cima é um retângulo logo acima da frente, sem nenhuma diagonal — com contorno
preto de 1px e paleta fechada. Modelos de imagem erram justamente essas três coisas: entregam
isometria, anti-aliasing e paleta solta. Por script, saem certas por construção.

Não usa nenhum asset de terceiros como entrada: a paleta foi medida dos props já presentes na
sala, o que é leitura de cor, não reuso de arte.

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
