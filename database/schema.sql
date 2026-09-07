-- =========================================================
-- REPROGRAMMED - SUPABASE DATABASE SCHEMA
-- Banco com autenticação via Supabase Auth e dificuldade adaptativa por IA
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================

create type public.user_role as enum (
  'player',
  'admin'
);

create type public.level_status as enum (
  'locked',
  'unlocked',
  'in_progress',
  'completed'
);

create type public.difficulty_level as enum (
  'easy',
  'medium',
  'hard'
);

create type public.programming_topic as enum (
  'variables',
  'operators',
  'conditionals',
  'loops',
  'functions',
  'mixed'
);

-- =========================================================
-- PROFILES
-- Dados públicos do usuário.
-- Login, email e senha ficam no auth.users do Supabase.
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(50) unique not null,
  display_name varchar(100),
  role public.user_role not null default 'player',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- =========================================================
-- CHAPTERS
-- Capítulos principais do jogo
-- Ex: Variáveis, Condicionais, Loops, Funções
-- =========================================================

create table public.chapters (
  id bigint generated always as identity primary key,
  title varchar(100) not null,
  description text,
  order_index int not null unique,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- =========================================================
-- LEVELS
-- Fases dentro dos capítulos
-- base_difficulty = dificuldade planejada pelos desenvolvedores
-- =========================================================

-- slug = chave da cena no Phaser ('cap1-porao'). É por ele que o cliente
-- referencia a fase; os ids são gerados e mudariam num reseed.
create table public.levels (
  id bigint generated always as identity primary key,
  chapter_id bigint not null references public.chapters(id) on delete cascade,
  slug varchar(60) not null,
  title varchar(100) not null,
  description text,
  base_difficulty public.difficulty_level not null default 'easy',
  main_topic public.programming_topic not null,
  order_index int not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint unique_level_order_per_chapter unique (chapter_id, order_index),
  constraint unique_level_slug unique (slug)
);

-- =========================================================
-- PUZZLES
-- Desafios de programação dentro das fases
-- base_difficulty = dificuldade base do puzzle
-- =========================================================

-- slug = identificador do puzzle no cliente ('porao-gerador'), usado também
-- na lista de resolvidos do save.
create table public.puzzles (
  id bigint generated always as identity primary key,
  level_id bigint not null references public.levels(id) on delete cascade,
  slug varchar(60) not null,
  title varchar(100) not null,
  description text,
  topic public.programming_topic not null,
  objective text,
  initial_code text,
  expected_output text,
  base_difficulty public.difficulty_level not null default 'easy',
  order_index int not null,
  max_score int not null default 100, -- tem que ver
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint unique_puzzle_order_per_level unique (level_id, order_index),
  constraint unique_puzzle_slug unique (slug),
  constraint check_puzzle_max_score check (max_score >= 0)
);

-- =========================================================
-- BOSSES
-- Bosses vinculados a fases específicas
-- =========================================================

create table public.bosses (
  id bigint generated always as identity primary key,
  level_id bigint not null references public.levels(id) on delete cascade,

  name varchar(100) not null,
  description text,

  max_hp int not null default 100,
  attack_power int not null default 10,
  base_difficulty public.difficulty_level not null default 'medium',

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint unique_boss_per_level unique (level_id),
  constraint check_boss_max_hp check (max_hp > 0),
  constraint check_boss_attack_power check (attack_power >= 0)
);

-- =========================================================
-- USER LEVEL PROGRESS
-- Progresso do jogador em cada fase
-- current_difficulty = dificuldade atual aplicada ao jogador
-- ai_adjusted_difficulty = última dificuldade sugerida pela IA
-- =========================================================

create table public.user_level_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id bigint not null references public.levels(id) on delete cascade,

  status public.level_status not null default 'locked',
  best_score int not null default 0, -- ver isso daqui
  attempts int not null default 0,

  current_difficulty public.difficulty_level not null default 'easy',
  ai_adjusted_difficulty public.difficulty_level,
  last_ai_analysis_at timestamp with time zone,

  completed_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),

  constraint unique_user_level_progress unique (user_id, level_id),
  constraint check_best_score check (best_score >= 0),
  constraint check_attempts check (attempts >= 0)
);

