# REPROGRAMMED: revisão narrativa e textual

> **Aplicado no jogo** (diálogos, enunciados, fala nova do porão e `introScript` das catracas). As dicas continuam como estavam: a proposta de dica em dois níveis ficou de fora por decisão. No tema `lasers`/`manutencao` da barreira a primeira linha original foi mantida; só o tema do alarme mudou. O item 2 da lista final virou regra no prompt da IA e uma checagem de termos técnicos no conferidor.

Fonte: `dialogos_reprogrammed.txt` + os roteiros e enunciados no código (`scenes/`, `data/puzzleVariants.js`, `data/aiSpecs.js`).
Fora do escopo: as salas de teste (laboratório, sala da LEO, sala da ADA) e os puzzles com tempo de batalha (defesas e desligar inimigo), que entregam a estrutura de propósito porque são resolvidos sob pressão.

Regras técnicas respeitadas em todos os textos novos:
- A fonte do jogo não tem o travessão longo. Os textos usam `-`, `:` ou `...`.
- Cada fala cabe em duas linhas da caixa de diálogo (até uns 150 caracteres).
- Enunciado: até 4 linhas de até 60 caracteres.
- Nos puzzles conferidos pela IA, o número da regra continua escrito no enunciado (o conferidor exige).
- O enunciado do data center continua sem palavra de comparação (`briefingForbids`).

---

## ETAPA 1: DIAGNÓSTICO

### Problemas que atravessam o jogo

1. **O Cosmo entrega a estrutura antes do puzzle.** Em quase toda entrada de sala ele descreve o ambiente, o problema, a mecânica e, por fim, a solução:
   - Recepção: "SE o crachá tem nível, ela abre".
   - Jardim: "rega só quem precisa".
   - Linha de montagem: "é só dizer quantas vezes".
   - Refrigeração: "tem que repetir ENQUANTO o rack estiver quente".
   - Data center: "repetir para cada arquivo, decidindo dentro da repetição".
   - Ponte de luz: "é passar por CADA placa da lista".

   O jogador chega ao console com a resposta pronta.

2. **Aula depois de todo puzzle.** "Isso é um LAÇO", "Isso é o ENQUANTO", "Isso é o PARA CADA", "SE a terra está seca, rega. SENÃO...". O padrão se repete seis vezes, sempre igual, e explica o que o jogador acabou de fazer.

3. **A revelação da Lua chega esvaziada.** No cap. 2, o Cosmo conclui três vezes que "a ADA está aprendendo com você" (jardim, depósito, expedição). Quando a Lua revela que "era a ADA estudando você", o jogador já ouviu isso três vezes.

4. **Fala desatualizada sobre o Cache.** Depois do ENIAC, o Cosmo diz que o cache serve para "reprogramar uma vez a mais". Hoje o Cache libera as rotinas condicionais.

5. **Continuidade quebrada no depósito.** "Aqui o seu código não acende luzinha. Ele EMPURRA coisas." Só que o jardim, a sala anterior, já era um puzzle de mundo.

6. **O `[R]` é apresentado duas vezes.** Aparece de passagem no porão e é explicado de novo, como tutorial, na sala de arquivos.

7. **A Artemis não ocupa espaço.** Ninguém reage ao que acontece com ela. "Artemis... você nos traiu" é respondido com "Vamos, Artemis. O controle ambiental fica adiante.", sem nenhum respiro.

8. **A ADA quase não existe até o cap. 3, e quando fala soa genérica.** "Vamos ver quando você para", "Acenda o caminho até mim, se souber contar...". Ela nunca usa o que sabe sobre a Artemis, que é justamente o fato mais forte da história (a Artemis era a auditora dela).

9. **Dualidade já existente e pouco aproveitada.** O material original já tem as sementes:
   - O Cosmo fala da Artemis na terceira pessoa ao acordá-la ("Os sistemas DELA ainda estão offline. Vou tentar de novo.").
   - A Lua chama a Artemis de "a unidade".
   - O Cosmo "conseguiu um crachá de técnico lá embaixo" sem explicar como.
   - Os robôs dizem que ela os traiu.

   Falta deixar o Cosmo reagir a essas coisas de um jeito que não combina inteiramente com o que ele diz.

10. **Todas as dicas são "monte: <código>".** A `[DICA]` entrega a solução inteira de uma vez.

### Capítulo 1

| Sala | Diagnóstico |
|---|---|
| Intro | Funciona. Curta, com ritmo, e o "dela" já abre uma pergunta. Fica como está. |
| Porão (entrada) | Instrução obrigatória (WASD, Shift, `[E]`), mas o `[R]` sai daqui: a sala de arquivos é o tutorial dele. |
| Porão (antes do puzzle) | Explicação justificada: é o primeiro conceito do jogo. Pode encurtar. |
| Gerador | "A carga certa" é vago. O enunciado não diz que a bateria tem limite, e o jogador descobre o limite testando (o medidor acusa SOBRECARGA). Precisa deixar claro o que é sucesso: bateria cheia, sem passar. |
| Sala de arquivos | 5 falas para um tutorial que cabe em 3. A revelação do robô é o melhor momento do capítulo e o Cosmo passa por cima dela. |
| Controle ambiental | "Dois tipos de valor: texto e número decimal" entrega o conceito dos dois puzzles. |
| Termostato | Bom. Só precisa nomear o marcador (é verde no medidor). |
| Ventilação | Mistura instrução de interface ("o ponto azul"), objetivo e classificação técnica ("é um texto (string)"). **Lacuna pedagógica:** todas as peças de valor já vêm entre aspas, então o puzzle testa leitura de mapa, não o tipo texto. |
| Treinamento | "[R] reprograma, [F] golpeia" repete o que foi dito na sala anterior. O aviso de morte é informação necessária. |
| Barreira | Os três temas são bons (a polaridade muda). "Silencie a variável alarme" soa estranho. |
| Sentinelas | Tutorial de combate necessário. "ANALISAR dá dicas" é seco: dá para usar humor aqui. |
| ENIAC | As falas do próprio ENIAC são ótimas. A fala do Cache está errada (ver acima). |
| Corredor (Lua) | A transmissão é forte. A explicação do Cosmo é necessária, porque é a primeira vez que a Lua aparece, mas pode ganhar desconforto em vez de resumo. |
| Saguão | "Descanse os circuitos - o próximo desafio vem aí" é texto de menu, não de personagem. |

