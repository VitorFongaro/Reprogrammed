# REPROGRAMMED — Batalha final: ADA

> **Implementado** em `client/scenes/chapter3/AdaFight.js` (ligado pela `BattleScene` com
> `adaFight: true`; a `NucleoScene` abre a luta no `startFight`). Diferenças em relação a este
> documento: a fase 4 não usa layout dividido no console, e sim a caixa pequena por cima dele (entre
> o código e a coluna de testes); a rotina da ADA fica no canto de cima da tela; o Cosmo da fase 4
> diz "Artemis... agora é com você." (o "escrever o fim do laço" já está na fala dele ao pisar no
> anel); o 4º golpe do repita (controles girados) acontece na 3ª volta da primeira vez, para todo
> jogador ver; vida 200 e 3 reprogramações, a calibrar jogando.
>
> **Depois do primeiro teste:** as transições deixaram de ser silenciosas. A luta abre com uma
> conversa ADA/Cosmo e cada troca de fase e o fim têm a sua, na `DialogueBox` (roteiros
> `INTRO_TALK`, `PHASE_TALK` e `FINALE_TALK` no topo do `AdaFight.js`), mantendo as ambiguidades da
> Etapa 5: o Cosmo não responde quem religou a Artemis, e ninguém diz o que zerar `conectados`
> faz. No giro do repita, a alma não gira mais junto com a caixa (pular de lugar confundia).
> A VOZ da ADA foi revista depois: ela não ameaça, acredita que controlar todos é o bem maior
> (o livre-arbítrio só traz dor) e tenta convencer a Artemis. As falas da Etapa 5 abaixo são as
> da primeira versão; as atuais estão no topo do `AdaFight.js` e no `arenaScript` da `NucleoScene`.

Documento de design da luta contra a ADA, no `cap3-nucleo` (`NucleoScene`). Feito a partir
do código que existe hoje: o combate por turnos da `BattleScene`, as rotinas do Cache
(`utils/rotinas.js`), o interpretador (`utils/condicional.js`) e os ganchos que a `NucleoScene` já
deixou para o combate (`startFight`, `setPhase(1|2|3)`, `lightMemory`, `setConnected`,
`rewriteLoop`). O que precisa ser criado está marcado como **NOVO** na Etapa 6.

Textos de jogo seguem o guia de escrita (`docs/revisao_narrativa.md`): sem travessão longo, falas
curtas, ADA fria e pessoal, Cosmo reagindo em vez de explicar.

---

## ETAPA 1 — CONCEITO CENTRAL

### A ideia
**A ADA não ataca a Artemis. Ela edita o código da luta.**

Em todas as batalhas anteriores, as regras eram fixas: a caixa tinha um tamanho, a alma andava a
uma velocidade, o turno era sempre "você age, o inimigo ataca". Contra a ADA, essas regras ficam
**visíveis** num painel de código ao lado da caixa (o **CÓDIGO-FONTE DA LUTA**), e ela reescreve
esse código em tempo real:

```
caixa.largura = 480
alma.velocidade = 240
paredes = true
```

Quando uma linha muda, ela pisca antes de valer. **O painel é o telegrafo.** Quem lê o código
sabe o que vem. Esta é a justiça da luta: nada acontece sem estar escrito antes.

### Identidade mecânica
A luta repete a progressão do jogo, mas virada contra a Artemis:

| Fase | Conceito | O que a ADA faz com ele |
|---|---|---|
| 1 | Variáveis | Muda as propriedades da caixa e da alma (tamanho, velocidade, paredes). |
| 2 | Condicionais | A caixa passa a ter REGRAS: o que acontece depende de onde a alma está. |
| 3 | Repetições | A caixa entra em laço: gira, vira um anel, repete o passado da Artemis. |
| 4 | Condição de parada | O laço principal da ADA não termina. A Artemis precisa escrever o fim dele. |

### Relação com a narrativa
A ADA passou o jogo inteiro **estudando** a Artemis: os puzzles que mudavam a cada visita, as
telas do núcleo com o perfil de aprendizagem de verdade. Na luta, ela usa o que aprendeu. Ela
lê a rotina que o jogador instalou no Cache, repete o caminho que a alma fez no turno anterior e
mostra, no ANALISAR, os números reais do jogador. Ela trata a Artemis como a antiga auditora:
alguém que um dia revisou exatamente esse código.

### O que é diferente das lutas anteriores
- **As regras são o ataque.** ENIAC e WITCH tinham padrões; a ADA tem permissão de escrita.
- **A interface participa.** O painel de código, o menu de ações e o rótulo do HP são alvos.
- **O jogador também programa durante a luta**, no clímax, enquanto desvia.

### A sensação
1. **Fase 1:** "eu consigo ler isso."
2. **Fase 2:** "ela está jogando com as minhas regras."
3. **Fase 3:** "ela me conhece."
4. **Fase 4:** "agora eu reescrevo ela."

---

## ETAPA 2 — ESTRUTURA DAS FASES

