-- =========================================================
-- 0005 — Capítulo 2: a expedição do térreo
--
-- Terceira sala do mapa definitivo (cap2-expedicao) e o puzzle da triagem,
-- gerado por IA como o do jardim (ficha em client/data/aiSpecs.js).
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap2-expedicao', 'Expedição',
       'A triagem do correio: três rampas e um senão se em que a ordem dos testes importa, com a regra gerada pela IA.',
       'medium'::public.difficulty_level, 'conditionals'::public.programming_topic, 3
from public.chapters c
where c.order_index = 2
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'expedicao-triagem', 'Triagem // Expedição',
       'A triagem manda todo pacote para o fim da esteira e a pilha entupiu a passarela.',
       'conditionals'::public.programming_topic,
       'Mande cada pacote para a rampa certa: carga, expresso ou normal.',
       'se peso >= 25 : rampa = "carga" / senão se urgente == true : rampa = "expresso" / senão : rampa = "normal"',
       'medium'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap2-expedicao'
on conflict (slug) do nothing;
