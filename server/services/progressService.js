import { createUserSupabaseClient } from '../config/supabase.js';

const volumeFields = ['music_volume', 'sfx_volume'];

const mapProgressError = (error, fallbackMessage) => {
  const settingsError = new Error(error?.message || fallbackMessage);
  settingsError.statusCode = error?.status || 400;
  return settingsError;
};

const normalizeVolume = (value, fieldName) => {
  const volume = Number(value);

  if (!Number.isInteger(volume) || volume < 1 || volume > 100) {
    const error = new Error(`${fieldName} deve ser um numero inteiro entre 1 e 100.`);
    error.statusCode = 400;
    throw error;
  }

  return volume;
};

export const getProgressServiceStatus = () => 'ready';

// =========================================================
// SAVE DO JOGO (user_game_state)
//
// Guarda só o que o save deve reverter: a cena onde o jogador retoma e os
// puzzles que ele tinha resolvido NO MOMENTO do save (estilo Resident Evil —
// o que foi resolvido depois do ultimo save se perde).
//
// O que a IA aprendeu sobre o jogador (tentativas, acertos, dificuldade
// adaptativa) NAO passa por aqui: fica em puzzle_attempts,
// user_level_progress e user_topic_performance, que sao monotonicos. Carregar
// um save nunca os reverte, senao o jogador zeraria a dificuldade so saindo e
// voltando do jogo.
// =========================================================

const MAX_SOLVED_PUZZLES = 200;
const MAX_SLUG_LENGTH = 60;
const MAX_SCENE_LENGTH = 100;

const invalid = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeScene = (scene) => {
  if (typeof scene !== 'string' || !scene.trim()) {
    throw invalid('scene e obrigatorio.');
  }

  const value = scene.trim();

  if (value.length > MAX_SCENE_LENGTH) {
    throw invalid(`scene deve ter no maximo ${MAX_SCENE_LENGTH} caracteres.`);
  }

  return value;
};

const normalizeSolvedPuzzles = (solvedPuzzles) => {
  if (solvedPuzzles === undefined) {
    return [];
  }

  if (!Array.isArray(solvedPuzzles)) {
    throw invalid('solvedPuzzles deve ser uma lista de slugs.');
  }

  if (solvedPuzzles.length > MAX_SOLVED_PUZZLES) {
    throw invalid(`solvedPuzzles deve ter no maximo ${MAX_SOLVED_PUZZLES} itens.`);
  }

  const slugs = solvedPuzzles.map((slug) => {
    if (typeof slug !== 'string' || !slug.trim() || slug.length > MAX_SLUG_LENGTH) {
      throw invalid('Cada item de solvedPuzzles deve ser um slug de ate 60 caracteres.');
    }

    return slug.trim();
  });

  return [...new Set(slugs)];
};

// A cena e a unica coisa que o cliente manda; capitulo e fase saem dela, para
// o cliente nao precisar conhecer os ids gerados do banco.
const resolveLevel = async (client, scene) => {
  const { data, error } = await client
    .from('levels')
    .select('id, chapter_id')
    .eq('slug', scene)
    .maybeSingle();

  if (error) {
    throw mapProgressError(error, 'Nao foi possivel identificar a fase atual.');
  }

  // Cenas de transicao (corredor, saguao) nao sao fases: o save guarda so a cena.
  return data || { id: null, chapter_id: null };
};

export const getGameState = async (userId, accessToken) => {
  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client
    .from('user_game_state')
    .select('current_scene, current_level_id, current_chapter_id, solved_puzzles, last_saved_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw mapProgressError(error, 'Nao foi possivel carregar o save.');
  }

  if (!data || !data.current_scene) {
    return null;
  }

  return {
    scene: data.current_scene,
    solvedPuzzles: data.solved_puzzles ?? [],
    savedAt: data.last_saved_at
  };
};

export const saveGameState = async (userId, accessToken, payload = {}) => {
  const scene = normalizeScene(payload.scene);
  const solvedPuzzles = normalizeSolvedPuzzles(payload.solvedPuzzles);

  const client = createUserSupabaseClient(accessToken);
  const level = await resolveLevel(client, scene);

  const { data, error } = await client
    .from('user_game_state')
    .upsert({
      user_id: userId,
      current_scene: scene,
      current_level_id: level.id,
      current_chapter_id: level.chapter_id,
      solved_puzzles: solvedPuzzles
    }, { onConflict: 'user_id' })
    .select('current_scene, solved_puzzles, last_saved_at')
    .single();

  if (error) {
    throw mapProgressError(error, 'Nao foi possivel salvar o jogo.');
  }

  return {
    scene: data.current_scene,
    solvedPuzzles: data.solved_puzzles ?? [],
    savedAt: data.last_saved_at
  };
};

export const getUserSettings = async (userId, accessToken) => {
  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client
    .from('user_settings')
    .select('music_volume, sfx_volume')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw mapProgressError(error, 'Nao foi possivel carregar as configuracoes.');
  }

  return data;
};

export const updateUserSettings = async (userId, accessToken, changes = {}) => {
  const update = {};

  volumeFields.forEach((field) => {
    if (changes[field] !== undefined) {
      update[field] = normalizeVolume(changes[field], field);
    }
  });

  if (Object.keys(update).length === 0) {
    const error = new Error('Informe music_volume ou sfx_volume.');
    error.statusCode = 400;
    throw error;
  }

  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client
    .from('user_settings')
    .update(update)
    .eq('user_id', userId)
    .select('music_volume, sfx_volume')
    .single();

  if (error) {
    throw mapProgressError(error, 'Nao foi possivel salvar as configuracoes.');
  }

  return data;
};

// =========================================================
// TENTATIVAS (perfil de aprendizado)
//
// Entrada do sistema adaptativo. Uma linha = uma abertura do console, com
// quantas vezes o jogador errou dentro dela.
//
// NAO faz parte do save: e gravado quando acontece e nunca revertido por
// carregar um save. Toda a escrita vive na funcao record_puzzle_attempt, que
// grava a tentativa e atualiza o desempenho por topico na mesma transacao.
// =========================================================

const MAX_ERRORS = 999;
const MAX_SECONDS = 3600;

const normalizeCount = (value, max, field) => {
  if (value === undefined || value === null) {
    return 0;
  }

  const n = Number(value);

  if (!Number.isFinite(n) || n < 0) {
    throw invalid(`${field} deve ser um numero maior ou igual a zero.`);
  }

  return Math.min(Math.round(n), max);
};

export const recordAttempt = async (userId, accessToken, payload = {}) => {
  const slug = payload.puzzle;

  if (typeof slug !== 'string' || !slug.trim() || slug.length > MAX_SLUG_LENGTH) {
    throw invalid('puzzle deve ser o slug do desafio.');
  }

  if (typeof payload.correct !== 'boolean') {
    throw invalid('correct deve ser true ou false.');
  }

  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client.rpc('record_puzzle_attempt', {
    p_puzzle_slug: slug.trim(),
    p_correct: payload.correct,
    p_errors: normalizeCount(payload.errors, MAX_ERRORS, 'errors'),
    p_seconds: normalizeCount(payload.seconds, MAX_SECONDS, 'seconds')
  });

  if (error) {
    throw mapProgressError(error, 'Nao foi possivel registrar a tentativa.');
  }

  // A funcao devolve o desempenho acumulado no topico do puzzle.
  const performance = Array.isArray(data) ? data[0] : data;

  return {
    attempts: performance?.attempts ?? 0,
    correctAttempts: performance?.correct_attempts ?? 0,
    accuracy: Number(performance?.accuracy ?? 0)
  };
};