-- =========================================================
-- PUZZLE ATTEMPTS
-- Histórico de tentativas do jogador nos puzzles
-- difficulty_used = dificuldade ativa no momento da tentativa
-- ai_feedback = feedback ou análise gerada pela IA
-- =========================================================

create table public.puzzle_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_id bigint not null references public.puzzles(id) on delete cascade,

  submitted_code text,
  is_correct boolean not null default false,
  score int not null default 0,
  errors_count int not null default 0,
  time_spent_seconds int not null default 0,

  difficulty_used public.difficulty_level not null default 'easy',
  ai_feedback text,

  created_at timestamp with time zone not null default now(),

  constraint check_attempt_score check (score >= 0),
  constraint check_errors_count check (errors_count >= 0),
  constraint check_time_spent check (time_spent_seconds >= 0)
);

-- =========================================================
-- BOSS BATTLE ATTEMPTS
-- Histórico de batalhas contra bosses
-- =========================================================

create table public.boss_battle_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  boss_id bigint not null references public.bosses(id) on delete cascade,

  won boolean not null default false,
  player_remaining_hp int not null default 0,
  boss_remaining_hp int not null default 0,

  turns_count int not null default 0,
  score int not null default 0,
  difficulty_used public.difficulty_level not null default 'medium',

  ai_feedback text,

  created_at timestamp with time zone not null default now(),

  constraint check_battle_player_hp check (player_remaining_hp >= 0),
  constraint check_battle_boss_hp check (boss_remaining_hp >= 0),
  constraint check_battle_turns check (turns_count >= 0),
  constraint check_battle_score check (score >= 0)
);

-- =========================================================
-- USER TOPIC PERFORMANCE
-- Desempenho do jogador por assunto de programação
-- estimated_skill_level = nível estimado pela IA
-- =========================================================

create table public.user_topic_performance (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,

  topic public.programming_topic not null,
  attempts int not null default 0,
  correct_attempts int not null default 0,
  wrong_attempts int not null default 0,
  accuracy numeric(5,2) not null default 0,

  estimated_skill_level public.difficulty_level not null default 'easy',
  last_ai_feedback text,
  last_ai_analysis_at timestamp with time zone,

  updated_at timestamp with time zone not null default now(),

  constraint unique_user_topic_performance unique (user_id, topic),
  constraint check_topic_attempts check (attempts >= 0),
  constraint check_correct_attempts check (correct_attempts >= 0),
  constraint check_wrong_attempts check (wrong_attempts >= 0),
  constraint check_accuracy check (accuracy >= 0 and accuracy <= 100)
);

-- =========================================================
-- USER GAME STATE
-- Save geral do jogador — só o que é REVERSÍVEL.
--
-- Estilo Resident Evil: o jogador grava no ponto de salvamento e é para lá que
-- ele volta. `solved_puzzles` é a lista de slugs resolvidos NO MOMENTO do save;
-- puzzle resolvido depois do último save se perde de propósito.
--
-- O que a IA aprendeu sobre o jogador NÃO mora aqui: tentativas, acertos e
-- dificuldade adaptativa ficam em puzzle_attempts / user_level_progress /
-- user_topic_performance, que são monotônicos — carregar um save nunca os
-- reverte, senão o jogador zeraria a dificuldade só saindo e voltando.
-- =========================================================

create table public.user_game_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  current_chapter_id bigint references public.chapters(id) on delete set null,
  current_level_id bigint references public.levels(id) on delete set null,

  current_scene varchar(100),
  position_x int not null default 0,
  position_y int not null default 0,

  solved_puzzles jsonb not null default '[]'::jsonb,

  -- HP e itens tambem sao estado de jogo, entao voltam junto com o save. `hp`
  -- nulo = save antigo, anterior a esta coluna: o cliente trata como vida cheia.
  hp int,
  inventory jsonb not null default '{}'::jsonb,

  last_saved_at timestamp with time zone not null default now(),

  constraint check_solved_puzzles check (jsonb_typeof(solved_puzzles) = 'array'),
  constraint check_inventory check (jsonb_typeof(inventory) = 'object')
);

