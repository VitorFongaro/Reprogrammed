-- =========================================================
-- 0004 — Puzzles gerados por IA + jardim de inverno
--
-- 1. ai_analysis_logs passa a guardar cada GERAÇÃO de puzzle pelo Gemini
--    (POST /ai/puzzle): o puzzle que saiu, o modelo, se o conferidor aceitou,
--    o motivo da recusa e quanto tempo levou. É o registro que mostra, no TCC,
--    o que a IA gerou para cada jogador e em que dificuldade.
-- 2. Sala cap2-jardim e o puzzle jardim-irrigacao (o primeiro gerado por IA).
--
-- O mesmo conteúdo entrou no schema.sql e no seed.sql. Idempotente.
-- =========================================================

alter table public.ai_analysis_logs
  add column if not exists generated_puzzle jsonb,
  add column if not exists model varchar(60),
  add column if not exists accepted boolean,
  add column if not exists problems text,
  add column if not exists latency_ms int;

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap2-jardim', 'Jardim de Inverno',
       'A estufa do térreo: a irrigação dos canteiros pede um se/senão, com a regra gerada pela IA.',
       'easy'::public.difficulty_level, 'conditionals'::public.programming_topic, 2
from public.chapters c
where c.order_index = 2
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'jardim-irrigacao', 'Irrigação // Estufa',
       'A irrigação da estufa rega todos os canteiros do mesmo jeito.',
       'conditionals'::public.programming_topic,
       'Reescreva a regra para regar só os canteiros que precisam de água.',
       'se umidade < 40 : regar = true / senão : regar = false',
       'easy'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap2-jardim'
on conflict (slug) do nothing;