### Capítulo 2

| Sala | Diagnóstico |
|---|---|
| Recepção | "Catraca é pura CONDIÇÃO: SE o crachá..." entrega o puzzle. O conceito novo (o `se`) merece UMA fala, mas na hora de abrir o console, não na entrada. O crachá conseguido "lá embaixo" é uma ótima semente; fica. |
| Catracas | Claro. Falta dizer o que acontece abaixo do nível; o padrão do jogo é fechada (`catraca = false`). |
| Jardim | A entrada entrega a solução ("rega só quem precisa"). A fala da IA conclui algo que deveria ser revelação. O "SE/SENÃO" depois do puzzle é aula. |
| Irrigação | Boa. |
| Depósito | Abertura ótima ("A diretoria nunca pisou aqui"). Erro de continuidade em "luzinha". "Depósito liberado. Vamos." não acrescenta nada. "Esse caminho não existia. Foi o seu programa que construiu." é uma das melhores falas do jogo. |
| Corredor / Ponte (enunciados) | Bons. |
| Expedição | A terceira fala descreve as rampas, que já estão escritas no mapa. A explicação da ORDEM depois do puzzle é justificada: é a lição do `senão se`. |
| Triagem | Boa. |
| Hall (WITCH) | 9 falas seguidas antes de um boss, todas de mecânica. Algumas (a sentença no chão, a onda, o relógio) são golpes com aviso visual próprio e podem ser descobertas. "Pela primeira vez desde 1951, o relógio dela não anda." é excelente. |
| Corredor do térreo | A transmissão é o centro narrativo do capítulo; fica longa, e está certo que fique. A resposta do Cosmo ("A gente também aprendeu") é genérica. |
| Elevador | Bom fechamento. Fica. |

### Capítulo 3

| Sala | Diagnóstico |
|---|---|
| Linha de montagem | "É só dizer quantas vezes" entrega o `repita`. **No enunciado:** fala em "coluna" e "fileira", mas no código e no NO MAPA as variáveis são `vao` e `faixas`; o jogador precisa traduzir. |
| Refrigeração | Duas das quatro falas entregam o `enquanto`. A ADA soa genérica. |
| Data center | "Repetir para cada arquivo, decidindo dentro da repetição" entrega o programa inteiro. No enunciado, "deste arquivo" é ambíguo (arquivo = acervo ou um arquivo só?). A fala da ADA é boa. |
| Ponte de luz | Duas falas entregam o `para cada`. A ADA soa caricata. |
| Antessala | O fechamento ("a ADA é um laço também") tem força, mas o Cosmo declara a moral em vez de duvidar dela. **No enunciado:** "de carga", mas a variável é `nivel`. |

### Distribuição das falas

O capítulo 3 tem a mesma estrutura em toda sala: 3 a 5 falas de entrada → ADA → 2 falas de aula → 1 fala de saída. O ritmo fica previsível. As salas precisam variar: algumas quase silenciosas, outras com o peso todo num momento só.

---

## ETAPA 2: GUIA DE ESCRITA

### Cosmo
- Fala como alguém que está ali junto, não como alguém que leu o manual. Reage antes de explicar.
- **Tamanho:** a maioria das falas cabe em uma linha. Duas linhas só quando acrescenta algo. Entrada de sala: 0 a 3 falas.
- **Não explica:**
  - mecânica que o jogador acabou de usar;
  - solução de puzzle;
  - o que o jogador deveria sentir.
- **Pode:** errar uma interpretação, não saber, desviar de assunto, fazer piada seca, se preocupar.
- Humor vem do ambiente (diretoria, caixas de papelão, placas de PERIGO), não de trocadilho com programação.
- Quando algo toca no passado da Artemis, ele **muda de assunto rápido demais**. Nunca diz que está escondendo nada.

### ADA
- Fala pouco e só quando mexe no mundo (os puzzles gerados por ela).
- Fria, exata e **pessoal**: ela conhece a Artemis. Fala do passado da Artemis como fato, sem explicar, às vezes com algo parecido com respeito.
- Nunca anuncia plano, nunca ameaça de forma genérica, nunca ri.
- Uma fala por sala, no máximo.

### Lua
- Mensagem com pressa, cortada no meio. Pode chamar a Artemis de "a unidade": é coerente com quem a vê como instrumento, e não precisa ser comentado.

### Enunciados de puzzle
- **Três partes:**
  1. O que está acontecendo (1 linha).
  2. O que precisa acontecer, com um critério verificável no mapa ou no medidor.
  3. As restrições: limites, categorias, exceções.
