-- =========================================================
-- 0013 — Capítulo 3: Antessala (cap3-antessala)
--
-- A quinta sala do último andar, antes do núcleo: CONDIÇÃO DE PARADA e laço
-- infinito (antessala-selo, gerado pela IA). Sem estas linhas a telemetria
-- das tentativas e o nível da fase no save ficam sem referência.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap3-antessala', 'Antessala',
       'O selo do núcleo roda um laço que nunca termina: o jogador reescreve as travas com uma condição de parada, com as travas geradas pela IA.',
       'hard'::public.difficulty_level, 'loops'::public.programming_topic, 5
from public.chapters c
where c.order_index = 3
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'antessala-selo', 'Selo do Núcleo // Travas', 'As travas do selo rodam o laço da ADA, que nunca termina.',
       'loops'::public.programming_topic, 'Carregue cada trava só até ela abrir, com uma condição que possa ficar falsa.',
       'enquanto nivel < 30 : nivel = nivel + passo', 'hard'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap3-antessala'
on conflict (slug) do nothing;
