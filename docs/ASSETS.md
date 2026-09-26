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

Os inimigos provisórios do cap. 2 (`vigia` e `faxineiro`) reusam estas folhas com **tint** em
runtime (nenhum arquivo novo), então caem na mesma pendência de licença.

### Bot Wheel — inimigo `mensageiro`

Origem do **inimigo `mensageiro`** (cap. 2, `client/assets/sprites/enemies/mensageiro/`): um
robô de uma roda só, com animações de dormente, acordar, rolar, carregar, atirar e morrer.
É o primeiro inimigo do cap. 2 com arte PRÓPRIA (os outros dois são tint sobre o
SteamRobotsPack), por isso ele não leva `tint` nenhum.

O pack vem ao contrário do nosso formato: cada animação é uma tira **vertical** de quadros
117×26, e o desenho ocupa só a faixa `x 5..37` (o resto é sobra para o rastro da investida, que
chega a `x=117`). `tools/mensageiro_sheets.py` recorta essa faixa, centraliza e empilha na
horizontal, em quadros de **36×32** — daí o `fw` no `SHEETS` do `Enemy.js`, porque o desenho
não cabe nos 32 de largura dos outros.

O **"GAS dash"** é caso à parte. Ele vem em duas camadas ("with FX" e o rastro sozinho), e o
robô desenhado ali não está onde está nas outras animações: fica lá na direita, em `x 87..113`
(centro ~100), com o gás saindo para a esquerda. Em vez de recortar, o script exporta o
**rastro sozinho** em largura cheia (`dash.png`, quadros de 117×32) e o jogo desenha isso como
um sprite separado com `setOrigin(100/117, 0.5)` — casar esse ponto com o robô recompõe
exatamente o quadro do pack, em qualquer lugar do mapa e a qualquer velocidade.

Decisões que valem saber, porque cada uma delas foi um erro antes de virar regra:

- O rastro fica **parado no mundo**. Gás não acompanha quem o soltou; grudá-lo no sprite faz a
  nuvem inteira deslizar junto com o robô.
- É ancorado no ponto de **chegada** da investida, não no de partida — o robô está desenhado na
  ponta do risco, então ancorar no fim é o que faz o gás cair em cima do trajeto.
- Como a âncora é a chegada, o desenho todo existe desde a largada: por isso o sprite nasce com
  `setCrop` e vai sendo **revelado** conforme a investida avança, com o corte acompanhando a
  posição do robô. Sem isso o risco inteiro aparece antes de ele sair do lugar.
- Ele **gira** com o ângulo da investida, com `setFlipY` quando `cos(ângulo) < 0`, senão a
  rotação jogaria o gás para cima nos ângulos voltados à esquerda.

Como o SteamRobotsPack e o RC Car, o pack não trouxe arquivo de licença — **confirmar autor,
licença e forma de crédito com quem baixou** antes da entrega do TCC.

### biped_robot — Silver Ink ([itch.io](https://silverink.itch.io/))

Origem do **inimigo `biped`** (mech vermelho, `client/assets/sprites/enemies/biped/`).
Licença **CC BY-SA 4.0**: uso livre (comercial e não-comercial), mas **exige atribuição**
(creditar "Silver Ink") **e share-alike** (derivados herdam a mesma licença). Creditar no TCC.

Os sentinelas da arena pré-boss (`biped_teal/`, `biped_violet/`) são **derivados** deste
sprite, recoloridos por rotação de matiz (HSV) via `tools/biped_recolor.py` — transformação
determinística (NÃO é IA generativa). Herdam a CC BY-SA 4.0 (mesma atribuição + share-alike).
A arte PROVISÓRIA da LEO (boss do cap. 2, `biped_maid/`, rosa) sai do mesmo script e tem a
mesma licença.

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

