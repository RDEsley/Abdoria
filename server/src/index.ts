import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './db.js';

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  try {
    await connectDB();
    console.log('MongoDB conectado.');

    const app = createApp();
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('whitelist') || msg.includes('IP')) {
      console.error(
        'MongoDB Atlas bloqueou a conexão: adicione seu IP em Network Access no painel do Atlas.',
      );
    } else if (msg.includes('bad auth') || msg.includes('Authentication failed')) {
      console.error('Credenciais MongoDB inválidas. Revise usuário e senha em server/.env');
    } else {
      console.error('Falha ao conectar no MongoDB:', msg);
    }
    process.exit(1);
  }
}

start();