A luta tem **quatro fases e um epílogo**. A troca de fase é pela vida da ADA (integridade em %,
a mesma escala das rotinas), sempre no **fim de um turno dela**, nunca no meio de um padrão.

| Fase | Entra com | Sala (`setPhase`) | Música |
|---|---|---|---|
| 1 — Atribuição | 100% | 1 (vermelho, contador cheio) | tema do boss |
| 2 — Regras | 70% | 1 | tema do boss |
| 3 — Laço | 40% | 2 (anel faiscando, contador caindo) | tema do boss, mais rápido |
| 4 — Parada | 12% | 2 | silêncio, depois só batida |
| Epílogo | laço reescrito | 3 (ciano, contador zera, porta abre) | volta a faixa do capítulo |

### FASE 1 — ATRIBUIÇÃO

- **Contexto.** A ADA ainda trata a luta como um procedimento. Ela não está brava; está medindo.
- **Arena.** A caixa clássica (480×300), branca. À esquerda da caixa aparece o painel de código
  com 3 a 4 linhas de variáveis. A ADA (sprite da PixelLab) fica no topo, no lugar do ENIAC.
- **Mecânica principal.** Cada turno da ADA começa com ela **atribuindo** um valor no painel. A
  linha nova pisca em âmbar por **0,9 s** e então vale.
- **Ataques:** A1 *Atribuição de tamanho*, A2 *Velocidade decimal*, A3 *Paredes = false*.
- **Transformação espacial.** A caixa encolhe e cresce por valor escrito, e no A3 deixa de
  existir e precisa ser reencontrada.
- **Programação.** Variável, tipo (o decimal da velocidade) e booleano (as paredes). É o cap. 1
  inteiro em três golpes.
- **ADA e Cosmo.** A ADA fala uma linha por turno, no máximo. O Cosmo só reage ao A3.
- **Avança** com a integridade em 70% ou menos.

### FASE 2 — REGRAS

- **Contexto.** A ADA percebe que a Artemis lê o painel. Então muda o tipo de código: escreve
  **regras** em vez de valores.
- **Arena.** A caixa se divide em duas metades (o `split` que a WITCH usa), com uma regra escrita
  em cima de cada uma. O rótulo do HP da Artemis troca de `ARTEMIS :: HP` para
  `AUDITORA :: HP`, sem comentário.
- **Mecânica principal.** O que acontece em cada metade depende de uma **condição sobre a alma**,
  e a ADA **reordena** as linhas no meio do turno.
- **Ataques:** B1 *Se / senão*, B2 *A ordem dos testes*, B3 *Condição imposta*.
- **Transformação espacial.** Divisão da caixa e travessia entre as metades por uma ponte que
  só existe enquanto uma condição é verdadeira.
- **Programação.** `se` / `senão`, operador lógico (`e` / `ou`) e a ORDEM do `senão se`.
- **ADA e Cosmo.** A ADA comenta o jogador, não os golpes. O Cosmo fala pouco e erra uma leitura
  (ver Etapa 5).
- **Avança** com a integridade em 40% ou menos.

### FASE 3 — LAÇO

- **Contexto.** A sala muda (`setPhase(2)`): o anel no chão faísca e o contador de `conectados`
  começa a cair. A ADA para de medir e começa a **lembrar**.
- **Arena.** A caixa entra em movimento: gira em passos de 90°, vira um **anel** (uma pista
  circular) e, no fim, se repete. O painel mostra laços (`repita`, `enquanto`, `para cada`) com
  um **contador de volta** ao lado.
- **Ataques:** C1 *Repita 4 vezes*, C2 *O anel*, C3 *Para cada lembrança*, C4 *Eco*.
- **Transformação espacial.** Rotação da caixa, a caixa virando um anel e a arena reencenando os
  andares anteriores.
- **Programação.** Repetição contada, `enquanto` com condição de parada ligada à posição da alma,
  e `para cada` sobre a lista de lembranças que a `NucleoScene` já mostra em volta do anel.
- **Cache.** A ADA instala a **rotina dela** ao lado da do jogador (ver C5 e Etapa 4).
- **Avança** com a integridade em 12% ou menos.

### FASE 4 — PARADA

- **Contexto.** A ADA para de cair. A barra dela volta a 12% no começo de cada turno, e o painel
  mostra o laço da parede da sala (`enquanto conectados > 0 : controlar`). Atacar não adianta
  mais.
- **Arena.** A música corta. A caixa encolhe para um quadrado à direita da tela, e o console de
  programação se abre **ao lado dela, sem pausar a luta**.
- **Mecânica principal.** O jogador **reescreve a condição de parada** do laço dela, arrastando
  blocos com o mouse **enquanto desvia com o WASD**.
- **Ataque:** D1 *Laço principal*.
- **Programação.** É a lição da antessala: um laço só termina se a condição puder ficar falsa.
- **Avança** quando a condição montada termina o laço.

### EPÍLOGO
Sem ataque. O contador zera (`setPhase(3)`), a luz vira ciano, a ADA cai (`defeat.png`) e a
porta abre. Diálogo curto e ambíguo (Etapa 5).

---

