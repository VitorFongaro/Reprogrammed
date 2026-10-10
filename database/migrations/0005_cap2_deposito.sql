-- =========================================================
-- 0005 — Depósito do térreo (cap2-deposito)
--
-- A sala que vem depois do jardim, com os dois puzzles de MUNDO das caixas,
-- gerados pela IA como o da irrigação: o corredor de estantes
-- (deposito-corredor, limite numérico) e a ponte do guindaste
-- (deposito-ponte, o conectivo ou). Sem estas linhas a telemetria das
-- tentativas e o nível da fase no save ficam sem referência.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap2-deposito', 'Depósito',
       'O almoxarifado do térreo: puzzles de mundo com caixas (limite numérico e o conectivo ou), gerados pela IA.',
       'medium'::public.difficulty_level, 'conditionals'::public.programming_topic, 3
from public.chapters c
where c.order_index = 2
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, v.slug, v.title, v.description, 'conditionals'::public.programming_topic, v.objective, v.expected_output,
       'medium'::public.difficulty_level, v.order_index, 100
from public.levels l
join (values
  ('deposito-corredor', 'Corredor // Estantes', 'Caixas travam o corredor entre as estantes do depósito.',
   'Mande as caixas leves para a prateleira de cima e as pesadas para a de baixo.',
   'se peso <= 50 : lado = "cima" / senão : lado = "baixo"', 1),
  ('deposito-ponte', 'Ponte // Guindaste', 'Um fosso corta o depósito; o guindaste monta a ponte com as caixas da esteira.',
   'Mande para a ponte só as caixas que aguentam a Artemis.',
   'se material == "aco" ou cheia : destino = "ponte" / senão : destino = "descarte"', 2)
) as v(slug, title, description, objective, expected_output, order_index) on true
where l.slug = 'cap2-deposito'
on conflict (slug) do nothing;
