import {
  getUserSettings,
  updateUserSettings
} from '../services/progressService.js';

export const gameStatus = (req, res) => {
  res.json({ status: 'game routes ready' });
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
