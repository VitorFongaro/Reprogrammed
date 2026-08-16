// Endereço da API do jogo.
//
// Em produção vem de `VITE_API_URL`, definida no painel do host (Vercel) e
// assada no bundle durante o build — não é lida em tempo de execução, então
// mudar a variável exige um novo deploy.
//
// Sem ela, cai no servidor local do `npm run dev` do backend.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
