import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, sanitizeUser } from '../domain/User.js';
import { signToken } from '../middleware/auth.js';
import { DEFAULT_PREFERENCIAS, DEFAULT_XP_DIARIO, isBanimentoAtivo } from '../types/index.js';
import { getTodaySaoPaulo } from '../utils/timezone.js';
import { verifyEmailIsReal } from '../services/email-verification.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, nome } = req.body as {
      email?: string;
      password?: string;
      nome?: string;
    };

    if (!email || !password || !nome) {
      res.status(400).json({ error: 'Email, senha e nome são obrigatórios.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      res.status(409).json({ error: 'Email já cadastrado.' });
      return;
    }

    const verification = await verifyEmailIsReal(normalizedEmail);
    if (!verification.valid) {
      res.status(400).json({ error: verification.reason ?? 'Email inválido.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const today = getTodaySaoPaulo();

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      nome: nome.trim(),
      preferencias: DEFAULT_PREFERENCIAS,
      xp_diario: { ...DEFAULT_XP_DIARIO, data_reset: today },
      onboarding_completed: false,
    });

    const token = signToken(user.id.toString());
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /auth/register error:', error);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios.' });
      return;
    }

    const user = await User.findOne(
      { email: email.toLowerCase().trim() },
      { select: '+passwordHash' },
    );
    if (!user?.passwordHash) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas.' });
      return;
    }

    if (isBanimentoAtivo(user.banimento)) {
      const ban = user.banimento!;
      res.status(403).json({
        error:
          ban.tipo === 'ban'
            ? `Conta banida: ${ban.motivo}`
            : `Conta suspensa até ${new Date(ban.ate!).toLocaleDateString('pt-BR')}: ${ban.motivo}`,
        banimento: ban,
      });
      return;
    }

    const token = signToken(user.id.toString());
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /auth/login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

/** Conta temporária para experimentar sem cadastro. */
authRouter.post('/guest', async (_req, res) => {
  try {
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const email = `guest_${suffix}@guest.abdoria.local`;
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const today = getTodaySaoPaulo();

    const user = await User.create({
      email,
      passwordHash,
      nome: `Visitante ${suffix.slice(0, 4).toUpperCase()}`,
      is_guest: true,
      preferencias: DEFAULT_PREFERENCIAS,
      xp_diario: { ...DEFAULT_XP_DIARIO, data_reset: today },
      onboarding_completed: false,
    });

    const token = signToken(user.id.toString());
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /auth/guest error:', error);
    res.status(500).json({ error: 'Erro ao criar sessão visitante.' });
  }
});

/** Verifica email para recuperação (envio por email pendente de integração). */
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email?.trim()) {
      res.status(400).json({ error: 'Informe o email.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(404).json({ error: 'Email não encontrado.' });
      return;
    }

    if (user.is_guest) {
      res.status(400).json({ error: 'Contas visitante não possuem senha.' });
      return;
    }

    res.json({
      message: 'Conta encontrada. Em breve você receberá instruções por email.',
    });
  } catch (error) {
    console.error('POST /auth/forgot-password error:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});