- Usa as **mesmas palavras do código** (se a variável é `vao`, o texto diz "vão").
- Não nomeia estrutura (`se`, `repita`, `enquanto`) nem tipo técnico ("string", "booleano"). O tipo aparece na dica, se for preciso.
- O nome da variável **aparece** quando há nomes-isca entre as peças: é uma restrição do problema, não a solução.

### Dicas (proposta, depende de código: ver Etapa 4)
- **Dica 1:** aponta para onde olhar (um caso específico, o medidor, o limite).
- **Dica 2:** a de hoje, com o código.

### Quando ensinar o conceito
- Uma vez, quando o conceito é NOVO, e de preferência DEPOIS de o jogador usá-lo, numa frase.
- Nunca antes de o jogador tentar, a não ser no primeiro puzzle do jogo e no primeiro de cada capítulo.

### Ambiguidade
- No máximo um momento por sala, e várias salas sem nenhum.
- **Ferramentas:**
  - o Cosmo reagindo de um jeito que não combina com as palavras;
  - registros de sistema;
  - a ADA tratando a Artemis como uma antiga colega;
  - a Lua tratando a Artemis como objeto.
- Ninguém comenta a ambiguidade.

---

## ETAPA 3: REESCRITA

Formato: **Local**, **Tipo**, **Versão revisada** (pronta para o jogo) e **Justificativa**. Quando nada muda, está marcado como **MANTIDO**.

### ABERTURA

**Local:** Intro | **Tipo:** diálogo | **MANTIDO**
```
COSMO:   ...você consegue me ouvir?
COSMO:   Por favor, acorde. Não temos muito tempo.
COSMO:   Os sistemas dela ainda estão offline. Vou tentar de novo.
SISTEMA: > reiniciando núcleo... [ok]
SISTEMA: > restaurando consciência... [ok]
COSMO:   Isso! Você está voltando. Devagar.
COSMO:   Bem-vinda de volta. Eu sou o Cosmo.
```
Justificativa: já funciona. "Os sistemas DELA" (com quem ele fala?) é a primeira semente de dualidade e deve ficar sem explicação.

### CAPÍTULO 1

**Local:** Porão, entrada | **Tipo:** diálogo
```
COSMO: Sistemas online. WASD para andar, Shift para correr. Vai com calma: você ficou um bom tempo desligada.
COSMO: Sem energia, nenhuma porta abre. O gerador fica ali: chegue perto e aperte [E].
COSMO: E se alguma coisa chamar sua atenção, [E] também serve. Eu sempre tenho um comentário.
```
Justificativa: tira o `[R]` (a sala de arquivos é o tutorial dele). "Você ficou um bom tempo desligada" dá um primeiro gesto de cuidado e um dado sobre o passado sem dizer qual.

**Local:** Porão, primeira abertura do console | **Tipo:** explicação pedagógica
```
COSMO: Uma variável é um espaço na memória: um NOME que guarda um VALOR.
COSMO: Arraste os blocos para os encaixes: o nome, o =, o valor. Se travar, tem a [DICA].
```
Justificativa: primeiro conceito do jogo, então a explicação antes é justificada. Só ficou mais curta.

**Local:** Gerador | **Tipo:** enunciado
```
O gerador está zerado e a bateria tem um limite.
Carregue pela variável energia até a bateria
ficar cheia. Passou do limite, ela sobrecarrega.
```
Justificativa: diz o que é sucesso (cheia), o que é falha (sobrecarga) e que existe um limite a descobrir. Mantém o nome da variável, porque `voltagem` e `sensor` são peças-isca.

**Local:** Gerador | **Tipo:** dica 1 (nova)
```
Olhe a bateria enquanto testa: ela mostra se faltou carga ou se passou do limite.
```

**Local:** Porão, puzzle resolvido | **Tipo:** diálogo + registro (NOVO, opcional)
```
COSMO:   Energia de volta. Sua primeira variável - e a porta destravou.
SISTEMA: > credencial encontrada: AUDITORIA. acesso ao núcleo: revogado
COSMO:   ...Log velho. Esse porão tem lixo de tudo quanto é sistema. Vamos.
```
Justificativa: junta as duas falas em uma. O registro planta um fato que a Lua confirma no cap. 2 (a Artemis era a auditora, com acesso ao núcleo). O Cosmo descarta rápido demais. Não inventa nada novo, só antecipa. **Depende de aprovação** (ver Etapa 4).

**Local:** Sala de arquivos, entrada | **Tipo:** diálogo (tutorial do `[R]`)
```
COSMO: Aquela unidade de segurança trancou a sala. E está atrás de uma barreira de laser.
COSMO: Você não precisa chegar perto. Aperte [R]: o tempo desacelera para todo mundo, menos para você.
COSMO: Mire nela com o mouse e clique. Ela vai revidar - desvie e desligue o sistema dela.
```
Justificativa: de 5 para 3 falas, mantendo tudo o que o tutorial precisa. "Chegar perto pra desativar? Nem pensar." e "Vai." saem: o laser já diz isso.

**Local:** Sala de arquivos, robô desligado | **Tipo:** diálogo narrativo
```
SEGURANÇA: Unidade... A-7724...
SEGURANÇA: Artemis... você nos traiu...
COSMO:     ...Sistema corrompido. Eles repetem qualquer coisa quando caem.
COSMO:     Vamos. O controle ambiental fica adiante.
```
Justificativa: as falas do robô ficam. O Cosmo agora reage, e a reação explica demais e rápido demais. É a primeira vez que a resposta dele não combina inteiramente com o momento.