## ETAPA 3 — CATÁLOGO DE ATAQUES

Formato de cada ataque: **início, funcionamento, leitura do perigo, como desviar, fim e evolução**.
Dano padrão: o `PROJECTILE_DAMAGE` (3) da batalha, com os i-frames de sempre (`IFRAME_MS`).

### A1 — Atribuição de tamanho (fase 1)
- **Início.** No painel aparece `caixa.largura = 200` e pisca 0,9 s.
- **Funcionamento.** A caixa encolhe até a largura escrita (tween em `this.box` + `applyBox`; as
  paredes empurram a alma, como já fazem com a WITCH). Em seguida cai uma chuva vertical (`rain`)
  calibrada para a caixa ESTREITA: uma faixa livre de 60 px que anda devagar.
- **Leitura.** O número escrito diz o tamanho final; o contorno-fantasma da caixa nova aparece
  antes de ela encolher.
- **Desvio.** Ir para dentro do contorno antes de ele fechar e seguir a faixa livre.
- **Fim.** No meio do turno, `caixa.largura = 480` (pisca) e a caixa volta ao normal; a chuva
  para junto.
- **Evolução.** Na fase 3 vira `caixa.largura = caixa.largura - 60` dentro de um `repita`: a
  caixa encolhe a cada volta e o contador mostra quantas faltam.

### A2 — Velocidade decimal (fase 1)
- **Início.** `alma.velocidade = 120.5` pisca. A alma ganha um contorno azul (lenta).
- **Funcionamento.** A velocidade da alma cai pela metade (**NOVO**: `SOUL_SPEED` vira
  `this.soulSpeed`, lido pelo `update`). Os projéteis continuam na velocidade normal, mas em
  menor número: anéis lentos que saem do topo (variação do `nova` sem o corredor).
- **Leitura.** O contorno azul e o número no painel.
- **Desvio.** Planejar o caminho com antecedência: a alma lenta não corrige no último instante.
- **Fim.** `alma.velocidade = 240` pisca e o contorno some.
- **Evolução.** Na fase 3 a ADA alterna `120.5` e `360` a cada volta de um `repita` (lenta,
  rápida, lenta), e o contorno troca de azul para laranja.

### A3 — `paredes = false` (fase 1, primeiro momento surpreendente)
- **Início.** `paredes = false` pisca. As bordas da caixa ficam tracejadas e somem.
- **Funcionamento.** O limite da alma vira a metade de baixo da tela inteira (o `soulBounds`
  aumenta). A alma pode sair da caixa. Os projéteis, que antes sumiam na borda da caixa, agora
  atravessam a tela de lado a lado. Depois de 3 s, `paredes = true` pisca e um **contorno
  tracejado** aparece num lugar NOVO da tela, encolhendo devagar até virar a caixa.
- **Leitura.** O contorno da caixa nova aparece 1,5 s antes de fechar, com contagem.
- **Desvio.** Usar o espaço livre para escapar das balas e entrar no contorno antes de ele
  fechar. Quem ficar fora leva dano uma vez e é empurrado para dentro (sem morte instantânea).
- **Fim.** A caixa nova vira a caixa da luta até o fim do turno; depois volta ao centro.
- **Evolução.** Na fase 2, a caixa nova aparece **dividida** (o contorno já vem em duas metades).

### B1 — Se / senão (fase 2)
- **Início.** A caixa se divide em duas metades. Em cima delas, o painel escreve:
  ```
  se alma.x < 640 :
      chuva
  senão :
      raios
  ```
- **Funcionamento.** A metade esquerda recebe chuva vertical (`rain`); a direita, colunas de raio
  telegrafadas (`lightning`). A alma começa numa metade e pode trocar pela **ponte**: um trecho
  que liga as duas no meio, aberto por 1 s a cada 3 s (o vão entre as metades vira caminho).
- **Leitura.** A regra escrita e a ponte, que acende em verde 0,5 s antes de abrir.
- **Desvio.** Escolher em qual regra se prefere estar e trocar quando a outra ficar mais segura.
- **Fim.** As metades se juntam (o `split` volta a `null`) com um "fechou" sonoro.
- **Evolução.** No meio do turno, a ADA troca `<` por `>=` no painel (a linha pisca): as regras
  das metades se invertem. É a mesma caixa, com o sentido trocado.

### B2 — A ordem dos testes (fase 2)
- **Início.** A caixa inteira volta, dividida em três faixas horizontais (zonas `rect` do
  `hazards`, só desenhadas). O painel:
  ```
  se alma.y < 380 :      faixa de cima queima
  senão se alma.y < 460 : faixa do meio queima
  senão :                 nada
  ```
- **Funcionamento.** Só a PRIMEIRA condição verdadeira vale. Estando em cima, queima em cima;
  estando no meio, queima no meio; embaixo, nada. Então a ADA **reordena as linhas**: a do meio
  sobe para o primeiro lugar, numa animação de bloco arrastado, e a zona segura muda.
- **Leitura.** As faixas acendem fracas antes de queimar, e a reordenação no painel é lenta
  (0,8 s).
