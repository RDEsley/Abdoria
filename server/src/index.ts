import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './db.js';

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  try {
    await connectDB();
    console.log('Supabase conectado.');

    const app = createApp();
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('SUPABASE_URL') || msg.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em server/.env');
    } else {
      console.error('Falha ao conectar no Supabase:', msg);
    }
    process.exit(1);
  }
}

start();
