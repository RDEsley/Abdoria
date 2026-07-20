import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserMutable } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { Ratings } from '../repositories/rating-repository.js';
import { Suggestions } from '../repositories/suggestion-repository.js';
import { syncAdminMoldura } from '../services/shop.js';
import type { Banimento, UserRole } from '../types/index.js';
import type { UserLean } from '../types/user-record.js';

export const adminRouter = Router();

adminRouter.use(requireAuth);

function roleOf(user: { role?: UserRole | null }): UserRole {
  return user.role ?? 'user';
}

/** Carrega o ator e barra quem não é staff; guarda em res.locals.actor. */
adminRouter.use(async (req: AuthRequest, res, next) => {
  try {
    const actor = await User.findById(req.userId!);
    if (!actor || !['admin', 'moderador'].includes(roleOf(actor))) {
      res.status(403).json({ error: 'Acesso restrito à moderação.' });
      return;
    }
    res.locals.actor = actor;
    next();
  } catch (error) {
    console.error('admin actor error:', error);
    res.status(500).json({ error: 'Erro de autenticação.' });
  }
});

function actorOf(res: Response): UserMutable {
  return res.locals.actor as UserMutable;
}

function requireAdmin(res: Response): boolean {
  if (roleOf(actorOf(res)) !== 'admin') {
    res.status(403).json({ error: 'Apenas administradores.' });
    return false;
  }
  return true;
}

function toAdminEntry(user: UserLean) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    tag: user.tag ?? null,
    role: roleOf(user),
    coins: user.cosmeticos?.moedas ?? 0,
    gems: user.gems ?? 0,
    nivel_xp: user.gamificacao?.nivel_xp ?? 0,
    streak_atual: user.gamificacao?.streak_atual ?? 0,
    banimento: user.banimento ?? null,
    is_guest: user.is_guest,
  };
}

adminRouter.get('/overview', async (_req: AuthRequest, res) => {
  try {
    if (!requireAdmin(res)) return;
    const [ratings, suggestions, users] = await Promise.all([
      Ratings.listAll(),
      Suggestions.listAll().catch(() => []),
      User.find({ is_demo_npc: false }, { limit: 500 }),
    ]);
    const media =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.estrelas, 0) / ratings.length) * 10) / 10
        : null;
    res.json({ ratings, suggestions, media_estrelas: media, total_usuarios: users.length });
  } catch (error) {
    console.error('GET /api/admin/overview error:', error);
    res.status(500).json({ error: 'Erro ao carregar o painel.' });
  }
});

adminRouter.get('/users', async (req: AuthRequest, res) => {
  try {
    if (!requireAdmin(res)) return;
    const q = String(req.query.q ?? '').trim();
    const users = q
      ? await User.searchByName(q, '', 30)
      : await User.find({ is_demo_npc: false }, { limit: 200 });
    res.json({ users: users.map(toAdminEntry) });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
});

adminRouter.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    if (!requireAdmin(res)) return;
    const user = await User.findById(String(req.params.id), { select: '+passwordHash' });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const { nome, senha, coins, gems, role } = req.body as {
      nome?: string;
      senha?: string;
      coins?: number;
      gems?: number;
      role?: string;
    };

    if (typeof nome === 'string' && nome.trim().length >= 2) {
      user.nome = nome.trim();
    }
    if (typeof senha === 'string' && senha.length >= 6) {
      user.passwordHash = await bcrypt.hash(senha, 10);
    }
    if (typeof coins === 'number' && Number.isFinite(coins)) {
      user.cosmeticos.moedas = Math.max(0, Math.round(coins));
    }
    if (typeof gems === 'number' && Number.isFinite(gems)) {
      if (user.gems === undefined) {
        res.status(400).json({ error: 'Coluna gems ainda não migrada.' });
        return;
      }
      user.gems = Math.max(0, Math.round(gems));
    }
    if (role === 'user' || role === 'moderador' || role === 'admin') {
      if (user.role === undefined) {
        res.status(400).json({ error: 'Coluna role ainda não migrada.' });
        return;
      }
      if (user.id === actorOf(res).id && role !== 'admin') {
        res.status(400).json({ error: 'Você não pode rebaixar a si mesmo.' });
        return;
      }
      user.role = role;
      // Ao virar/deixar de ser admin, concede/revoga a moldura exclusiva e
      // remove da semanal se acabou de ser promovido a admin (fica oculto).
      syncAdminMoldura(user);
      if (role === 'admin') {
        user.preferencias = { ...user.preferencias, admin_visivel_ranking: false };
      }
    }

    await user.save();
    res.json({ user: toAdminEntry(user) });
  } catch (error) {
    console.error('PATCH /api/admin/users/:id error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

/** Banir (permanente) ou suspender (com prazo) — modelo Discord. */
adminRouter.post('/users/:id/ban', async (req: AuthRequest, res) => {
  try {
    const actor = actorOf(res);
    const target = await User.findById(String(req.params.id));
    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (target.banimento === undefined) {
      res.status(400).json({ error: 'Coluna banimento ainda não migrada.' });
      return;
    }
    if (target.id === actor.id) {
      res.status(400).json({ error: 'Você não pode banir a si mesmo.' });
      return;
    }
    const targetRole = roleOf(target);
    const actorRole = roleOf(actor);
    // Moderador não alcança staff; admin não bane outro admin.
    if (targetRole === 'admin' || (actorRole === 'moderador' && targetRole === 'moderador')) {
      res.status(403).json({ error: 'Sem permissão sobre este usuário.' });
      return;
    }

    const { tipo, motivo, dias } = req.body as {
      tipo?: string;
      motivo?: string;
      dias?: number;
    };
    if (tipo !== 'ban' && tipo !== 'suspensao') {
      res.status(400).json({ error: 'Tipo inválido (ban ou suspensao).' });
      return;
    }
    const motivoLimpo = String(motivo ?? '').trim();
    if (!motivoLimpo) {
      res.status(400).json({ error: 'Informe o motivo.' });
      return;
    }
    let ate: string | null = null;
    if (tipo === 'suspensao') {
      const diasNum = Number(dias);
      if (!Number.isFinite(diasNum) || diasNum < 1 || diasNum > 365) {
        res.status(400).json({ error: 'Suspensão exige duração de 1 a 365 dias.' });
        return;
      }
      ate = new Date(Date.now() + diasNum * 86_400_000).toISOString();
    }

    const banimento: Banimento = {
      tipo,
      motivo: motivoLimpo.slice(0, 300),
      ate,
      aplicado_por: actor.nome,
      aplicado_em: new Date().toISOString(),
    };
    target.banimento = banimento;
    await target.save();
    res.json({ user: toAdminEntry(target) });
  } catch (error) {
    console.error('POST /api/admin/users/:id/ban error:', error);
    res.status(500).json({ error: 'Erro ao aplicar punição.' });
  }
});

adminRouter.post('/users/:id/unban', async (req: AuthRequest, res) => {
  try {
    const target = await User.findById(String(req.params.id));
    if (!target) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (target.banimento === undefined) {
      res.status(400).json({ error: 'Coluna banimento ainda não migrada.' });
      return;
    }
    target.banimento = null;
    await target.save();
    res.json({ user: toAdminEntry(target) });
  } catch (error) {
    console.error('POST /api/admin/users/:id/unban error:', error);
    res.status(500).json({ error: 'Erro ao remover punição.' });
  }
});