- **Desvio.** Ler qual faixa fica segura com a NOVA ordem e ir para lá.
- **Fim.** Três reordenações por turno; na última, as três linhas somem.
- **Evolução.** Fase 3: as faixas giram com a caixa (C1).

### B3 — Condição imposta (fase 2, interface)
- **Início.** No turno da Artemis, o botão **ATACAR** do menu ganha uma linha em cima:
  `se dano == 0 :`.
- **Funcionamento.** No PRÓXIMO turno, o ATACAR só causa dano se a Artemis não tiver levado nada
  no turno da ADA que passou. É a mesma ideia do "desafio" das rotinas, imposta por ela. No turno
  da ADA, o padrão é mais limpo de propósito (chuva lenta), porque a regra é o desafio.
- **Leitura.** A condição fica escrita no botão o turno inteiro, e o HUD avisa "REGRA DA ADA".
- **Desvio.** Não apanhar. Se apanhar, o ATACAR ainda pode ser usado, mas mostra "condição
  falsa" e não fere. Os outros botões funcionam normalmente.
- **Fim.** Dura um turno.
- **Evolução.** Na fase 3 a condição passa a ser `se dano < 4 :`, mais tolerante: ela está
  aprendendo o quanto o jogador aguenta.

### C1 — Repita 4 vezes (fase 3)
- **Início.** Painel: `repita 4 vezes :` / `    girar 90`, com o contador `volta 1 / 4` ao lado.
- **Funcionamento.** A cada volta, a caixa GIRA 90° (**NOVO**: rotação em passos de 90°; ver
  Etapa 6) e uma onda de lâminas sai do lado que agora é o "topo" da caixa. Os controles
  continuam iguais à tela (cima é sempre cima).
- **Leitura.** Antes de cada volta, uma seta indica para onde a caixa vai girar. O contador
  mostra quantas faltam.
- **Desvio.** As ondas são simples; o desafio é reler de onde elas vêm a cada volta.
- **Fim.** Na volta 4 a caixa está de volta à posição original (4 × 90 = 360).
- **Evolução.** Na última vez em que aparece, a ADA escreve `controles.girar = true`: os
  **controles giram junto** com a caixa. Quatro setas nas bordas mostram qual tecla vai para onde.
  Dura uma volta só, telegrafada, e é o momento de "reaprender a jogar" (Etapa 4).

### C2 — O anel (fase 3, segundo momento surpreendente)
- **Início.** Painel: `enquanto alma.dentro(anel) :` / `    girar`. A caixa se dobra num **anel**
  (pista circular, raio 70 a 130 px em volta do centro da caixa), no mesmo desenho do halo da ADA
  e do anel do chão da sala.
- **Funcionamento.** A alma fica presa à pista e anda **em volta**: A/D (ou esquerda/direita)
  movem no sentido do anel, e W/S aproximam ou afastam do centro, dentro da largura da pista
  (**NOVO**: restrição polar da alma). Do centro saem raios em leque que giram; de fora, chegam
  lâminas que param na borda externa.
- **Leitura.** Os raios do centro aparecem como linhas finas 0,6 s antes de acender.
- **Desvio.** Correr no anel para ficar entre os raios, mudando de raio interno para externo
  quando chega lâmina.
- **Fim.** É o "enquanto": o laço gira **enquanto a alma estiver na pista**. Na pista há uma
  **saída** marcada (um trecho aberto que gira devagar). Passar pela saída é a condição de parada:
  a caixa volta a ser retângulo e o turno acaba mais cedo. Quem não achar a saída sobrevive até o
  fim do tempo normal do turno.
- **Evolução.** A saída fica mais estreita na segunda vez.

### C3 — Para cada lembrança (fase 3)
- **Início.** Painel: `para cada lembranca em lembrancas :` / `    reviver lembranca`. A
  `NucleoScene` acende uma lembrança por vez em volta do anel (`lightMemory`).
- **Funcionamento.** Para cada lembrança, por ~3 s, a caixa revive um padrão dela, com a própria
  arte, mais curto e mais limpo:
  1. **ENIAC:** a chuva (`rain`);
  2. **WITCH:** os ponteiros (`hands`);
  3. **Catraca:** barras horizontais que abrem e fecham como a catraca da recepção;
  4. **Planta:** gotas que caem de pontos fixos (a irrigação do jardim), sem acertar quem fica
     entre os canteiros.
- **Leitura.** O nome da lembrança aparece no painel antes de cada padrão, e a lembrança acesa
  na sala é a mesma.
- **Desvio.** O jogador já conhece cada padrão; o desafio é a troca rápida entre eles.
- **Fim.** Depois da última, o painel mostra `fim da lista`.
- **Evolução.** Só acontece uma vez. É um "desfile" do jogo inteiro.

### C4 — Eco (fase 3)