Efeitos dos **padrões de bullet hell** (`client/assets/sprites/effects/`), spritesheets
horizontais recortados do pack: `fx_lightning.png` (lightning_strike, 7×128, violeta — padrão
`lightning`), `fx_warp.png` (scifi_warp, 10×128, verde) e `fx_explosion.png` (symmetrical_explosion,
8×64, laranja — padrão `warpMines`), `fx_charge.png` (scifi_charge_up, 12×96) e `fx_spark.png`
(scifi_spark_burst, 12×128 — padrão `nova`). Carregados/animados por `client/ui/Effects.js`, que é
o dono da tabela de quadros/fps: usam-no a `BattleScene` (ENIAC, LEO) e o `DodgeBox` (padrão
`laserLane` do mensageiro, que reusa carga + faísca + explosão como o canhão carregando, o clarão
do tiro e o estouro do feixe na parede oposta). O mesmo diretório traz `fx_heal.png` (spell_heal, 16×128, um coração que estoura) —
tocado pelo `BaseRoomScene` (`playHealFx`) **tingido de verde** (`setTint` na cor de cura do jogo)
sobre a Artemis quando ela usa um item de cura FORA da batalha. Licença unTied Games: uso comercial e não-comercial OK e **empacotar com o jogo é
permitido**, mas **não se pode redistribuir o pack solto** (nem subir para asset store) e **exige
atribuição** — creditar "Super Pixel Effects Gigapack — Will Tice / unTied Games". Creditar no TCC.
(Só a versão FREE está no repo; a paga tem mais efeitos/cores.)

### Super Pixel Fantasy FX Pack 3 (Free) — Will Tice / unTied Games

Mesmo autor e **mesma licença** do Gigapack acima (empacotar no jogo pode, redistribuir o pack
solto não, crédito obrigatório — "Super Pixel Fantasy FX Pack 3 — Will Tice / unTied Games" — e
proibido usar como material de treino de IA).

### Efeitos da WITCH (boss do cap. 2) — dos dois packs acima

Os packs entregam um PNG por quadro, em "large" e "small"; `tools/fx_sheets.py` empilha o
**large** de cada um numa tira em `client/assets/sprites/effects/` (cada tamanho é desenhado à
mão, então escalar um no lugar do outro borra). Carregados por `client/ui/Effects.js`.

| arquivo | origem | uso |
|---|---|---|
| `fx_haste.png` | Fantasy FX 3 — haste (verde) | o relógio da batalha por turnos, grande e lento (12 fps); de trás para frente quando rebobina. **Só na fase 2** |
| `fx_death.png` | Fantasy FX 3 — death (vermelho) | a SENTENÇA: o 死 pincelado é o aviso, a caveira em chamas (quadros 32–44) é o dano |
| `fx_rage.png` | Fantasy FX 3 — attack up | a fúria, na metade do fôlego |
| `fx_skull.png` | Gigapack — stylized skull smoke burst | ela some no passo no tempo |
| `fx_portal.png` | Gigapack — scifi warp 002 (vermelho) | onde ela vai reaparecer |
| `fx_arrive.png` | Gigapack — scifi warp 003 (azul) | a chegada pelo portal |
| `fx_impact.png` | Gigapack — directional impact 003 (violeta) | o golpe da foice |
| `fx_ring.png` | Gigapack — symmetrical impact 002 (azul) | cada anel da badalada |
| `fx_burst.png` | Gigapack — stylized explosion 002 (violeta) | o golpe do eco |
| `fx_alert.png` | Gigapack — symbol alert 001 (vermelho) | o "!" antes dos golpes de perto/área |
| `fx_dizzy.png` | Gigapack — status sparkling 001 | ela tonta, sem fôlego (a janela do `[R]`) |

### WITCH — boss final do cap. 2

`client/assets/sprites/boss/witch/walk.png` (5×4) e `attack.png` (10×4), quadros de **144×144**,
uma linha por direção (norte, sul, leste, oeste). Entraram no repo como vieram, sem conversão: a
grade já é o formato de spritesheet do Phaser. **Origem e licença ainda não registradas** — anotar
aqui de onde a arte veio (e a forma de crédito) antes da entrega do TCC.

### Interface Sounds — Kenney ([kenney.nl](https://kenney.nl/assets/interface-sounds))

Efeitos sonoros da UI (`client/assets/audio/`, `.ogg`): `select.ogg` (bloco encaixado),
`confirm.ogg` (código correto), `error.ogg` (código errado / tempo esgotado) e `hack.ogg` (robô
inimigo invadido, na `ReprogramScene`). Carregados/tocados pelo helper `client/ui/Sfx.js`
(`Sfx.preload`/`Sfx.play`) no volume do slider de EFEITOS SONOROS da OptionsScene (`state/audio.js`).
Licença **CC0** (domínio público): uso livre (pessoal/educacional/comercial), **sem atribuição
obrigatória** — creditar "Kenney / kenney.nl" é apreciado (vale pôr no TCC).

### SweetSounds SFX — Coffee "Valen" Bat ([itch.io](https://valenbat.itch.io/sweetsounds))

