-- =========================================================
-- 0008 — Capítulos concluídos (seleção de capítulos no menu)
--
-- Registro de quais capítulos cada jogador já TERMINOU, para o menu liberar
-- a seleção de capítulos. É MONOTÔNICO, como o perfil de aprendizagem: só
-- recebe inserção (não há update nem delete para o jogador), então carregar um
-- save antigo ou usar o ZERAR PROGRESSO nunca tranca um capítulo de novo. Por
-- isso NÃO mora no user_game_state, que é o save (reversível).
--
-- O cliente fala em número de capítulo (chapters.order_index); o servidor
-- resolve o id.
--
-- O mesmo conteúdo entrou no schema.sql. Idempotente.
-- =========================================================

create table if not exists public.user_chapter_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id bigint not null references public.chapters(id) on delete cascade,
  completed_at timestamp with time zone not null default now(),

  primary key (user_id, chapter_id)
);

alter table public.user_chapter_progress enable row level security;

drop policy if exists "Users can view their own chapter progress" on public.user_chapter_progress;
create policy "Users can view their own chapter progress"
on public.user_chapter_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chapter progress" on public.user_chapter_progress;
create policy "Users can insert their own chapter progress"
on public.user_chapter_progress
for insert
to authenticated
with check (auth.uid() = user_id);