-- =========================================================
-- USER SETTINGS
-- Configurações do jogador
-- =========================================================

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  music_volume int not null default 80,
  sfx_volume int not null default 80,
  text_speed int not null default 50,
  language varchar(10) not null default 'pt-BR',

  updated_at timestamp with time zone not null default now(),

  constraint check_music_volume check (music_volume >= 1 and music_volume <= 100),
  constraint check_sfx_volume check (sfx_volume >= 1 and sfx_volume <= 100),
  constraint check_text_speed check (text_speed >= 0 and text_speed <= 100)
);

-- =========================================================
-- AI ANALYSIS LOGS
-- Histórico das análises feitas pela IA
-- Não é obrigatório para o jogo funcionar, mas ajuda muito no TCC
-- =========================================================

create table public.ai_analysis_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,

  topic public.programming_topic,
  level_id bigint references public.levels(id) on delete set null,
  puzzle_id bigint references public.puzzles(id) on delete set null,

  previous_difficulty public.difficulty_level,
  suggested_difficulty public.difficulty_level,

  accuracy_snapshot numeric(5,2),
  attempts_snapshot int,
  correct_attempts_snapshot int,
  wrong_attempts_snapshot int,

  analysis_summary text,
  created_at timestamp with time zone not null default now(),

  constraint check_ai_accuracy_snapshot check (
    accuracy_snapshot is null or 
    accuracy_snapshot between 0 and 100
  ),
  constraint check_ai_attempts_snapshot check (
    attempts_snapshot is null or 
    attempts_snapshot >= 0
  ),
  constraint check_ai_correct_attempts_snapshot check (
    correct_attempts_snapshot is null or 
    correct_attempts_snapshot >= 0
  ),
  constraint check_ai_wrong_attempts_snapshot check (
    wrong_attempts_snapshot is null or 
    wrong_attempts_snapshot >= 0
  )
);

-- =========================================================
-- UPDATED_AT FUNCTION
-- Atualiza automaticamente campos updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_chapters_updated_at
before update on public.chapters
for each row
execute function public.set_updated_at();

create trigger set_levels_updated_at
before update on public.levels
for each row
execute function public.set_updated_at();

create trigger set_puzzles_updated_at
before update on public.puzzles
for each row
execute function public.set_updated_at();

create trigger set_bosses_updated_at
before update on public.bosses
for each row
execute function public.set_updated_at();

create trigger set_user_level_progress_updated_at
before update on public.user_level_progress
for each row
execute function public.set_updated_at();

create trigger set_user_topic_performance_updated_at
before update on public.user_topic_performance
for each row
execute function public.set_updated_at();

create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

-- user_game_state usa last_saved_at no lugar de updated_at: sem este gatilho o
-- campo só teria o valor do default e nunca marcaria o último save de verdade.
create or replace function public.set_last_saved_at()
returns trigger
language plpgsql
as $$
begin
  new.last_saved_at = now();
  return new;
end;
$$;

create trigger set_user_game_state_last_saved_at
before update on public.user_game_state
for each row
execute function public.set_last_saved_at();

-- =========================================================
-- REGISTRO DE TENTATIVAS
-- Entrada do sistema adaptativo (ver "Save" no AGENTS.md: isto e
-- monotonico, nunca revertido por carregar um save).
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

