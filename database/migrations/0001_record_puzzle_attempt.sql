-- =========================================================
-- 0001 — Registro de tentativas
--
-- Delta para bancos que já existem. O conteúdo também está no schema.sql,
-- que continua sendo a fonte da verdade para montar o banco do zero.
--
-- Rode no SQL Editor do Supabase.
-- =========================================================

-- Registra UMA sessão do jogador com um puzzle e atualiza o desempenho por
-- tópico na mesma transação. É a entrada do sistema adaptativo: sem esta
-- gravação, o gerador de desafios não tem em que se basear.
--
-- Uma linha de puzzle_attempts = uma abertura do console, com quantas vezes o
-- jogador errou dentro dela. Nunca é revertida por carregar um save.
--
-- security invoker: roda com o JWT do jogador, então as políticas de RLS valem
-- e `auth.uid()` garante que ninguém grava no nome de outro.
create or replace function public.record_puzzle_attempt(
  p_puzzle_slug varchar,
  p_correct boolean,
  p_errors int default 0,
  p_seconds int default 0
)
returns table (attempts int, correct_attempts int, accuracy numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_puzzle public.puzzles%rowtype;
  v_difficulty public.difficulty_level;
  v_correct int := case when p_correct then 1 else 0 end;
begin
  if v_user is null then
    raise exception 'sem sessao autenticada';
  end if;

  select * into v_puzzle from public.puzzles where slug = p_puzzle_slug;

  if not found then
    raise exception 'puzzle % nao existe', p_puzzle_slug;
  end if;

  -- Dificuldade em vigor para este jogador nesta fase; sem progresso ainda,
  -- vale a dificuldade base do puzzle.
  select ulp.current_difficulty into v_difficulty
    from public.user_level_progress ulp
   where ulp.user_id = v_user
     and ulp.level_id = v_puzzle.level_id;

  v_difficulty := coalesce(v_difficulty, v_puzzle.base_difficulty);

  insert into public.puzzle_attempts (
    user_id, puzzle_id, is_correct, errors_count, time_spent_seconds, difficulty_used
  )
  values (
    v_user, v_puzzle.id, p_correct,
    greatest(coalesce(p_errors, 0), 0),
    greatest(coalesce(p_seconds, 0), 0),
    v_difficulty
  );

  insert into public.user_topic_performance (
    user_id, topic, attempts, correct_attempts, wrong_attempts, accuracy
  )
  values (v_user, v_puzzle.topic, 1, v_correct, 1 - v_correct, v_correct * 100)
  on conflict (user_id, topic) do update set
    attempts         = user_topic_performance.attempts + 1,
    correct_attempts = user_topic_performance.correct_attempts + v_correct,
    wrong_attempts   = user_topic_performance.wrong_attempts + (1 - v_correct),
    accuracy         = round(
      (user_topic_performance.correct_attempts + v_correct)::numeric * 100
      / (user_topic_performance.attempts + 1), 2
    );

  return query
    select p.attempts, p.correct_attempts, p.accuracy
      from public.user_topic_performance p
     where p.user_id = v_user
       and p.topic = v_puzzle.topic;
end;
$$;
