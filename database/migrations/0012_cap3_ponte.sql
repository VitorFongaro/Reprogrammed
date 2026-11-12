-- =========================================================
-- 0012 — Capítulo 3: Ponte de Luz (cap3-ponte)
--
-- A quarta sala do último andar: o PARA CADA (ponte-luz, gerado pela IA).
-- Sem estas linhas a telemetria das tentativas e o nível da fase no save
-- ficam sem referência.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap3-ponte', 'Ponte de Luz',
       'Um abismo e uma ponte de luz feita de faixas de placas: o para cada soma a energia de cada placa, com as faixas geradas pela IA.',
       'medium'::public.difficulty_level, 'loops'::public.programming_topic, 4
from public.chapters c
where c.order_index = 3
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'ponte-luz', 'Ponte de Luz // Gerador', 'Cada faixa da ponte de luz é uma lista com a energia de cada placa.',
       'loops'::public.programming_topic, 'Passe por cada placa da faixa e some a energia dela no total do gerador.',
       'para cada placa em placas : energia = energia + placa', 'medium'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap3-ponte'
on conflict (slug) do nothing;