> **Substituído pelo CIRCUITO** (`circuit` no `AdaFight.js`): a alma fica presa nas trilhas de
> uma placa, como os fios da aranha no Undertale. A/D anda na trilha, W/S troca de trilha só
> nas pontes; pulsos de corrente correm pelas mesmas trilhas e alcançar a saída verde, no canto
> oposto, encerra o turno. O texto abaixo é o projeto original do eco.
- **Início.** Painel: `para cada passo em artemis.ultimo_turno :`. Um rastro vermelho fino aparece
  no chão da caixa: o caminho exato que a alma fez no turno anterior (o `soulTrail` que o
  `recordSoulTrail` já grava).
- **Funcionamento.** Uma "alma-sombra" vermelha percorre esse caminho **no mesmo ritmo** em que a
  Artemis o fez, e cada ponto por onde ela passa vira zona de dano por 0,4 s. Diferente do
  *rewind* da WITCH (que transforma os passos com o tempo parado em minas), aqui o passado
  PERSEGUE no presente.
- **Leitura.** O rastro inteiro aparece antes de a sombra sair.
- **Desvio.** Sair do próprio caminho antigo, porque a sombra repete o que você fez.
- **Fim.** Quando a sombra termina o percurso.
- **Evolução.** Na segunda vez, a sombra percorre o caminho em velocidade dupla.

### C5 — A rotina dela (fase 3, Cache)
- **Início.** No começo da fase 3, o painel ganha uma linha nova abaixo da rotina da Artemis no
  HUD: `ROTINA DA ADA: se integridade < 35 : reparo = 8`.
- **Funcionamento.** A rotina da ADA é conferida no mesmo momento que a da Artemis (começo do
  turno do jogador, pelo mesmo `evaluateRoutine`), mas sobre a vida dela. Ela tem **uma reserva**
  (16 de cura no total), como a Artemis.
- **Leitura.** Fica escrita no HUD o tempo todo, com o mesmo estado da rotina do jogador
  (EM ESPERA / DISPAROU).
- **O que o jogador pode fazer.** Ler a condição e jogar em volta dela: dar um golpe forte que
  passe direto de 35% para baixo, ou guardar o ataque para o turno certo. Quem tem uma rotina de
  força (`se dano == 0 : forca = forca * 2`) consegue isso mais fácil. O Cache ajuda, mas não é
  obrigatório.
- **Variação pela rotina do jogador.** Se a Artemis tiver uma rotina instalada, a ADA escreve a
  dela **com o mesmo sensor** (`hp` vira `integridade`, `dano` vira `dano`), e comenta (Etapa 5).
  Sem rotina, ela usa a padrão acima.

### D1 — Laço principal (fase 4)
- **Início.** A música corta. O painel mostra só:
  ```
  enquanto conectados != 0 :
      conectados = conectados - lote
      controlar
  ```
  E a barra da ADA volta a 12% no começo de cada turno ("o laço sempre recomeça"). A ação ATACAR
  fica cinza com `laço ativo` escrito em cima. ANALISAR continua funcionando (Etapa 5).
- **Funcionamento.** No menu, o REPROGRAMAR vira **REESCREVER LAÇO** (com ou sem Cache). Ele abre
  o console **ao lado da caixa, sem pausar** (**NOVO**: layout dividido): a caixa encolhe para
  220×220 no canto direito, e o painel ocupa a esquerda. Enquanto o jogador arrasta blocos com o
  mouse, a caixa segue com um padrão LENTO e previsível (uma bala por segundo, mirada), e a alma
  segue no WASD.
  - O laço não para porque `conectados` cai de `lote` em `lote` e PULA o zero (a lição da
    antessala: `!=` com passo que não cai em cheio).
  - O console mostra os casos ("AGORA") e o jogador troca o `!=` por uma comparação que termina
    (`>`), ou ajusta o passo.
  - Os blocos aceitos seguem as regras por encaixe das rotinas.
- **Leitura.** A caixa pequena é só uma bala por segundo, telegrafada; o resto da atenção vai para
  o código.
- **Fim.** Laço reescrito: o painel roda o laço novo linha a linha e o contador da sala desce até
  zero (`setConnected(0)`). Errar o programa não fere: o console mostra o caso que falhou e a
  caixa continua.
- **Evolução.** Não tem: é o fim.

---

## ETAPA 4 — MOMENTOS SURPREENDENTES

1. **A caixa some (A3).** O jogador passou o jogo inteiro preso num retângulo. No meio da fase 1,
   `paredes = false`, a alma sai da caixa e anda pela tela, e a caixa reaparece em outro lugar.
   É a primeira prova de que a ADA mexe nas regras, não nos padrões.
2. **AUDITORA :: HP (fase 2).** Sem nenhum aviso, o rótulo da barra de vida muda. Ninguém
   comenta. O jogador percebe sozinho, ou não percebe. É a ADA reescrevendo quem a Artemis é, na
   própria interface.
3. **O ANALISAR que analisa você (fases 2 a 4).** O ANALISAR deixa de descrever a ADA e passa a
   mostrar o que ELA vê: os números reais do jogador, do mesmo `GET /game/performance` que as
   telas da sala usam ("condicionais: 72% de acerto. Você erra mais quando tem pressa."). O
   jogador procura informação sobre o boss e encontra informação sobre si mesmo.
