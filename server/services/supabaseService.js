import { createUserSupabaseClient, supabase } from '../config/supabase.js';

const profileColumns = 'id, username, display_name, role, created_at, updated_at';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9_]{3,50}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeUsername = (username) => String(username || '').trim();

const buildAuthResponse = (session, user, profile) => ({
  session,
  user: {
    id: user.id,
    email: user.email,
    profile
  }
});

const mapSupabaseError = (error, fallbackMessage = 'Erro ao comunicar com o Supabase.') => {
  if (!error) {
    return null;
  }

  const message = error.message || fallbackMessage;
  const authError = new Error(message);
  authError.statusCode = error.status || 400;
  return authError;
};

export const getProfileByUserId = async (userId, accessToken) => {
  if (!accessToken) {
    return null;
  }

  const client = createUserSupabaseClient(accessToken);
  const { data, error } = await client
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .single();

  if (error) {
    throw mapSupabaseError(error, 'Não foi possível carregar o perfil.');
  }

  return data;
};

export const registerUser = async ({ username, email, password, confirmPassword } = {}) => {
  const cleanUsername = normalizeUsername(username);
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || '');
  const cleanConfirmPassword = String(confirmPassword || '');

  if (!cleanUsername || !cleanEmail || !cleanPassword || !cleanConfirmPassword) {
    const error = new Error('Preencha usuário, email, senha e confirmação de senha.');
    error.statusCode = 400;
    throw error;
  }

  if (!usernamePattern.test(cleanUsername)) {
    const error = new Error('Usuario deve ter 3 a 50 caracteres e usar apenas letras, números ou _.');
    error.statusCode = 400;
    throw error;
  }

  if (!emailPattern.test(cleanEmail)) {
    const error = new Error('Email inválido.');
    error.statusCode = 400;
    throw error;
  }

  if (cleanPassword.length < 6) {
    const error = new Error('A senha precisa ter pelo menos 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  if (cleanPassword !== cleanConfirmPassword) {
    const error = new Error('As senhas não conferem.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: {
      data: {
        username: cleanUsername,
        display_name: cleanUsername
      }
    }
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      const conflictError = new Error('Este email já esta em uso.');
      conflictError.statusCode = 409;
      throw conflictError;
    }

    if (/database|duplicate|unique|profile|username/i.test(error.message)) {
      const accountError = new Error('Não foi possivel criar a conta. Verifique se email ou usuário já estão em uso.');
      accountError.statusCode = 409;
      throw accountError;
    }

    throw mapSupabaseError(error, 'Não foi possivel criar a conta.');
  }

  const accessToken = data.session?.access_token;
  const profile = data.user
    ? await getProfileByUserId(data.user.id, accessToken)
    : null;

  return buildAuthResponse(data.session, data.user, profile);
};

export const loginUser = async ({ email, password } = {}) => {
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || '');

  if (!cleanEmail || !cleanPassword) {
    const error = new Error('Preencha email e senha.');
    error.statusCode = 400;
    throw error;
  }

  if (!emailPattern.test(cleanEmail)) {
    const error = new Error('Email inválido.');
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword
  });

  if (error) {
    const loginError = new Error('Email ou senha inválidos.');
    loginError.statusCode = 401;
    throw loginError;
  }

  const profile = await getProfileByUserId(data.user.id, data.session.access_token);

  return buildAuthResponse(data.session, data.user, profile);
};

export const logoutUser = async (accessToken) => {
  if (!accessToken) {
    return;
  }

  const client = createUserSupabaseClient(accessToken);
  await client.auth.signOut();
};

export const refreshUserSession = async (refreshToken) => {
  const cleanRefreshToken = String(refreshToken || '').trim();

  if (!cleanRefreshToken) {
    const error = new Error('Refresh token ausente.');
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: cleanRefreshToken
  });

  if (error || !data.session || !data.user) {
    const refreshError = new Error('Sessao expirada. Faca login novamente.');
    refreshError.statusCode = 401;
    throw refreshError;
  }

  const profile = await getProfileByUserId(
    data.user.id,
    data.session.access_token
  );

  return buildAuthResponse(data.session, data.user, profile);
};

export const getCurrentUser = async (accessToken) => {
  if (!accessToken) {
    const error = new Error('Token de autenticação ausente.');
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    const authError = new Error('Sessao inválida ou expirada.');
    authError.statusCode = 401;
    throw authError;
  }

  const profile = await getProfileByUserId(data.user.id, accessToken);

  return {
    id: data.user.id,
    email: data.user.email,
    profile
  };
};
