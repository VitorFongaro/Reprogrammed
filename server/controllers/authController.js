import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser
} from '../services/supabaseService.js';

const getAccessToken = (req) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  return scheme?.toLowerCase() === 'bearer' ? token : null;
};

const sendAuthError = (res, error) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: error.message || 'Erro no servidor.'
  });
};

export const register = async (req, res) => {
  try {
    const data = await registerUser(req.body);
    res.status(201).json(data);
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const data = await loginUser(req.body);
    res.json(data);
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const logout = async (req, res) => {
  try {
    await logoutUser(getAccessToken(req));
    res.status(204).send();
  } catch (error) {
    sendAuthError(res, error);
  }
};

export const me = async (req, res) => {
  try {
    const user = await getCurrentUser(getAccessToken(req));
    res.json({ user });
  } catch (error) {
    sendAuthError(res, error);
  }
};