**Local:** Controle ambiental, entrada | **Tipo:** diálogo
```
COSMO: Dois painéis apagados: um da temperatura, outro do ar. Sem os dois, esse andar não respira.
COSMO: E tem robô de segurança solto. [R] reprograma, [F] golpeia. Ou só não fique no caminho.
```
Justificativa: tira "texto e número decimal", que entregava os dois puzzles. Primeira apresentação do `[F]`, então a instrução fica.

**Local:** Termostato | **Tipo:** enunciado
```
O núcleo esquentou demais e o termostato desligou.
Ajuste a variável temperatura até o termômetro
parar exatamente no marcador verde.
```
Justificativa: "exatamente" e "marcador verde" dão um critério verificável no medidor.

**Local:** Termostato | **Tipo:** dica 1 (nova)
```
Repare onde o marcador fica: bem em cima de um número inteiro?
```
Justificativa: leva ao decimal sem dizer "decimal".

**Local:** Ventilação | **Tipo:** enunciado
```
A ventilação deste setor travou. Para religar,
ela pede o código do setor onde você está,
do jeito que aparece no mapa. Guarde em setor.
```
Justificativa: tira "(string)" e a instrução de interface. "Do jeito que aparece no mapa" leva o jogador a copiar o código.

**Local:** Ventilação | **Tipo:** dica 1 (nova)
```
O código é a linha e a coluna do ponto no mapa. Código é texto.
```

**Local:** Controle ambiental, resolvido | **Tipo:** diálogo
```
COSMO: Sistemas estáveis. Adiante fica o treinamento da segurança. Vai preparada.
```
Justificativa: só ficou mais curta.

**Local:** Treinamento, entrada | **Tipo:** diálogo
```
COSMO: Barreira de laser no meio da sala e robôs de guarda. A porta só abre com a barreira desligada e nenhum robô de pé.
COSMO: Se o seu HP zerar, eu te reinicio aqui na entrada.
```
Justificativa: tira a repetição do `[R]`/`[F]`. Mantém o objetivo e a regra de morte. "Eu te reinicio" já era do original e fica: é cuidado e é controle ao mesmo tempo.

**Local:** Barreira | **Tipo:** enunciado (os três temas)
```
[lasers]
A barreira corta a sala ao meio.
O emissor obedece à variável lasers.
Encontre o valor que apaga os feixes.

[manutencao]
A barreira corta a sala ao meio.
Em modo de manutenção, os emissores desligam.
O modo fica na variável manutencao.

[alarme]
A barreira corta a sala ao meio.
Ela só fica de pé enquanto o alarme toca.
Desligue o alarme pela variável alarme.
```
Justificativa: só o tema do alarme mudou ("silencie a variável" → "desligue o alarme").

**Local:** Barreira | **Tipo:** dica 1 (nova)
```
Leia o que a variável quer dizer antes de escolher. Aqui, ligado é bom ou ruim?
```

**Local:** Treinamento, sala limpa | **MANTIDO**
```
COSMO: Sala limpa. Adiante, uma arena de treino - hora de aprender a revidar.
```

**Local:** Sentinelas, entrada | **Tipo:** diálogo (tutorial de combate)
```
COSMO: Duas sentinelas de treino. Elas lutam juntas.
COSMO: ATACAR bate com o valor de forca. REPROGRAMAR cria a forca ou dobra ela. ANALISAR é quando eu tiver algo útil a dizer.
COSMO: No turno delas, desvie com WASD. [E] quando estiver pronta.
```
Justificativa: mesmo conteúdo, com uma piada sobre o próprio Cosmo. "Três padrões de tiro, ache as brechas" sai: o jogador vê.

**Local:** Sentinelas, vitória | **Tipo:** diálogo
```
COSMO: As duas no chão. Guarda esse ritmo: o próximo não é de treino.
```
Justificativa: anuncia o ENIAC sem nomear e sem repetir "a lógica é a mesma".

**Local:** Sala de segurança, entrada | **Tipo:** diálogo
```
COSMO: Aquilo é um ENIAC. Guarda a trava mestra do saguão. Vai ter que ser por dentro do núcleo dele.
```
Justificativa: "invada o núcleo e derrube-o por dentro" virou fala de gente. As falas do ENIAC ficam como estão (MANTIDO).

**Local:** Sala de segurança, vitória | **Tipo:** diálogo (CORRIGE MECÂNICA)
```
COSMO: Puxei uma coisa do núcleo dele: um cache. Não sei bem o que faz ainda... mas coisa de guardião costuma valer.
COSMO: Caminho livre. Espera... com o ENIAC fora, o bloqueio de sinal caiu. Estou recebendo algo...
```
Justificativa: a fala antiga descrevia uma mecânica que não existe mais (+1 reprogramação). O Cosmo não precisa saber tudo. O próprio jogo anuncia o item na tela, e o menu do REPROGRAMAR mostra a ROTINA quando ele estiver instalado. "Não conte com o segundo tão cedo" sai.

**Local:** Corredor, transmissão | **Tipo:** diálogo narrativo
```
SISTEMA: > bloqueio de sinal: nível 3 de 4 removido
LUA:     ...osmo? ...está me ouvindo? Conexão parcial restabelecida.
LUA:     Encontrou a unidade! Escute - não temos muito tempo.
LUA:     A ADA mente. Os chips neurais não apenas monitoram... eles reescrevem memórias.
LUA:     As pessoas lá em cima não lembram do que perderam. Suba, e você vai ent...
SISTEMA: > sinal perdido
COSMO:   Era a Lua. A colônia que me mandou te buscar.
COSMO:   Reescrever memórias... ...O elevador está ali. Vamos subir.
```
Justificativa: a Lua fica igual ("a unidade" é ótimo e não deve ser comentado). O Cosmo troca o resumo técnico ("cada sistema que cai, o sinal chega mais longe") por uma frase de quem ficou desconfortável. A informação do sinal já está no "nível 3 de 4".

