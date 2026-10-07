-- =========================================================
-- SEED DATA
-- Dados iniciais do jogo
--
-- Os `slug` são as chaves de cena do Phaser e os ids de puzzle usados pelo
-- cliente. É por eles que o save referencia onde o jogador está e o que ele já
-- resolveu, então NÃO renomeie um slug sem migrar os saves existentes.
--
-- O capítulo 1 tem todas as fases; do capítulo 2, só as salas do mapa
-- definitivo que já existem (as salas de teste provisórias ficam de fora). Os
-- capítulos 3 e 4 ficam cadastrados como roteiro, sem fases inventadas.
-- =========================================================

insert into public.chapters (
  title,
  description,
  order_index
)
values
(
  'Variáveis e Operações',
  'Introdução aos conceitos básicos de programação, armazenamento de valores e operações simples.',
  1
),
(
  'Condicionais',
  'Uso de estruturas de decisão para controlar portas, mecanismos e caminhos dentro da Elysium.',
  2
),
(
  'Loops',
  'Uso de repetições para automatizar ações, movimentar mecanismos e resolver padrões.',
  3
),
(
  'Funções',
  'Organização e reutilização de comandos para resolver desafios mais complexos.',
  4
);

-- =========================================================
-- LEVELS — capítulo 1 (porão -> saguão)
--
-- Só as salas com jogabilidade viram fase. O corredor e o saguão são
-- transições: o save guarda a cena deles em current_scene e deixa
-- current_level_id nulo.
-- =========================================================

insert into public.levels (
  chapter_id,
  slug,
  title,
  description,
  base_difficulty,
  main_topic,
  order_index
)
select
  c.id,
  v.slug,
  v.title,
  v.description,
  v.base_difficulty::public.difficulty_level,
  v.main_topic::public.programming_topic,
  v.order_index
from public.chapters c
cross join (values
  ('cap1-porao', 'Porão', 'A Artemis desperta no depósito e cria a primeira variável para religar o gerador.', 'easy', 'variables', 1),
  ('cap1-arquivos', 'Sala de Arquivos', 'O Cosmo mostra que cada registro é uma variável — e dá um nome à androide.', 'easy', 'variables', 2),
  ('cap1-controle', 'Controle Ambiental', 'Texto e número decimal: o setor da ventilação e a temperatura do núcleo.', 'easy', 'variables', 3),
  ('cap1-treinamento', 'Sala de Treinamento', 'Desviar e desativar: lasers e torretas caem com booleano e zero.', 'medium', 'variables', 4),
  ('cap1-sentinela', 'Arena da Sentinela', 'Mini-batalha de treino antes do boss, com a mecânica de turnos.', 'medium', 'variables', 5),
  ('cap1-seguranca', 'Sala de Segurança', 'Antessala do núcleo do ENIAC e a batalha contra ele.', 'hard', 'variables', 6)
) as v(slug, title, description, base_difficulty, main_topic, order_index)
where c.order_index = 1;

-- =========================================================
-- LEVELS — capítulo 2 (térreo). Só as salas do mapa definitivo.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, v.slug, v.title, v.description,
       v.base_difficulty::public.difficulty_level, v.main_topic::public.programming_topic, v.order_index
from public.chapters c
cross join (values
  ('cap2-recepcao', 'Recepção', 'Térreo da Elysium: as catracas travadas pelo bloqueio pedem a primeira condicional do capítulo.', 'easy', 'conditionals', 1),
  ('cap2-jardim', 'Jardim de Inverno', 'A estufa do térreo: a irrigação dos canteiros pede um se/senão, com a regra gerada pela IA.', 'easy', 'conditionals', 2)
) as v(slug, title, description, base_difficulty, main_topic, order_index)
where c.order_index = 2;

-- =========================================================
-- PUZZLES — os consoles que existem no jogo (variável e condicional)
-- expected_output usa a mesma sintaxe do console (`nome = valor`). Nos
-- puzzles com número sorteado (data/puzzleVariants.js), é um exemplo.
-- =========================================================

insert into public.puzzles (
  level_id,
  slug,
  title,
  description,
  topic,
  objective,
  expected_output,
  base_difficulty,
  order_index,
  max_score
)
select
  l.id,
  v.slug,
  v.title,
  v.description,
  v.topic::public.programming_topic,
  v.objective,
  v.expected_output,
  v.base_difficulty::public.difficulty_level,
  v.order_index,
  100
from public.levels l
join (values
  ('cap1-porao', 'porao-gerador', 'Gerador // Núcleo', 'O gerador do depósito está sem carga e nenhuma porta abre sem energia.', 'variables', 'Crie a variável energia guardando a carga total.', 'energia = 100', 'easy', 1),
  ('cap1-controle', 'controle-ventilacao', 'Ventilação // Setor', 'A ventilação não sabe para qual setor soprar.', 'variables', 'Guarde o setor em uma variável de texto.', 'setor = "B2"', 'easy', 1),
  ('cap1-controle', 'controle-termostato', 'Termostato // Núcleo', 'O núcleo precisa de uma temperatura com casa decimal.', 'variables', 'Guarde a temperatura em uma variável de número quebrado.', 'temperatura = 21.5', 'easy', 2),
  ('cap1-treinamento', 'treinamento-lasers', 'Barreira // Lasers', 'A barreira de laser corta o corredor em ciclos.', 'variables', 'Desligue a barreira com um valor de verdadeiro ou falso.', 'lasers = false', 'medium', 1),
  ('cap1-treinamento', 'treinamento-municao', 'Torretas // Munição', 'As torretas continuam atirando enquanto tiverem munição.', 'variables', 'Zere a munição das torretas.', 'municao = 0', 'medium', 2),
  ('cap2-recepcao', 'recepcao-catracas', 'Catracas // Acesso', 'As catracas travaram para todo mundo durante o bloqueio.', 'conditionals', 'Reescreva a regra de acesso: só crachá do nível mínimo ou mais passa.', 'se cracha >= 3 : catraca = true', 'easy', 1),
  ('cap2-jardim', 'jardim-irrigacao', 'Irrigação // Estufa', 'A irrigação da estufa rega todos os canteiros do mesmo jeito.', 'conditionals', 'Reescreva a regra para regar só os canteiros que precisam de água.', 'se umidade < 40 : regar = true / senão : regar = false', 'easy', 1)
) as v(level_slug, slug, title, description, topic, objective, expected_output, base_difficulty, order_index)
  on l.slug = v.level_slug;

-- =========================================================
-- BOSSES — HP igual ao configurado na BattleScene do cliente
-- =========================================================

insert into public.bosses (
  level_id,
  name,
  description,
  max_hp,
  attack_power,
  base_difficulty
)
select
  l.id,
  v.name,
  v.description,
  v.max_hp,
  v.attack_power,
  v.base_difficulty::public.difficulty_level
from public.levels l
join (values
  ('cap1-sentinela', 'Sentinela', 'Unidade didática da Elysium: mini-batalha de treino, sem turno de defesa.', 25, 2, 'medium'),
  ('cap1-seguranca', 'ENIAC', 'Unidade-sentinela do ENIAC, o computador central da Elysium.', 60, 4, 'hard')
) as v(level_slug, name, description, max_hp, attack_power, base_difficulty)
  on l.slug = v.level_slug;
