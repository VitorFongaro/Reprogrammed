-- =========================================================
-- SEED DATA
-- Dados iniciais do jogo
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

insert into public.levels (
  chapter_id,
  title,
  description,
  base_difficulty,
  main_topic,
  order_index
)
values
(
  1,
  'Primeiro Código',
  'A protagonista aprende a usar variáveis para ativar um terminal antigo no subsolo da Elysium.',
  'easy',
  'variables',
  1
),
(
  1,
  'Porta Numérica',
  'O jogador precisa usar operações básicas para descobrir o código de uma porta de segurança.',
  'easy',
  'operators',
  2
),
(
  2,
  'Porta de Segurança',
  'O jogador usa condicionais para decidir se uma porta deve ser aberta ou permanecer bloqueada.',
  'medium',
  'conditionals',
  1
),
(
  3,
  'Esteira Automática',
  'O jogador usa loops para repetir comandos e mover mecanismos pelo cenário.',
  'medium',
  'loops',
  1
),
(
  4,
  'Módulo de Controle',
  'O jogador usa funções para organizar comandos e controlar múltiplos sistemas ao mesmo tempo.',
  'hard',
  'functions',
  1
);

insert into public.puzzles (
  level_id,
  title,
  description,
  topic,
  objective,
  initial_code,
  expected_output,
  base_difficulty,
  order_index,
  max_score
)
values
(
  1,
  'Ativar Terminal',
  'Um terminal antigo precisa receber o valor correto de energia para ser iniciado.',
  'variables',
  'Crie uma variável chamada energia com valor 10.',
  'let energia = 0;',
  'energia = 10',
  'easy',
  1,
  100
),
(
  2,
  'Código da Porta',
  'A porta exige o resultado correto de uma operação matemática simples.',
  'operators',
  'Calcule o código usando soma e multiplicação.',
  'let codigo = 0;',
  'codigo = 15',
  'easy',
  1,
  100
),
(
  3,
  'Verificar Acesso',
  'A porta só abre se o nível de acesso for suficiente.',
  'conditionals',
  'Use uma estrutura condicional para abrir a porta se acesso for maior ou igual a 3.',
  'let acesso = 3;\nlet portaAberta = false;',
  'portaAberta = true',
  'medium',
  1,
  100
),
(
  4,
  'Mover Esteira',
  'A esteira precisa repetir o movimento algumas vezes para transportar uma caixa.',
  'loops',
  'Use um loop para mover a caixa 5 vezes.',
  'let movimentos = 0;',
  'movimentos = 5',
  'medium',
  1,
  100
),
(
  5,
  'Reiniciar Sistema',
  'O sistema precisa de uma função para reiniciar módulos diferentes.',
  'functions',
  'Crie uma função que reinicie o módulo de controle.',
  'function reiniciarModulo() {\n  \n}',
  'moduloReiniciado = true',
  'hard',
  1,
  100
);

insert into public.achievements (
  name,
  description,
  icon,
  condition_type
)
values
(
  'Primeiro Código',
  'Concluiu o primeiro puzzle de programação.',
  'first_code',
  'complete_first_puzzle'
),
(
  'Aprendiz da Lógica',
  'Concluiu uma fase de variáveis ou operações.',
  'logic_apprentice',
  'complete_basic_level'
),
(
  'Decisão Correta',
  'Concluiu um puzzle de condicionais.',
  'conditionals_badge',
  'complete_conditionals_puzzle'
),
(
  'Mestre dos Loops',
  'Concluiu um puzzle envolvendo repetição.',
  'loops_badge',
  'complete_loops_puzzle'
),
(
  'Código Reutilizável',
  'Concluiu um puzzle envolvendo funções.',
  'functions_badge',
  'complete_functions_puzzle'
);