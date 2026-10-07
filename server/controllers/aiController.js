import { generatePuzzle, getAiServiceStatus } from '../services/aiService.js';

export const aiStatus = (req, res) => {
  res.json({ status: getAiServiceStatus() });
};

// Puzzle gerado pelo Gemini para o jogador logado. O corpo só traz o slug: o
// que a IA pode gerar para aquele puzzle vem da ficha da sala, nunca do cliente.
export const postPuzzle = async (req, res, next) => {
  try {
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : '';
    const result = await generatePuzzle(req.user.id, req.accessToken, slug);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
