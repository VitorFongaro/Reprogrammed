-- =========================================================
-- 0011 — Capítulo 3: Data Center (cap3-datacenter)
--
-- A terceira sala do último andar: contador com um se DENTRO do laço
-- (datacenter-backup, gerado pela IA). Sem estas linhas a telemetria das
-- tentativas e o nível da fase no save ficam sem referência.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap3-datacenter', 'Data Center',
       'A ADA vai apagar as memórias: o backup copia arquivo por arquivo só o que cabe, contando os salvos, com as estações geradas pela IA.',
       'medium'::public.difficulty_level, 'loops'::public.programming_topic, 3
from public.chapters c
where c.order_index = 3
on conflict (slug) do nothing;

insert into public.puzzles (level_id, slug, title, description, topic, objective, expected_output, base_difficulty, order_index, max_score)
select l.id, 'datacenter-backup', 'Data Center // Backup', 'Estações de backup com drives de espaço limitado e filas de arquivos iguais.',
       'loops'::public.programming_topic, 'Copie cada arquivo só se ainda couber no drive e conte quantos foram salvos.',
       'repita arquivos vezes : se espaco >= tamanho : espaco = espaco - tamanho / salvos = salvos + 1', 'medium'::public.difficulty_level, 1, 100
from public.levels l
where l.slug = 'cap3-datacenter'
on conflict (slug) do nothing;
