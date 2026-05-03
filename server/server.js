import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor rodando 🚀');
});

// porta (usa .env ou padrão 3000)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});