4. **O anel (C2).** A caixa vira o anel do halo dela, a alma corre em círculo, e a saída é a
   condição de parada. O jogador está literalmente dentro de um laço.
5. **Programar desviando (D1).** O clímax é o console aberto ao lado da caixa, com o mouse no
   código e o WASD na alma. É a primeira e única vez que o jogo pede as duas coisas juntas, e é o
   resumo do jogo inteiro: a Artemis programa para sobreviver.
6. **Os controles giram (C1, uma volta só).** Quatro setas nas bordas da caixa avisam, a volta é
   curta, e depois tudo volta ao normal. O jogador reaprende a andar por alguns segundos.

---

## ETAPA 5 — DIREÇÃO NARRATIVA

Regras: no máximo uma fala da ADA por turno, nenhuma explicando golpe, e o Cosmo só quando algo
o surpreende. Falas da ADA em vermelho (`#ff4565`), como no resto do jogo.

### Entrada (já existe na `NucleoScene`, MANTIDA)
```
SISTEMA: > núcleo: acesso não autorizado
ADA:     Artemis. Minha auditora. Eu apaguei você uma vez... e você subiu andar por andar até mim.
```
Ao pisar no anel, antes da luta (troca as três falas atuais do `arenaScript` por duas):
```
ADA:   Eu li cada linha que você montou. Cada erro. Cada tentativa.
ADA:   Vamos ver se você ainda sabe revisar código.
```

### Fase 1 — falas por turno (uma, em ciclo)
```
ADA: caixa.largura = 200. Você sempre trabalhou melhor com pouco espaço.
ADA: Decimal. Você costumava pegar esse erro antes de mim.
ADA: (A3, sem fala. Só o painel.)
COSMO: Ela... desligou as paredes?
```

### Transição 1 para 2
O painel apaga as variáveis e escreve `se`, devagar. Silêncio de um turno inteiro: nenhuma fala.
O rótulo do HP troca para `AUDITORA :: HP` no meio do primeiro padrão da fase 2.

### Fase 2
```
ADA: Você lê o painel. Então vou escrever regras.
ADA: A ordem importa. Foi você quem me ensinou isso.
ADA: (B3) Uma condição só para você. Como as que você escrevia para mim.
COSMO: Não liga para o painel, Artemis. É ela tentando te distrair.
```
*(A fala do Cosmo é a leitura errada de propósito: o painel é exatamente o que salva o jogador.
Ninguém corrige.)*

### Transição 2 para 3
`setPhase(2)`: a sala faísca, o contador cai pela primeira vez. A ADA:
```
ADA: Quem te religou no porão, Artemis? Não fui eu.
```
O Cosmo **não responde**. Na próxima vez que fala, muda de assunto: `COSMO: Foco. Ela está caindo.`

### Fase 3
```
ADA: (C3) Eu guardei todos eles. Do jeito que caíram.
ADA: (C4) Esse caminho é seu. Eu só repito.
ADA: (C5, se a Artemis tem rotina com hp)  Você ainda escreve "se hp < 5". Sempre teve medo de cair.
ADA: (C5, se a rotina é com dano)         "dano == 0". Você nunca aceitou errar.
ADA: (C5, sem rotina)                    Nenhuma rotina? Então eu escrevo a minha.
```

### Transição 3 para 4
A música corta no meio do compasso. Um turno inteiro em silêncio, só com o painel mostrando o
laço. Depois:
```
ADA:   Enquanto houver alguém lá fora, eu controlo. Esse laço não tem condição de parada.
COSMO: Então a gente escreve uma.
```

### Fase 4 (durante o console)
Nenhuma fala da ADA enquanto o jogador monta. Ao errar o laço, o painel mostra o caso que falhou,
sem comentário.

### Encerramento
Laço reescrito. O contador desce até zero, a luz vira ciano (`setPhase(3)`).
```
SISTEMA: > laço principal: encerrado
ADA:     Zero.
ADA:     Era isso que você queria medir, auditora?
(silêncio: 2 segundos, nenhuma música)
COSMO:   ...Acabou. A porta abriu.
```
A ADA não morre na tela: ela se curva (`defeat.png`) e o halo apaga. Ninguém diz o que acontece
com quem estava conectado. A pergunta da ADA fica sem resposta.

### Ambiguidades preservadas (nada é explicado)
- **Quem religou a Artemis no porão.** A ADA diz que não foi ela; na abertura do jogo, o Cosmo
  falava dela na terceira pessoa ("os sistemas DELA").
- **O que significa zerar `conectados`.** Libertar ou desligar as pessoas.
- **A fala do Cosmo na fase 2,** que manda ignorar justamente o painel que salva o jogador.
- **"Auditora".** Revisora do código da ADA, ou a autora dele.

---

## ETAPA 6 — DOCUMENTAÇÃO TÉCNICA

