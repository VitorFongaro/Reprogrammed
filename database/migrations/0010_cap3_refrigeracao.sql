-- =========================================================
-- 0010 — Capítulo 3: Refrigeração (cap3-refrigeracao)
--
-- A segunda sala do último andar, com o primeiro ENQUANTO
-- (refrigeracao-racks, gerado pela IA). Sem estas linhas a telemetria das
-- tentativas e o nível da fase no save ficam sem referência.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap3-refrigeracao', 'Refrigeração',
       'Os racks da ADA fervem e o vapor bloqueia a sala: o enquanto resfria cada um até o ponto, com os racks gerados pela IA.',
       'medium'::public.difficulty_level, 'loops'::public.programming_topic, 2
from public.chapters c
where c.order_index = 3
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'refrigeracao-racks', 'Refrigeração // Racks', 'Racks superaquecidos jogam vapor pela grade do piso e bloqueiam a passagem.',
       'loops'::public.programming_topic, 'Resfrie cada rack enquanto ele estiver acima do limite, sem passar do ponto.',
       'enquanto temp > 40 : temp = temp - passo', 'medium'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap3-refrigeracao'
on conflict (slug) do nothing;
