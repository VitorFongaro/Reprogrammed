-- =========================================================
-- 0003 — Capítulo 2: a recepção do térreo
--
-- Primeira sala do mapa definitivo do capítulo 2 (cap2-recepcao) e o puzzle
-- das catracas. Sem a fase e o puzzle aqui, o save grava a cena sem fase e a
-- telemetria do puzzle é recusada (slug desconhecido).
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente: pode rodar de novo.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap2-recepcao', 'Recepção',
       'Térreo da Elysium: as catracas travadas pelo bloqueio pedem a primeira condicional do capítulo.',
       'easy'::public.difficulty_level, 'conditionals'::public.programming_topic, 1
from public.chapters c
where c.order_index = 2
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'recepcao-catracas', 'Catracas // Acesso',
       'As catracas travaram para todo mundo durante o bloqueio.',
       'conditionals'::public.programming_topic,
       'Reescreva a regra de acesso: só crachá do nível mínimo ou mais passa.',
       'se cracha >= 3 : catraca = true',
       'easy'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap2-recepcao'
on conflict (slug) do nothing;