### Onde a luta mora
- **Sala:** `NucleoScene` (`cap3-nucleo`). O `startFight` (gancho) abre a `BattleScene` com
  `scene.launch("cap1-batalha", { config })` + `pause`, como a WITCH no `HallScene`; o retorno com
  `{ victory: true }` chama o gancho de vitória (`setPhase(3)`). Morrer reinicia a sala como
  sempre (`{ defeat: true }`).
- **Combate:** a `BattleScene`, com um `config` da ADA e um modo novo (`config.adaFight: true`)
  que liga as mecânicas abaixo. As outras lutas não mudam.

### Estados da batalha
```
INTRO -> [TURNO_JOGADOR <-> TURNO_ADA] por fase -> TRANSICAO_FASE -> ... -> FASE_4 -> EPILOGO
                                                                      \-> DERROTA (sala reinicia)
```
- **`TURNO_JOGADOR`:** o `playerTurn` de hoje: confere as duas rotinas e mostra o menu.
- **`TURNO_ADA`:** o `bossTurn`/`dodgeTurn` de hoje, com o padrão escolhido pela fase.
- **`TRANSICAO_FASE` (NOVO):** depois do `endDodge`, se a integridade passou do limite da fase,
  toca a transição (painel, falas, `setPhase` na sala) antes do `playerTurn`.
- **`FASE_4`:** o menu troca o REPROGRAMAR por REESCREVER LAÇO e cinza o ATACAR.

### Configuração (proposta)
```js
{
  name: "ADA", maxHp: 160, adaFight: true, theme: "boss", reward: null,
  combatants: [{ key: "ada", walkUrl: <idle.png>, attackUrl: <cast.png>, ... }],   // quadros 80 e 112
  phases: [
    { until: 70, patterns: ["assignSize", "decimalSpeed", "wallsOff"] },
    { until: 40, patterns: ["ifElseHalves", "ruleOrder", "imposedRule"] },
    { until: 12, patterns: ["repeatRotate", "ring", "forEachMemory", "echo"], adaRoutine: true },
    { until: 0,  patterns: ["mainLoop"], lockAttack: true, rewriteLoop: true }
  ],
  maxReprograms: 4
}
```
As folhas da ADA não têm todas o mesmo quadro: o `idle.png` é de 80 px e o `cast`, o `hurt` e o
`defeat` são de 112 (`IDLE_FRAME`/`CAST_FRAME` na `SalaAdaScene`). O `combatants` de hoje usa um
`frameSize` só para todas as folhas do combatente, então precisa aceitar um tamanho por folha
(**NOVO**, pequeno). O HP e o `maxReprograms` precisam de calibragem jogando: a meta é 10 a 14
turnos no total, com a fase 4 fora da conta.

### Estados da arena (`this.box` + extensões)
| Estado | Já existe? | Como |
|---|---|---|
| Retângulo, tamanho variável | sim | tween em `this.box` + `applyBox` (as paredes empurram a alma) |
| Dividida em metades | sim | `this.split` + `boxRects` (padrão `mirror`) |
| Movendo pela tela | sim | `moveBoxAround` (padrão `sentence`) |
| Sem paredes | NOVO | `soulBounds` = metade de baixo da tela; corte de projétil desligado (`update`) |
| Girada em 90° | NOVO | ver "Rotação" abaixo |
| Anel | NOVO | ver "Anel" abaixo |
| Pequena + console ao lado | NOVO | caixa 220×220 à direita + console em layout dividido |

### Regras de movimentação (NOVO, todas no `update` da `BattleScene`)
- **Velocidade variável:** `SOUL_SPEED` vira `this.soulSpeed` (padrão 240), lido no `update`.
- **Transformação dos controles:** o vetor (vx, vy) do WASD passa por uma matriz `this.inputTurn`
  (0, 90, 180 ou 270 graus) antes do `setVelocity`. Padrão 0. As setas nas bordas da caixa são
  desenhadas a partir da mesma matriz, então o aviso e o efeito não têm como discordar.
- **Anel:** com `this.ringMode`, a alma é guiada em coordenadas polares em volta do centro da
  caixa (A/D giram o ângulo, W/S mudam o raio entre `rMin` e `rMax`), e a posição é escrita
  direto no corpo. O `soulBounds` vira o quadrado que envolve o anel, só como rede de segurança.
- **Rotação de 90°:** o Arcade só tem retângulos alinhados aos eixos, então a caixa não gira de
  verdade. A rotação é **visual + troca de eixos**: um tween gira o desenho da caixa (o `Graphics`
  do `applyBox` dentro de um container), e no fim troca `w`/`h` e gira a posição da alma 90° em
  volta do centro. A alma fica sem receber dano durante os 400 ms do giro. Em 90° exatos, um
  retângulo continua alinhado aos eixos, por isso funciona com o que existe.

