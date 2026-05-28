import { createUserSupabaseClient, supabase, supabaseAdmin } from '../config/supabase.js';

const profileColumns = 'id, username, display_name, avatar_url, role, created_at, updated_at';
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

const requireAdminClient = () => {
  if (!supabaseAdmin) {
    const error = new Error('Servidor sem SUPABASE_SERVICE_ROLE_KEY. Configure a chave para cadastro e login por usuario.');
    error.statusCode = 503;
    throw error;
  }

  return supabaseAdmin;
};

const mapSupabaseError = (error, fallbackMessage = 'Erro ao comunicar com o Supabase.') => {
  if (!error) {
    return null;
  }

  const message = error.message || fallbackMessage;
  const authError = new Error(message);
  authError.statusCode = error.status || 400;
  return authError;
};

export const getProfileByUserId = async (userId, accessToken = null) => {
  const client = accessToken ? createUserSupabaseClient(accessToken) : requireAdminClient();
  const { data, error } = await client
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .single();

  if (error) {
    throw mapSupabaseError(error, 'Nao foi possivel carregar o perfil.');
  }

  return data;
};

export const registerUser = async ({ username, email, password, confirmPassword } = {}) => {
  const cleanUsername = normalizeUsername(username);
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || '');
  const cleanConfirmPassword = String(confirmPassword || '');

  if (!cleanUsername || !cleanEmail || !cleanPassword || !cleanConfirmPassword) {
    const error = new Error('Preencha usuario, email, senha e confirmacao de senha.');
    error.statusCode = 400;
    throw error;
  }

  if (!usernamePattern.test(cleanUsername)) {
    const error = new Error('Usuario deve ter 3 a 50 caracteres e usar apenas letras, numeros ou _.');
    error.statusCode = 400;
    throw error;
  }

  if (!emailPattern.test(cleanEmail)) {
    const error = new Error('Email invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (cleanPassword.length < 6) {
    const error = new Error('A senha precisa ter pelo menos 6 caracteres.');
    error.statusCode = 400;
    throw error;
  }

  if (cleanPassword !== cleanConfirmPassword) {
    const error = new Error('As senhas nao conferem.');
    error.statusCode = 400;
    throw error;
  }

  const adminClient = requireAdminClient();
  const { data: existingProfile, error: profileLookupError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (profileLookupError) {
    throw mapSupabaseError(profileLookupError, 'Nao foi possivel verificar o usuario.');
  }

  if (existingProfile) {
    const error = new Error('Este usuario ja esta em uso.');
    error.statusCode = 409;
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
      const conflictError = new Error('Este email ja esta em uso.');
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw mapSupabaseError(error, 'Nao foi possivel criar a conta.');
  }

  const accessToken = data.session?.access_token;
  const profile = data.user ? await getProfileByUserId(data.user.id, accessToken) : null;

  return buildAuthResponse(data.session, data.user, profile);
};

export const loginUser = async ({ identifier, password } = {}) => {
  const cleanIdentifier = (identifier || '').trim();
  const cleanPassword = String(password || '');

  if (!cleanIdentifier || !cleanPassword) {
    const error = new Error('Preencha usuario/email e senha.');
    error.statusCode = 400;
    throw error;
  }

  let email = cleanIdentifier;

  if (!emailPattern.test(cleanIdentifier)) {
    const adminClient = requireAdminClient();
    const { data: profile, error: profileLookupError } = await adminClient
      .from('profiles')
      .select('id, username')
      .eq('username', cleanIdentifier)
      .maybeSingle();

    if (profileLookupError) {
      throw mapSupabaseError(profileLookupError, 'Nao foi possivel verificar o usuario.');
    }

    if (!profile) {
      const error = new Error('Usuario ou senha invalidos.');
      error.statusCode = 401;
      throw error;
    }

    const { data: authUser, error: authUserError } = await adminClient.auth.admin.getUserById(profile.id);

    if (authUserError || !authUser?.user?.email) {
      throw mapSupabaseError(authUserError, 'Nao foi possivel carregar o email do usuario.');
    }

    email = authUser.user.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: cleanPassword
  });

  if (error) {
    const loginError = new Error('Usuario ou senha invalidos.');
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

export const getCurrentUser = async (accessToken) => {
  if (!accessToken) {
    const error = new Error('Token de autenticacao ausente.');
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    const authError = new Error('Sessao invalida ou expirada.');
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