Efeitos sonoros de **inimigos, menu e inventário** (`client/assets/audio/`, chiptune estilo Game Boy,
convertidos de WAV para `.ogg`): `gun.ogg` (tiro de inimigo com arma — pistol/shotgun, no
`Enemy.shoot`), `laser.ogg` (tiro da torreta do carro, no `Enemy.carShoot`), `bump.ogg` (o biped
atingindo o chão no slam, no `Enemy.slamAttack`), `crunch.ogg` (card iniciar/continuar encaixado no
espaço EXECUTAR do menu, no `GameScene.executeCard`), `menu_in.ogg` e `menu_out.ogg` (inventário
abrindo/fechando, na `InventoryScene`). Tocados pelo mesmo helper `Sfx` (tiros com `volumeScale`
menor para não dominarem). Licença: uso livre inclusive comercial; **atribuição pedida** — creditar
"Sound Effects by Coffee 'Valen' Bat" (doar no itch.io é apreciado). Creditar no TCC.

## Arte feita no projeto

Sem restrição de licença de terceiros. Sempre com o `.aseprite` fonte versionado ao lado do
`.png`:

- `client/assets/sprites/` — boss do ENIAC, blocos do puzzle, arma e projétil.
- `client/assets/sprites/cosmo/` — o **Cosmo** foi redesenhado com o `aseprite-mcp` (servidor MCP
  que dirige o Aseprite em modo batch), a pedido do dev, por comandos de desenho geométrico:
  círculos concêntricos para a rampa da esfera, `copy_region` para clonar a carcaça nas quatro
  direções, elipses para as lentes e o contorno nativo do Aseprite. Não é modelo de imagem
  generativo e não usa asset de terceiros como entrada — mas foi feito por um agente de IA
  operando a ferramenta, então **vale declarar no TCC** junto com a Artemis. O `.aseprite` ao
  lado é a fonte editável.
- `client/assets/images/porao/porao_bg.png` — parede, porta, luminárias e emblema Elysium são
  procedurais (só o piso vem de pack).
- Props procedurais anteriores à troca pelos packs. **Nenhum está mais em uso**: a sala de
  controle era a última que os referenciava e passou para os props de pack junto com as outras.
  Hoje estão sem referência em mapa nenhum `armario`, `banco`, `barril`, `caixote`,
  `caixote_grande`, `caixote_lona`, `dreno`, `mesa`, `palete`, `prateleira`, `ventilador` e
  `arquivo` (este saiu quando a sala de arquivos virou sala de servidores).

  Ficam no repositório de propósito, com o `.aseprite` fonte ao lado: são arte NOSSA, sem
  licença de terceiros, e servem de base rápida se aparecer uma sala nova antes de haver arte
  de pack para ela. Se a decisão for limpar, some a pasta inteira de uma vez — não há mapa
  para quebrar.
- `client/assets/images/arquivos/props/server_*.png` e companhia são gerados por
  `tools/servidores.py`, no mesmo estilo dos packs mas desenhados por script — ver a seção
  seguinte.

## Arte gerada por script

`tools/treinamento_bg.py` monta o fundo da sala de treinamento (parede, piso do pack e as
marcações do campo de tiro), **pinta o nome da sala na parede** em estêncil desgastado (tipo 5x7
no próprio arquivo; o desgaste é sorteado por LASCA e não por pixel, senão a letra vira chuvisco
em vez de tinta velha) e **carimba a porta a partir de `controle_bg.png`**. A porta padrão
do capítulo foi desenhada no Aseprite e não tem gerador versionado, então copiar a arte é o
único jeito de a sala não ficar com uma porta diferente das outras — foi exatamente o que
aconteceu na primeira versão, que desenhava um portão de ripas por conta própria.

`tools/painel_laser.py` desenha o painel do puzzle da sala de treinamento — o último
`PuzzleDevice` do capítulo que ainda usava o corpo procedural da classe (um retângulo preto com
ranhuras). Reaproveita o `Sprite` do `servidores.py`. O tamanho nativo não é livre: 42x66 (84x132
em 2x) é o tamanho padrão do `PuzzleDevice`, que define a caixa do alvo de `[R]` e onde a luz
indicadora é desenhada — por isso o sinalizador do prop está centrado no pixel nativo (21, 7),
que é exatamente onde a luz do código acende.

`tools/servidores.py` desenha os props de sala de servidor (racks, torre, no-break, bobina,
painel de rede, ventilador...) por código, em tamanho nativo, e exporta em 2x.