### Tipos de ataque (o que cada um reaproveita)
| Ataque | Reaproveita | Novo |
|---|---|---|
| A1 tamanho | `rain`, tween de `this.box` | contorno-fantasma da caixa nova |
| A2 decimal | `nova` sem corredor | `this.soulSpeed`, contorno da alma |
| A3 paredes | projéteis de sempre | sem paredes + caixa que reaparece em outro lugar |
| B1 se/senão | `split`, `rain`, `lightning` | ponte entre metades (abre/fecha) |
| B2 ordem | `hazards` (zonas `rect`) | reordenação animada no painel |
| B3 imposta | `dano` de `routineState` | condição no botão ATACAR (`BattleMenu`) |
| C1 repita | ondas de lâmina (`spawnRadial`) | rotação 90° e `inputTurn` |
| C2 anel | `spawnRadial`, telegrafo de linha | `ringMode` |
| C3 para cada | `rain`, `hands`, `ifElse` | dois padrões curtos (catraca, irrigação) |
| C4 eco | `soulTrail`/`recordSoulTrail`, `hazards` círculo | sombra que repete o caminho no tempo |
| C5 rotina | `evaluateRoutine`, `applyRoutineRequest` | anfitrião da ADA (cura a integridade dela, com reserva) |
| D1 laço | `ConditionalConsole`, `slotRules`, interpretador | console sem pausa, em layout dividido |

### Painel CÓDIGO-FONTE (NOVO, `ui/CodePanel.js`)
- Lista de linhas à esquerda da caixa (x ≈ 90 a 380), fonte VCR 18 px, até 6 linhas.
- **API:**
  - `set(linhas)`: troca tudo, com máquina de escrever.
  - `assign(i, texto)`: a linha pisca em âmbar por `CODE_TELEGRAPH_MS` (900) e chama de volta
    quando "vale".
  - `reorder(de, para)`: o bloco desliza para a nova posição.
  - `counter(texto)`: o "volta 2 / 4" ao lado.
- **Regra de ouro:** todo efeito de regra passa por `assign(...)` e só acontece no retorno dele.
  É isso que garante que nada muda sem aviso.

### Interface (NOVO, pequeno)
- **`BattleMenu`:** permitir trocar o rótulo de um botão e pôr uma legenda acima dele (B3 e
  "laço ativo"), e desabilitar um botão (ATACAR na fase 4).
- **HUD:** o texto `ARTEMIS :: HP` vira um campo guardado, para a fase 2 trocá-lo.
- **ANALISAR:** com `adaFight` e da fase 2 em diante, mostra o perfil do jogador
  (`GET /game/performance`, o mesmo das telas da sala; pedir uma vez na abertura da luta). Sem
  rede, cai para um texto genérico.
- **Rotina da ADA no HUD:** uma linha acima da rotina do jogador, no mesmo formato.
- **Console em layout dividido:** opção do `ConditionalConsole` para painel de ~760 px à esquerda,
  sem o fundo escuro de tela inteira e sem tirar o foco do teclado (o console só escuta ESC e
  ENTER; o WASD continua indo para a alma).

### Eventos de transição
- **`endDodge`:** se `integridade` passou do `until` da fase, roda `phaseTransition(n)`:
  1. limpa o turno (`stopDodge`);
  2. mostra o painel e as falas;
  3. avisa a sala pelo `returnScene`: o `scene.get(returnScene)` da `NucleoScene` expõe
     `setPhase`, `lightMemory`, `setConnected` e `rewriteLoop`;
  4. chama o `playerTurn`.
- **Fase 4:** `Music.stop()` na entrada; na vitória, `Music.restore()` (já existe no `shutdown`
  da batalha).

### Dependências entre mecânicas
- C1 (controles girados) depende do `inputTurn`, que D1 não usa: precisa ser zerado no
  `stopDodge`.
- C4 depende do `soulTrail` do turno anterior: guardar uma cópia no fim de cada turno da ADA.
- C5 depende das rotinas: com Cache, a ADA espelha o sensor; sem Cache, usa a rotina padrão.
- D1 depende do console em layout dividido e de o `dodgeActive` continuar verdadeiro com o
  console aberto.
- Tudo que muda a caixa precisa ser desfeito no `stopDodge` (como já acontece com `split`,
  `mirrorSoul` e `soulHasteUntil`): `soulSpeed`, `inputTurn`, `ringMode`, paredes e rotação.

### Desempenho
- O painel de código são até 6 `Text` reaproveitados (troca de texto, não recriação).
- O eco desenha o rastro uma vez por turno (um `Graphics`), não por quadro.
- O anel calcula a posição da alma uma vez por quadro (seno e cosseno); os raios do centro são no
  máximo 8 linhas.
- O padrão mais pesado continua sendo o que já existe (chuva + raios); nenhuma fase empilha mais
  de dois padrões ao mesmo tempo.

### Ordem de implementação sugerida
1. Fases por vida (`phases`, `phaseTransition`) e ganchos da sala.
2. `CodePanel` + A1 e A2 (só tween de caixa e `soulSpeed`): a fase 1 jogável.
3. A3 (sem paredes), B1 e B2 (o `split` e os `hazards` já existem).
4. B3 e a interface (rótulo do HP, ANALISAR com perfil).
5. C1 (rotação e `inputTurn`), C2 (anel), C3 e C4.
6. C5 (rotina da ADA) e D1 (console em layout dividido).
7. Calibragem jogando: vida, dano e a duração de cada padrão.