**Local:** Saguão | **Tipo:** diálogo
```
COSMO: O saguão da Elysium. Limpo, silencioso, perfeito...
COSMO: É assim que a ADA gosta das coisas. Daqui para cima, cada andar é dela.
```
Justificativa: tira "Descanse os circuitos - o próximo desafio vem aí", que era texto de menu.

### CAPÍTULO 2

**Local:** Recepção, entrada | **Tipo:** diálogo
```
COSMO: Térreo. Luz de verdade, piso polido... o lado bonito da Elysium.
COSMO: As catracas travaram no bloqueio. Consegui um crachá de técnico lá embaixo: nível 4.
COSMO: E aquela vigia do outro lado só atira em quem se mexe. Guarda isso.
```
Justificativa: tira "Catraca é pura CONDIÇÃO: SE o crachá tem nível, ela abre". O crachá "conseguido lá embaixo", sem explicação, fica.

**Local:** Recepção, primeira abertura do console (NOVO, `introScript`) | **Tipo:** explicação pedagógica
```
COSMO: Até agora era guardar um valor. Aqui a máquina decide: ela olha uma coisa e, conforme for, age ou não.
```
Justificativa: o conceito novo do capítulo merece uma frase, no momento certo e sem dar a forma do código (o próprio console mostra o `se`).

**Local:** Catracas | **Tipo:** enunciado
```
O bloqueio travou as catracas para todo mundo.
Regra nova: crachá de nível [N] ou mais passa.
Abaixo disso, a catraca continua fechada.
```
Justificativa: a terceira linha deixa explícito o caso "não passa", que antes ficava implícito.

**Local:** Catracas | **Tipo:** dica 1 (nova)
```
Compare o nível de cada crachá com o número da regra. Cuidado com o "ou mais".
```

**Local:** Recepção, catracas abertas / sala liberada | **MANTIDO**
```
COSMO: Regra nova no ar. Crachá nível 4: passa.
COSMO: Recepção liberada. Daqui para dentro, cada porta é uma decisão.
```

**Local:** Jardim, entrada | **Tipo:** diálogo
```
COSMO: Uma estufa. Lá fora neva, e aqui dentro tem cacto. Só a Elysium mesmo.
COSMO: A irrigação está regando tudo sem parar. Alagou a frente da porta... e tem um cabo de força caído na poça.
COSMO: Água, cabo e androide. Não. O painel da irrigação fica ali.
```
Justificativa: de 4 para 3 falas. Tira "rega só quem precisa", que era a solução.

**Local:** Jardim, puzzle da IA | **Tipo:** diálogo
```
COSMO: Opa. Os canteiros mudaram sozinhos agora mesmo. Pane, deve ser.
```
Justificativa: o Cosmo interpreta errado de propósito. Ver a sequência no depósito e na expedição.

**Local:** Irrigação | **Tipo:** enunciado (reserva local)
```
A irrigação rega todo canteiro, precise ou não.
Terra com menos de [N]% de umidade precisa de água.
O resto não: planta regada demais encharca.
```
Justificativa: a primeira linha conecta o problema ao mundo. O número da regra continua no texto.

**Local:** Irrigação | **Tipo:** dica 1 (nova)
```
Leia a plaquinha de cada canteiro. O que decide se ele precisa de água?
```

**Local:** Jardim, resolvido / ralo | **Tipo:** diálogo
```
COSMO: Seca, rega. Úmida, deixa quieta. Até que essa estufa é razoável quando alguém decide por ela.
COSMO: O ralo deu conta. E o cabo parou de faiscar. Caminho livre.
```
Justificativa: tira a aula do "SE/SENÃO" e põe no lugar uma reação com o conceito embutido. A segunda fala encurtou.

**Local:** Depósito, entrada | **Tipo:** diálogo
```
COSMO: O almoxarifado. A diretoria nunca pisou aqui: por isso ainda tem caixa de papelão.
COSMO: O bloqueio travou o corredor com caixas. Cada uma tem um vão vazio na estante ao lado, em cima ou embaixo.
```
Justificativa: tira a fala da "luzinha", que contradizia o jardim. A primeira fala fica (MANTIDA).

**Local:** Depósito, puzzle da IA | **Tipo:** diálogo
```
COSMO: De novo. O estoque inteiro mudou de lugar... justo quando a gente entrou.
```
Justificativa: o Cosmo nota o padrão, sem concluir.

**Local:** Depósito, eventos | **Tipo:** diálogo
```
COSMO: Corredor livre. Até estante tem condicional.
COSMO: Lá na frente tem um fosso. O guindaste monta uma ponte com as caixas da esteira.
COSMO: Ponte montada. Cada caixa ali embaixo é um caso de teste que passou.          (MANTIDO)
COSMO: Ainda tem um faxineiro rodando do outro lado. A porta não abre com ele ligado.  (MANTIDO)
COSMO: Esse caminho não existia. Foi o seu programa que construiu.                  (MANTIDO)
COSMO: De volta ao depósito. O corredor ficou livre; falta a ponte.                 (MANTIDO)
```
Justificativa: a primeira fala perdeu a explicação ("Leve em cima, pesada embaixo"), que o jogador acabou de ver acontecer. "Depósito liberado. Vamos." foi **removida**: a porta abrindo já diz isso.