Foi feito assim porque a perspectiva do jogo é 3/4 top-down com **faces alinhadas aos eixos**
— a face de cima é um retângulo logo acima da frente, sem nenhuma diagonal — com contorno
preto de 1px e paleta fechada. Modelos de imagem erram justamente essas três coisas: entregam
isometria, anti-aliasing e paleta solta. Por script, saem certas por construção.

Não usa nenhum asset de terceiros como entrada: a paleta foi medida dos props já presentes na
sala, o que é leitura de cor, não reuso de arte.

**Recepção do térreo (cap. 2).** Os móveis (`client/assets/images/recepcao/props/`: balcão,
catracas nos três estados, floreira, sofá, poltrona, mesa de centro, ficus, bebedouro, totem,
lixeira e posto da segurança) saem de `tools/recepcao_props.lua`, um script do **Aseprite** em
modo batch, no mesmo estilo e com as mesmas regras do `servidores.py` (3/4 com faces nos eixos,
contorno de 1px, nativo exportado em 2x), e salvam o `.aseprite` ao lado de cada `.png`. O
fundo (`recepcao/recepcao_bg.png`: parede, janelas, elevador, letreiro da Elysium, piso de
pedra e a luz das janelas) sai de `tools/recepcao_bg.py`, que reaproveita o estêncil 5x7 e o
carimbo da porta do `treinamento_bg.py`. Nada de pack entra como entrada: é arte nossa, feita
por script escrito por um agente de IA — declarar no TCC junto com os outros.

**Cards do site (`client/assets/images/site/`).** As imagens das abas SOBRE, PERSONAGENS e
GAMEPLAY da página inicial saem de `tools/site_cards.py`, que só MONTA arte que já está no
repositório (fundos das salas, mapas do Tiled, sprites, blocos do console e a fonte VCR) — nada
é desenhado ou gerado ali. Os retratos do **Cosmo** e da **ADA** são desenhados por
`tools/site_retratos.lua` no Aseprite (a ADA nunca aparece no jogo, então o retrato é um olho
num monólito ligado a uma rede de chips). O card **HISTÓRIA** (a Lua, o sinal descendo, a
torre da Elysium e a androide acordando no subsolo) foi **gerado pelo GPT (ChatGPT, geração de
imagem)** a partir de um prompt descrevendo a cena, com a referência da Artemis anexada (ela
também é gerada por IA; nenhum asset de pack foi usado como entrada). O original fica em
`site/fonte/historia_gpt.png` e o `site_cards.py` só o recorta no formato do card. O retrato da **Artemis** é um recorte da referência
`ChatGPT Image 22 de mai. de 2026, 19_59_11.png`, gerada por IA (ver a seção abaixo). Como os
cards mostram arte de pack (fundos, inimigos), valem as licenças de cada pack — exibir o jogo na
página dele não é o que as cláusulas anti-IA proíbem.

## Arte e áudio gerados por IA

A **Artemis** (`client/assets/sprites/A_cute_android_maid_with/`, 8 direções + animações) foi
gerada por uma ferramenta de sprites por prompt; o prompt, o tamanho (60×60), as 8 direções e
a data ficaram registrados em `client/assets/sprites/metadata.json`. As imagens soltas
`ChatGPT Image *.png` na mesma pasta são referências, também geradas.

As **músicas** (`client/assets/audio/music/`) também são geradas por IA, as três da mesma origem:
`menu.mp3` (entregue como `The_Solitude_of_Iron.mp3`) no menu principal, `cap1_subsolo.mp3`
(`Sector_Siege.mp3`) em loop pelo capítulo 1, e `boss.mp3` (`Fango_d_Argento.mp3`) no embate com o
boss de capítulo. Ver `ui/Music.js`. Se ainda der para recuperar a ferramenta e os prompts usados,
vale anotar aqui: a declaração no TCC fica mais forte com a origem específica do que com um "gerado
por IA" genérico.

Duas consequências práticas:

1. **Declare isso no TCC.** Arte e áudio gerados por IA no trabalho precisam estar ditos no
   texto, não descobertos pela banca no repositório.
2. Isso **não** conflita com a cláusula anti-IA dos packs Post Apoc: o que eles proíbem é usar
   a arte *deles* como entrada de treino ou de geração. A Artemis foi gerada antes e à parte.
   O que continua proibido é pedir a uma IA "faça um sprite no estilo destes aqui" passando os
   assets do pack.
