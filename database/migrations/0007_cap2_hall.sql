-- =========================================================
-- 0007 — Hall do Relógio (cap2-hall), a arena da WITCH
--
-- A 5ª fase do térreo, depois da expedição: o saguão central onde a WITCH,
-- a guardiã do capítulo 2, luta. Sem a fase, o save de quem está no hall
-- fica sem `current_level_id`.
--
-- O mesmo conteúdo entrou no seed.sql. Idempotente. Aplicada.
-- =========================================================

insert into public.levels (chapter_id, slug, title, description, base_difficulty, main_topic, order_index)
select c.id, 'cap2-hall', 'Hall do Relógio',
       'O saguão central do térreo: a arena da WITCH, a guardiã do capítulo 2.',
       'hard'::public.difficulty_level, 'conditionals'::public.programming_topic, 5
from public.chapters c
where c.order_index = 2
on conflict (slug) do nothing;

insert into public.bosses (level_id, name, description, max_hp, attack_power, base_difficulty)
select l.id, 'WITCH',
       'Inspirada no Harwell Dekatron (1951), o computador digital mais velho que ainda funciona. Os golpes brincam com o tempo.',
       150, 5, 'hard'::public.difficulty_level
from public.levels l
where l.slug = 'cap2-hall'
on conflict (level_id) do nothing;
