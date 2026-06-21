import { createUserSupabaseClient } from '../config/supabase.js';

const volumeFields = ['music_volume', 'sfx_volume'];

const mapSettingsError = (error, fallbackMessage) => {
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

export const getUserSettings = async (userId, accessToken) => {
  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client
    .from('user_settings')
    .select('music_volume, sfx_volume')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw mapSettingsError(error, 'Nao foi possivel carregar as configuracoes.');
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
    throw mapSettingsError(error, 'Nao foi possivel salvar as configuracoes.');
  }

  return data;
};
