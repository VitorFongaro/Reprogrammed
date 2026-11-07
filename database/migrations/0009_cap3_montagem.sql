-- =========================================================
-- 0009 — Capítulo 3: Linha de Montagem (cap3-montagem)
--
-- A primeira sala do último andar, com o primeiro puzzle de REPETIÇÃO
-- (montagem-prensa, gerado pela IA). Sem estas linhas a telemetria das
-- tentativas e o nível da fase no save ficam sem referência.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap3-montagem', 'Linha de Montagem',
       'A prensa enche os moldes da ponte: o primeiro repita do capítulo, com os moldes gerados pela IA.',
       'easy'::public.difficulty_level, 'loops'::public.programming_topic, 1
from public.chapters c
where c.order_index = 3
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'montagem-prensa', 'Prensa // Moldes', 'Os moldes da ponte passam pela prensa, que bate uma placa por vez.',
       'loops'::public.programming_topic, 'Repita a batida uma vez por coluna, somando as fileiras de cada molde.',
       'repita vao vezes : placas = placas + faixas', 'easy'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap3-montagem'
on conflict (slug) do nothing;