-- =========================================================
-- HANDLE NEW USER
-- Quando um usuário é criado no Supabase Auth,
-- cria automaticamente profile, settings e game_state
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    display_name
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );

  insert into public.user_settings (user_id)
  values (new.id);

  insert into public.user_game_state (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================================================
-- INDEXES
-- Melhoram consultas frequentes
-- =========================================================

create index idx_levels_chapter_id
on public.levels(chapter_id);

create index idx_puzzles_level_id
on public.puzzles(level_id);

create index idx_user_level_progress_user_id
on public.user_level_progress(user_id);

create index idx_user_level_progress_level_id
on public.user_level_progress(level_id);

create index idx_puzzle_attempts_user_id
on public.puzzle_attempts(user_id);

create index idx_puzzle_attempts_puzzle_id
on public.puzzle_attempts(puzzle_id);

create index idx_bosses_level_id
on public.bosses(level_id);

create index idx_boss_battle_attempts_user_id
on public.boss_battle_attempts(user_id);

create index idx_boss_battle_attempts_boss_id
on public.boss_battle_attempts(boss_id);

create index idx_user_topic_performance_user_id
on public.user_topic_performance(user_id);

create index idx_ai_analysis_logs_user_id
on public.ai_analysis_logs(user_id);

create index idx_ai_analysis_logs_level_id
on public.ai_analysis_logs(level_id);

create index idx_ai_analysis_logs_puzzle_id
on public.ai_analysis_logs(puzzle_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.levels enable row level security;
alter table public.puzzles enable row level security;
alter table public.bosses enable row level security;
alter table public.user_level_progress enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.boss_battle_attempts enable row level security;
alter table public.user_topic_performance enable row level security;
alter table public.user_game_state enable row level security;
alter table public.user_settings enable row level security;
alter table public.ai_analysis_logs enable row level security;

-- =========================================================
-- POLICIES: PROFILES
-- =========================================================

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================================================
-- POLICIES: PUBLIC GAME CONTENT
-- Usuários logados podem ler capítulos, fases, puzzles e conquistas.
-- Criação/edição desses dados deve ser feita pelo painel ou SQL editor.
-- =========================================================

create policy "Authenticated users can view chapters"
on public.chapters
for select
to authenticated
using (true);

create policy "Authenticated users can view levels"
on public.levels
for select
to authenticated
using (true);

create policy "Authenticated users can view puzzles"
on public.puzzles
for select
to authenticated
using (true);

create policy "Authenticated users can view bosses"
on public.bosses
for select
to authenticated
using (true);

-- =========================================================
-- POLICIES: USER LEVEL PROGRESS
-- =========================================================

create policy "Users can view their own level progress"
on public.user_level_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own level progress"
on public.user_level_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own level progress"
on public.user_level_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================================
-- POLICIES: BOSS BATTLE ATTEMPTS
-- =========================================================

create policy "Users can view their own puzzle attempts"
on public.puzzle_attempts
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own puzzle attempts"
on public.puzzle_attempts
for insert
to authenticated
with check (auth.uid() = user_id);

-- =========================================================
-- POLICIES: PUZZLE ATTEMPTS
-- =========================================================

create policy "Users can view their own boss battle attempts"
on public.boss_battle_attempts
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own boss battle attempts"
on public.boss_battle_attempts
for insert
to authenticated
with check (auth.uid() = user_id);
-- =========================================================
-- POLICIES: USER TOPIC PERFORMANCE
-- =========================================================

create policy "Users can view their own topic performance"
on public.user_topic_performance
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own topic performance"
on public.user_topic_performance
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own topic performance"
on public.user_topic_performance
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================================
-- POLICIES: USER GAME STATE
-- =========================================================

create policy "Users can view their own game state"
on public.user_game_state
for select
to authenticated
using (auth.uid() = user_id);

-- A linha normalmente nasce no handle_new_user; a política de insert cobre o
-- usuário que, por qualquer motivo, não passou por aquele gatilho.
create policy "Users can insert their own game state"
on public.user_game_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own game state"
on public.user_game_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================================
-- POLICIES: USER SETTINGS
-- =========================================================

create policy "Users can view their own settings"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update their own settings"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================================
-- POLICIES: AI ANALYSIS LOGS
-- =========================================================

create policy "Users can view their own ai analysis logs"
on public.ai_analysis_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own ai analysis logs"
on public.ai_analysis_logs
for insert
to authenticated
with check (auth.uid() = user_id);