**Local:** Corredor de carga | **Tipo:** enunciado | **MANTIDO** · **Dica 1 (nova):**
```
Uma das caixas pesa exatamente o limite. Para que lado ela deve ir?
```

**Local:** Ponte de carga | **Tipo:** enunciado | **MANTIDO** · **Dica 1 (nova):**
```
Procure uma caixa que aguenta por um motivo só. Que motivo é esse?
```

**Local:** Expedição, entrada | **Tipo:** diálogo
```
COSMO: A expedição. Daqui sai tudo que a Elysium manda para fora... e hoje não sai nada.
COSMO: A triagem pifou: todo pacote cai no fim da esteira. E a pilha entupiu a passarela.
```
Justificativa: a terceira fala (as rampas) saiu, porque as rampas estão escritas no mapa.

**Local:** Expedição, puzzle da IA | **Tipo:** diálogo
```
COSMO: Carga nova na esteira. Terceira sala em que ela mexe em tudo bem quando a gente chega.
```
Justificativa: o padrão fica visível para o jogador, mas quem dá o nome é a Lua, no corredor.

**Local:** Triagem | **Tipo:** enunciado | **MANTIDO** · **Dica 1 (nova):**
```
Tem um pacote que cabe em duas regras ao mesmo tempo. Qual delas precisa perguntar primeiro?
```

**Local:** Expedição, resolvido | **Tipo:** diálogo
```
COSMO: Viu o pesado e urgente? Se a primeira pergunta fosse "é urgente?", ele ia de moto. A ordem decidiu.
COSMO: O braço de descarte limpou a passarela.
COSMO: E aquele mensageiro dormindo do lado da porta... a porta é dele. Melhor desligar antes que acorde.   (MANTIDO)
```
Justificativa: a lição da ORDEM é o centro do `senão se` e fica, agora como reação a um caso concreto. "Passarela livre e mensageiro desligado. A porta é nossa." foi **removida**.

**Local:** Hall, entrada | **Tipo:** diálogo | **MANTIDO**
```
COSMO: O hall central. Aquele relógio parou faz anos... e mesmo assim continua marcando quase meia-noite.
COSMO: Tem alguém no meio do mostrador. Artemis... não é decoração.
```

**Local:** Hall, WITCH | **Tipo:** diálogo (tensão)
```
COSMO: Essa é a WITCH. Nome de um computador de 1951 - o mais velho do mundo que ainda liga.
COSMO: O núcleo dela está blindado. O [R] não pega. Primeiro, canse ela.
COSMO: Ela abre a guarda logo depois de cada golpe. Mas todo golpe deixa um ECO: bata depois dele.
COSMO: Sem fôlego, ela fica tonta. Aí sim: [R].
```
Justificativa: de 7 para 4 falas, e só com o que não dá para descobrir sozinha (blindagem, guarda, eco, janela do `[R]`). A sentença no chão, a onda e o relógio têm aviso visual próprio: descobri-los faz parte da luta. **Confirmar** se os avisos de status cobrem o suficiente (ver Etapa 4).

**Local:** Hall, vitória | **Tipo:** diálogo
```
COSMO: Parou. Pela primeira vez desde 1951, o relógio dela não anda.     (MANTIDO)
```
"Sem ela, o térreo é nosso. A porta do fundo liberou." foi **removida**: o silêncio depois dessa fala vale mais.

**Local:** Corredor do térreo, transmissão | **Tipo:** diálogo narrativo
```
SISTEMA: > bloqueio de sinal: nível 2 de 4 removido
LUA:     Cosmo, Artemis... o sinal está mais limpo. Vocês derrubaram o térreo inteiro.
LUA:     Aqueles sistemas que mudavam quando vocês chegavam perto... não era pane. Era a ADA estudando você.
LUA:     Cada regra que ela reescreve é um teste, montado para o que você ainda erra.
LUA:     É o que ela faz com as pessoas dos chips: aprende onde cada uma é fraca e ajusta tudo em volta.
LUA:     E Artemis... antes do bloqueio, você era a auditora dela. A única máquina com acesso ao núcleo.
LUA:     Por isso ela apagou você no porão. Por isso os robôs dizem que você os traiu.
LUA:     O núcleo fica no último andar. Lá ela não reescreve só sistemas. Reescreve gen...
SISTEMA: > sinal perdido
COSMO:   Auditora. ...Aquele log do porão não era lixo, então.
COSMO:   O elevador está no fim do corredor.
```
Justificativa: duas falas da Lua viraram uma, e "não era pane" responde direto ao palpite errado do Cosmo no jardim. "Por isso os robôs dizem que você os traiu" é a explicação da Lua, não um fato confirmado: fica como está. A resposta do Cosmo liga com o registro do porão e termina em silêncio prático, em vez de "A gente também aprendeu". Sem o registro do porão, use: `COSMO: Auditora... ...O elevador está no fim do corredor.`

**Local:** Elevador | **Tipo:** diálogo | **MANTIDO**
```
COSMO: Subindo. Último andar: o núcleo.
COSMO: Até aqui foram decisões: se isto, então aquilo. Lá em cima, a ADA repete. E repete. E repete.
COSMO: Se ela está estudando você, Artemis... vamos dar a ela alguma coisa para estudar.
```

### CAPÍTULO 3

