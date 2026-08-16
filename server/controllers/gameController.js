import {
  getGameState,
  getUserSettings,
  saveGameState,
  updateUserSettings
} from '../services/progressService.js';

export const gameStatus = (req, res) => {
  res.json({ status: 'game routes ready' });
};

// `progress: null` significa "nao existe save" — e assim que o menu decide se
// mostra CONTINUAR.
export const getProgress = async (req, res, next) => {
  try {
    const progress = await getGameState(req.user.id, req.accessToken);
    res.json({ progress });
  } catch (error) {
    next(error);
  }
};

export const saveProgress = async (req, res, next) => {
  try {
    const progress = await saveGameState(req.user.id, req.accessToken, req.body);
    res.json({ progress });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await getUserSettings(req.user.id, req.accessToken);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await updateUserSettings(
      req.user.id,
      req.accessToken,
      req.body
    );
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};
