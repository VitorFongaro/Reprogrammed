-- =========================================================
-- 0014 — Capítulo 3: Núcleo (cap3-nucleo)
--
-- A sala da ADA, a última do jogo: galeria com o perfil de aprendizagem e a
-- arena do embate final. Sem puzzle de console (por isso sem linha em
-- puzzles); o boss entra em `bosses` quando o combate tiver HP definido.
-- Sem esta linha o save na sala fica sem a fase.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap3-nucleo', 'Núcleo',
       'A sala da ADA, a última do jogo: a galeria com o perfil de aprendizagem da Artemis e a arena do embate final.',
       'hard'::public.difficulty_level, 'loops'::public.programming_topic, 6
from public.chapters c
where c.order_index = 3
on conflict (slug) do nothing;