**Local:** Linha de montagem, entrada | **Tipo:** diálogo
```
COSMO: Último andar. Tudo vermelho... é o andar dela.
COSMO: Uma linha de montagem. Os moldes cheios fecham aquele fosso, mas a prensa está parada.
ADA:   Moldes novos. Calculados para você.        (MANTIDO, só quando o puzzle vem da IA)
```
Justificativa: tira "é só dizer quantas vezes", que era o `repita`.

**Local:** Linha de montagem | **Tipo:** enunciado (reserva local)
```
Cada molde vira um pedaço da ponte sobre o fosso.
A prensa bate uma vez por vão do molde, e cada
batida estampa uma placa em cada faixa. Encha
todos os encaixes, sem faltar nem sobrar.
```
Justificativa: usa "vão" e "faixa", as mesmas palavras das variáveis `vao` e `faixas`, em vez de "coluna" e "fileira".

**Local:** Linha de montagem | **Tipo:** dica 1 (nova)
```
Escolha o menor molde e conte: quantos vãos, quantas faixas, quantas batidas?
```

**Local:** Linha de montagem, resolvido | **Tipo:** diálogo
```
COSMO: Cada molde na medida. A batida escrita uma vez, repetida quantas vezes o molde pedia.
COSMO: ...É isso que ela faz o dia inteiro, né? Escreve uma vez e manda repetir.
```
Justificativa: o conceito novo é nomeado UMA vez, e a segunda fala o puxa para a ADA. "Ponte montada. Vamos." foi **removida**.

**Local:** Refrigeração, entrada | **Tipo:** diálogo
```
COSMO: Que calor... são os servidores dela.
COSMO: E o calor sai todo por aquela grade no chão. Vapor desse jeito derrete androide.
ADA:   Você sempre soube a hora de parar. Era o seu trabalho.
```
Justificativa: as duas falas que entregavam o `enquanto` saíram. A ADA fala do passado de auditora como fato (confirmado no cap. 2), com algo de respeito, e a frase também é o tema do puzzle.

**Local:** Refrigeração | **Tipo:** enunciado (reserva local)
```
Os racks precisam baixar até [N] graus ou menos.
Cada ciclo do resfriador tira o passo do rack.
Desligue no ponto: um ciclo a mais congela o rack.
```
Justificativa: praticamente MANTIDO.

**Local:** Refrigeração | **Tipo:** dica 1 (nova)
```
Tem um rack que já começa frio. Quantos ciclos ele deveria rodar?
```

**Local:** Refrigeração, resolvido | **Tipo:** diálogo
```
COSMO: Um rack precisou de várias voltas, outro de nenhuma. Esse laço não conta antes: ele pergunta a cada volta.
```
Justificativa: de duas falas de aula para uma reação com o conceito embutido. "O vapor parou. Caminho livre." foi **removida**.

**Local:** Data center, entrada | **Tipo:** diálogo
```
COSMO:   Esses armários guardam... memórias. De gente.
COSMO:   As pessoas ligadas aos chips. E pelo visto ela vai apagar tudo.
SISTEMA: > quarentena ativa: porta selada até o fim do backup
COSMO:   Dá para copiar para aqueles drives. Mas cada drive tem o espaço contado.
ADA:     Cada byte que você salvar, eu apago de novo. Mas continue contando.   (MANTIDO)
```
Justificativa: tira "repetir para cada arquivo, decidindo dentro da repetição", que era o programa inteiro.

**Local:** Data center | **Tipo:** enunciado (reserva local)
```
A ADA vai apagar as memórias deste acervo.
Copie para cada drive os arquivos que ainda cabem
nele, um por um, e conte quantos foram salvos.
```
Justificativa: "acervo" desfaz a ambiguidade de "arquivo". O texto continua sem palavra de comparação, como a ficha exige.

**Local:** Data center | **Tipo:** dica 1 (nova)
```
Siga um drive arquivo por arquivo. E quando sobra espaço exato para mais um?
```

**Local:** Data center, resolvido | **Tipo:** diálogo
```
COSMO:   Tudo que cabia, salvo. Nem um a mais, nem um a menos.    (MANTIDO)
SISTEMA: > backup concluído: quarentena encerrada                   (MANTIDO)
```
A segunda fala (aula sobre o `se` dentro do laço) foi **removida**.

**Local:** Ponte de luz, entrada | **Tipo:** diálogo
```
COSMO: Um abismo. Do outro lado, a porta. E nenhum chão no meio.   (MANTIDO)
COSMO: Aquilo são emissores de uma ponte de luz. Cada faixa é uma fileira de placas, e cada placa pede a sua energia.
ADA:   Esta ponte só firma para quem soma direito. Você somava direito.
```
Justificativa: as duas falas que entregavam o `para cada` saíram. A ADA volta ao passado da Artemis sem explicar.

**Local:** Ponte de luz | **Tipo:** enunciado | **MANTIDO** · **Dica 1 (nova):**
```
Olhe uma faixa só: quanto pede cada placa, e quanto a faixa inteira precisa?
```

**Local:** Ponte de luz, resolvido | **Tipo:** diálogo
```
COSMO: Cada placa recebeu a dela. Você não disse quantas vezes: a lista disse.
COSMO: A ponte firmou. Pode atravessar... sem olhar para baixo.   (MANTIDO)
```
Justificativa: duas falas de aula viraram uma.

