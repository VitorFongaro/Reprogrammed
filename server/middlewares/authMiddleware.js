import { getCurrentUser } from '../services/supabaseService.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return res.status(401).json({ error: 'Token de autenticacao ausente.' });
  }

  try {
    req.user = await getCurrentUser(token);
    req.accessToken = token;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      error: error.message || 'Sessao invalida ou expirada.'
    });
  }
};
