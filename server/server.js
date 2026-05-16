import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import pool from './config/db.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor rodando 🚀');
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});