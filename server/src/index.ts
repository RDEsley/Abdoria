import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { authRouter } from './routes/auth.js';
import { exercisesRouter } from './routes/exercises.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { presetsRouter } from './routes/presets.js';
import { usersRouter } from './routes/users.js';
import { workoutsRouter } from './routes/workouts.js';

const PORT = Number(process.env.PORT) || 3001;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Defina MONGODB_URI em server/.env (veja server/.env.example).');
  process.exit(1);
}

const MONGODB_URI: string = mongoUri;

const app = express();

app.use(cors());
app.use(express.json());

/** Verificação de disponibilidade da API e do banco. */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/users', usersRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/presets', presetsRouter);
app.use('/api/leaderboard', leaderboardRouter);

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB conectado.');

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