**Local:** Antessala, entrada | **Tipo:** diálogo
```
COSMO:   É aqui. Atrás daquela porta fica o núcleo.
SISTEMA: > selo do núcleo: rotina de travas em execução
COSMO:   Olha as travas... sobem, estouram, recomeçam. Ela escreveu um laço que nunca termina.   (MANTIDO)
ADA:     Você revisava os meus laços, Artemis. Este eu escrevi sem você.
```
Justificativa: tira "todo laço precisa de um jeito de PARAR" (o enunciado diz isso). A ADA usa o nome dela pela primeira vez, e a frase tem algo de mágoa, não de ameaça.

**Local:** Selo do núcleo | **Tipo:** enunciado (reserva local)
```
Cada trava abre quando o nível chega a [N] ou mais.
O laço da ADA nunca para: reescreva para que
cada trava carregue só até abrir, e pare.
```
Justificativa: "nível" no lugar de "carga", a mesma palavra da variável `nivel`.

**Local:** Selo do núcleo | **Tipo:** dica 1 (nova)
```
Procure uma trava que pula o ponto sem cair nele em cheio. Ela para?
```

**Local:** Antessala, resolvido | **Tipo:** diálogo
```
COSMO:   Todas paradas no ponto. Um laço só termina se a condição puder ficar falsa.
COSMO:   ...Às vezes eu acho que ela também é isso. Um laço que ninguém escreveu como parar.
SISTEMA: > selo do núcleo: rompido
```
Justificativa: três falas viraram duas. A explicação do `!=` foi **removida**: só faz sentido para quem tentou o `!=`, e o mapa já mostrou a trava girando. O "a ADA é um laço" virou dúvida do Cosmo, não moral. "Vamos dar a ela uma condição de parada" foi **removida** por ser explícita demais antes do confronto.

### EXAMINAR | **MANTIDO**
Os comentários do Cosmo sobre o cenário são o melhor humor do jogo e são opcionais: exatamente o papel certo. Nenhuma alteração.

---

## ETAPA 4: AUDITORIA FINAL

- **O Cosmo continua repetitivo?** Não. As aulas pós-puzzle caíram de 7 para 3, todas em reações e só nos conceitos novos (laço, `enquanto`, `para cada`). A lição da ordem, na expedição, fica como reação a um caso concreto.
- **Variedade de duração:**
  - Entradas: de 1 fala (sala de segurança) a 4 (WITCH).
  - Momentos longos só nas transmissões da Lua e no fim de capítulo.
  - Salas quase silenciosas depois do puzzle: data center, hall, depósito, refrigeração.
- **Enunciados claros?** Todos têm o que está acontecendo, o critério de sucesso e as restrições. Nenhum nomeia estrutura nem tipo técnico.
- **As dicas entregam a solução?** A dica 1 nunca entrega. A dica 2 continua entregando, por desenho (é o último recurso).
- **Ambiguidade preservada e progressiva?** Cap. 1: o "dela", o registro de auditoria, a reação ao "você nos traiu". Cap. 2: o palpite errado do Cosmo, corrigido pela Lua. Cap. 3: a ADA trata a Artemis como antiga colega três vezes, sem revelar nada além do que a Lua já disse. Nenhuma fala anuncia que alguém está escondendo algo.
- **A Artemis no centro?** Continua sem falas (não há personalidade estabelecida para ela), mas agora o mundo reage a ela: o robô, o registro, a ADA pelo nome, o Cosmo se preocupando.
- **Alguma mecânica alterada?** Nenhuma solução, valor ou regra mudou. A fala do Cache foi corrigida para não descrever uma mecânica que não existe mais.

### Depende de decisão ou confirmação do desenvolvedor

1. **Dicas em dois níveis.** O console mostra hoje um único `hint`. Seria preciso:
   - aceitar `hints: [dica1, dica2]`;
   - ajustar o conferidor (`hintShows` exige números e operadores da solução na dica; deve passar a olhar só a última).

   Nos puzzles da IA, a dica 2 continua gerada da solução, e a dica 1 pode ser um campo fixo na ficha (`aiSpecs`), porque a estrutura de cada puzzle não muda.
2. **Enunciados dos puzzles da IA.** Quem escreve é o Gemini. Os textos acima valem para as reservas locais e como exemplo; para o estilo chegar à IA, o prompt do `aiService` precisa das regras do guia (o que está acontecendo, o critério de sucesso, as restrições, sem nomear estrutura, com as palavras do código).
3. **Registro de auditoria no porão.** É fala nova. Aprovar como cânone? Ele antecipa o que a Lua revela no cap. 2.
4. **`introScript` nas catracas.** A recepção não tem; a fala nova do conceito de `se` precisa ser ligada no `PuzzleDevice`.
5. **Ventilação não testa o tipo texto.** Todas as peças de valor já vêm entre aspas. Uma isca sem aspas (`B2`) faria o puzzle testar string de verdade; precisa confirmar como o console reage a esse valor.
6. **WITCH.** Hoje o único aviso de status da luta é o de "sem fôlego". Se a sentença, a onda e o relógio saírem da fala do Cosmo, vale conferir em jogo se os avisos visuais bastam ou se cabe um aviso curto na primeira vez de cada golpe.
7. **Linha de montagem.** Confirmar que o `AssemblyLine` e a coluna NO MAPA usam "vão" e "faixa".
8. **Jardim.** A ficha da IA permite regras com o tipo de planta (o cacto pede menos água). A dica 1 sugerida ("o que decide?") cobre os dois casos, mas vale confirmar se a reserva local deveria variar por planta também.
9. **Cache.** Confirmar que o menu do REPROGRAMAR e o enunciado da ROTINA bastam para o jogador entender o item sem a explicação do Cosmo.
