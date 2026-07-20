import express, { Router } from 'express';
import { User, sanitizeUser } from '../domain/User.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/auth.js';
import {
  ADMIN_MOLDURA_ID,
  CURRENCY_NAME,
  NAME_CHANGE_COST,
  calcImc,
  isBanimentoAtivo,
  suggestNivel,
  type MolduraId,
} from '../types/index.js';
import { syncAdminMoldura } from '../services/shop.js';
import { Ratings } from '../repositories/rating-repository.js';
import { Suggestions } from '../repositories/suggestion-repository.js';
import { ensureMoedaWallet, readMoedaBalance } from '../services/economy.js';
import { parseAvatarDataUrl, removeAvatar, uploadAvatar } from '../services/avatar-storage.js';
import { molduraStatusForUser } from '../services/molduras.js';
import { mergePreferencias, mergeSimulacaoDefinicao } from '../utils/user-patch.js';
import { focoToObjetivo, sanitizePerfilTreino } from '../utils/training-profile.js';
import { buildPlanoTreino } from '../../../shared/training-plan.js';
import { mergeDadosSalvos, resolveDadosSalvosForUser } from '../utils/user-dados.js';
import { awardMoedaFromXp, awardSkillUnlockXp, countNewSkillUnlocks } from '../services/economy.js';
import { syncEquipmentExerciseUnlocks } from '../services/equipment-sync.js';
import { syncUserGamification } from '../services/gamification.js';
import { sanitizePublicProfile } from '../utils/sanitize-user.js';
import { LeaderboardPodiumHistory } from '../repositories/leaderboard-podium-repository.js';
import { WorkoutHistory } from '../repositories/workout-history-repository.js';
import { Follows } from '../repositories/follow-repository.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import {
  computePersonalRecords,
  type PersonalRecordExerciseInput,
} from '../../../shared/personal-records.js';
import { censorProfanity } from '../../../shared/utils/profanity.js';
import { ensureUserTag } from '../services/user-tag.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

async function loadCurrentUser(userId: string) {
  return User.findById(userId, { lean: true });
}

/** true quando o estado da moldura de admin não bate com o papel atual. */
function adminMolduraNeedsSync(user: {
  role?: string | null;
  cosmeticos?: { desbloqueados?: string[] } | null;
}): boolean {
  if (user.role === undefined) return false;
  const tem = user.cosmeticos?.desbloqueados?.includes(ADMIN_MOLDURA_ID) ?? false;
  return user.role === 'admin' ? !tem : tem;
}

usersRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const user = await loadCurrentUser(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (isBanimentoAtivo(user.banimento)) {
      res.status(403).json({ error: 'Conta suspensa ou banida.', banimento: user.banimento });
      return;
    }
    await ensureUserTag(user);

    // Promoção/rebaixamento feito direto no Supabase precisa refletir a moldura
    // de admin já na primeira carga do perfil — reconcilia se estiver defasada.
    if (adminMolduraNeedsSync(user)) {
      const mutable = await User.findById(req.userId!);
      if (mutable) {
        syncAdminMoldura(mutable);
        await mutable.save();
        res.json(sanitizeUser(mutable));
        return;
      }
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('GET /api/users/me error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

/** Sugestão/opinião do app (popup de 7 dias de streak) — vai pro painel do ADM. */
usersRouter.post('/me/suggestion', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const texto = String((req.body as { texto?: string }).texto ?? '')
      .trim()
      .slice(0, 800);
    if (texto.length < 5) {
      res.status(400).json({ error: 'Escreva pelo menos 5 caracteres.' });
      return;
    }
    await Suggestions.create(user.id, censorProfanity(texto));
    user.preferencias = { ...user.preferencias, sugestao_respondida: true };
    await user.save();
    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /api/users/me/suggestion error:', error);
    res.status(500).json({ error: 'Erro ao enviar sugestão.' });
  }
});

/** Avaliação do app (popup de 3 dias de streak) — uma por conta, reenvio substitui. */
usersRouter.post('/me/rating', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    const { estrelas, comentario } = req.body as { estrelas?: number; comentario?: string };
    const stars = Math.round(Number(estrelas));
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      res.status(400).json({ error: 'Avaliação deve ser de 1 a 5 estrelas.' });
      return;
    }
    const texto = String(comentario ?? '')
      .trim()
      .slice(0, 500);
    await Ratings.upsert(user.id, stars, texto ? censorProfanity(texto) : null);
    user.preferencias = { ...user.preferencias, avaliacao_respondida: true };
    await user.save();
    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /api/users/me/rating error:', error);
    res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  }
});

const ACHIEVEMENT_HIGHLIGHT_ORDER = { lendaria: 0, dificil: 1, media: 2, facil: 3 } as const;

/** Perfil público de outro usuário (ranking, amigos) — whitelist positiva. */
usersRouter.get('/:id/public', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(String(req.params.id), { lean: true });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const [podio, history, targetFollowing, targetFollowers, meFollowing] = await Promise.all([
      LeaderboardPodiumHistory.countsForUser(user.id),
      WorkoutHistory.find({ usuario_id: user.id }),
      Follows.followingIds(user.id),
      Follows.followerIds(user.id),
      Follows.followingIds(req.userId!),
    ]);

    const records_top = [
      ...computePersonalRecords(
        history.map((h) => ({
          exercicios: h.exercicios as unknown as PersonalRecordExerciseInput[],
          concluido_em: h.concluido_em,
        })),
      ).values(),
    ]
      .sort((a, b) => b.melhor_valor - a.melhor_valor)
      .slice(0, 3)
      .map(({ slug, nome, melhor_valor, unidade }) => ({ slug, nome, melhor_valor, unidade }));

    const unlocked = new Set(user.gamificacao.conquistas);
    const destaque = ACHIEVEMENTS.filter((a) => unlocked.has(a.id))
      .sort(
        (a, b) =>
          ACHIEVEMENT_HIGHLIGHT_ORDER[a.dificuldade] - ACHIEVEMENT_HIGHLIGHT_ORDER[b.dificuldade],
      )
      .slice(0, 6)
      .map(({ id, titulo, icon, dificuldade }) => ({ id, titulo, icon, dificuldade }));

    const targetFollowerSet = new Set(targetFollowers);
    const amigos = targetFollowing.filter((id) => targetFollowerSet.has(id)).length;
    const seguindo = meFollowing.includes(user.id);
    const segueVoce = targetFollowing.includes(req.userId!);

    res.json(
      sanitizePublicProfile(user, podio, {
        records_top,
        conquistas: {
          desbloqueadas: unlocked.size,
          total: ACHIEVEMENTS.length,
          destaque,
        },
        social: {
          followers: targetFollowers.length,
          following: targetFollowing.length,
          amigos,
        },
        relacao: { seguindo, segue_voce: segueVoce, amigo: seguindo && segueVoce },
      }),
    );
  } catch (error) {
    console.error('GET /api/users/:id/public error:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

usersRouter.patch('/me', async (req: AuthRequest, res) => {
  try {
    const current = await loadCurrentUser(req.userId!);
    if (!current) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    // 'nome' saiu daqui: troca de nome tem rota própria (1ª grátis, depois paga).
    const allowed = [
      'idade',
      'peso_kg',
      'altura_cm',
      'nivel',
      'objetivo',
      'simulacao_definicao',
      'preferencias',
    ] as const;
    const update: Record<string, unknown> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (req.body.descricao !== undefined) {
      const descricao =
        typeof req.body.descricao === 'string'
          ? censorProfanity(req.body.descricao.trim().slice(0, 160))
          : '';
      update.descricao = descricao || null;
    }

    if (req.body.preferencias !== undefined) {
      const mergedPrefs = mergePreferencias(current.preferencias, req.body.preferencias);
      update.preferencias = mergedPrefs;

      const mutable = await User.findById(req.userId!);
      if (mutable) {
        syncEquipmentExerciseUnlocks(mutable, mergedPrefs);
        update.dados_salvos = mutable.dados_salvos;
      }
    }

    if (req.body.simulacao_definicao !== undefined) {
      update.simulacao_definicao = mergeSimulacaoDefinicao(
        current.simulacao_definicao,
        req.body.simulacao_definicao,
      );
    }

    if (update.peso_kg && update.altura_cm) {
      update.imc = calcImc(Number(update.peso_kg), Number(update.altura_cm));
    } else if (update.peso_kg || update.altura_cm) {
      if (current.peso_kg && current.altura_cm) {
        const peso = Number(update.peso_kg ?? current.peso_kg);
        const altura = Number(update.altura_cm ?? current.altura_cm);
        update.imc = calcImc(peso, altura);
      }
    }

    const user = await User.findByIdAndUpdate(req.userId!, { $set: update }, { new: true });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PATCH /api/users/me error:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

/** Status das molduras de avatar (pódios, itens secretos, desbloqueadas, equipada). */
usersRouter.get('/me/molduras', async (req: AuthRequest, res) => {
  try {
    const user = await loadCurrentUser(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(await molduraStatusForUser(user));
  } catch (error) {
    console.error('GET /api/users/me/molduras error:', error);
    res.status(500).json({ error: 'Erro ao buscar molduras.' });
  }
});

/** Equipa (ou remove, com null) uma moldura desbloqueada. */
usersRouter.post('/me/moldura', async (req: AuthRequest, res) => {
  try {
    const moldura = req.body?.moldura as MolduraId | null | undefined;
    if (moldura != null && !['bronze', 'prata', 'ouro', 'especial'].includes(moldura)) {
      res.status(400).json({ error: 'Moldura inválida.' });
      return;
    }

    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (moldura != null) {
      const status = await molduraStatusForUser(user);
      if (!status.desbloqueadas.includes(moldura)) {
        res.status(400).json({ error: 'Você ainda não desbloqueou essa moldura.' });
        return;
      }
    }

    user.cosmeticos.moldura_equipada = moldura ?? null;
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /api/users/me/moldura error:', error);
    res.status(500).json({ error: 'Erro ao equipar moldura.' });
  }
});

/** Troca de nome: a primeira é grátis, as seguintes custam NAME_CHANGE_COST Coins. */
usersRouter.post('/me/name', async (req: AuthRequest, res) => {
  try {
    const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
    if (nome.length < 2 || nome.length > 40) {
      res.status(400).json({ error: 'Nome deve ter entre 2 e 40 caracteres.' });
      return;
    }

    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    if (nome === user.nome) {
      res.json({ user: sanitizeUser(user), custo_pago: 0 });
      return;
    }

    const trocas = user.nome_trocas ?? 0;
    let custoPago = 0;
    if (trocas >= 1) {
      ensureMoedaWallet(user);
      const saldo = readMoedaBalance(user);
      if (saldo < NAME_CHANGE_COST) {
        res.status(400).json({
          error: `Trocar de nome novamente custa ${NAME_CHANGE_COST.toLocaleString('pt-BR')} ${CURRENCY_NAME} — saldo insuficiente.`,
        });
        return;
      }
      user.cosmeticos.moedas = saldo - NAME_CHANGE_COST;
      custoPago = NAME_CHANGE_COST;
    }

    user.nome = nome;
    user.nome_trocas = trocas + 1;
    await user.save();

    res.json({ user: sanitizeUser(user), custo_pago: custoPago });
  } catch (error) {
    console.error('POST /api/users/me/name error:', error);
    res.status(500).json({ error: 'Erro ao trocar o nome.' });
  }
});

/** Upload da foto de perfil (data URL JPEG/PNG/WebP, já comprimida no client). */
usersRouter.post('/me/avatar', express.json({ limit: '3mb' }), async (req: AuthRequest, res) => {
  try {
    const parsed = parseAvatarDataUrl(req.body?.data_url);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    user.avatar_url = await uploadAvatar(user.id, parsed);
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('POST /api/users/me/avatar error:', error);
    res.status(500).json({ error: 'Erro ao enviar a foto de perfil.' });
  }
});

usersRouter.delete('/me/avatar', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    await removeAvatar(user.id);
    user.avatar_url = null;
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error('DELETE /api/users/me/avatar error:', error);
    res.status(500).json({ error: 'Erro ao remover a foto de perfil.' });
  }
});

usersRouter.patch('/me/dados', async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const previousUnlocked = resolveDadosSalvosForUser(user.dados_salvos).exercicios_desbloqueados;
    const dados = mergeDadosSalvos(user.dados_salvos, req.body ?? {});
    const newUnlockCount = countNewSkillUnlocks(previousUnlocked, dados.exercicios_desbloqueados);

    user.set('dados_salvos', dados);

    let xpGanhoHabilidades = 0;
    if (newUnlockCount > 0) {
      xpGanhoHabilidades = awardSkillUnlockXp(user, newUnlockCount);
      awardMoedaFromXp(user);
    }

    await user.save();

    if (newUnlockCount > 0) {
      await syncUserGamification(req.userId!);
    }

    const refreshed = await User.findById(req.userId!, { lean: true });
    if (!refreshed) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json({ user: sanitizeUser(refreshed), xp_ganho_habilidades: xpGanhoHabilidades });
  } catch (error) {
    console.error('PATCH /api/users/me/dados error:', error);
    res.status(500).json({ error: 'Erro ao salvar dados da conta.' });
  }
});

usersRouter.patch('/me/onboarding', async (req: AuthRequest, res) => {
  try {
    const current = await loadCurrentUser(req.userId!);
    if (!current) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    const fields = [
      'nome',
      'idade',
      'peso_kg',
      'altura_cm',
      'nivel',
      'objetivo',
      'simulacao_definicao',
      'preferencias',
      'onboarding_completed',
    ] as const;
    for (const key of fields) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (body.preferencias !== undefined) {
      const mergedPrefs = mergePreferencias(current.preferencias, body.preferencias);
      update.preferencias = mergedPrefs;

      // Equipamento coletado no onboarding precisa liberar os exercícios gated
      // (mesmo sync do PATCH /me).
      const mutable = await User.findById(req.userId!);
      if (mutable) {
        syncEquipmentExerciseUnlocks(mutable, mergedPrefs);
        update.dados_salvos = mutable.dados_salvos;
      }
    }

    const perfilTreino = sanitizePerfilTreino(body.perfil_treino);
    if (perfilTreino) {
      update.perfil_treino = perfilTreino;
      update.plano_treino = buildPlanoTreino(perfilTreino, new Date().toISOString());
      // Mantém a coluna objetivo coerente pro tiered-match de presets.
      update.objetivo = focoToObjetivo(perfilTreino.foco);
    }

    if (body.simulacao_definicao !== undefined) {
      update.simulacao_definicao = mergeSimulacaoDefinicao(
        current.simulacao_definicao,
        body.simulacao_definicao,
      );
    }

    if (body.terms_accepted === true) {
      update.terms_accepted_at = new Date();
    }

    if (update.peso_kg != null && update.altura_cm != null) {
      update.imc = calcImc(Number(update.peso_kg), Number(update.altura_cm));
    }

    if (update.idade && update.imc && body.nivel === undefined && !update.nivel) {
      update.nivel = suggestNivel(Number(update.idade), Number(update.imc));
    }

    if (body.skip && !update.onboarding_completed) {
      update.onboarding_completed = true;
    }

    const user = await User.findByIdAndUpdate(req.userId!, { $set: update }, { new: true });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PATCH /api/users/me/onboarding error:', error);
    res.status(500).json({ error: 'Erro no onboarding.' });
  }
});

/** Regrava o perfil de treino inteiro (re-onboarding/Configurações) e regenera o plano. */
usersRouter.put('/me/training-profile', async (req: AuthRequest, res) => {
  try {
    const perfilTreino = sanitizePerfilTreino(req.body?.perfil_treino ?? req.body);
    if (!perfilTreino) {
      res.status(400).json({ error: 'Perfil de treino inválido.' });
      return;
    }

    const update: Record<string, unknown> = {
      perfil_treino: perfilTreino,
      plano_treino: buildPlanoTreino(perfilTreino, new Date().toISOString()),
      objetivo: focoToObjetivo(perfilTreino.foco),
    };

    const user = await User.findByIdAndUpdate(req.userId!, { $set: update }, { new: true });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('PUT /api/users/me/training-profile error:', error);
    res.status(500).json({ error: 'Erro ao salvar perfil de treino.' });
  }
});

/** Re-roll manual do plano gerado (mantém o perfil, redistribui os dias). */
usersRouter.post('/me/training-plan/regenerate', async (req: AuthRequest, res) => {
  try {
    const current = await loadCurrentUser(req.userId!);
    if (!current) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (!current.perfil_treino) {
      res.status(400).json({ error: 'Nenhum perfil de treino configurado.' });
      return;
    }

    const plano = buildPlanoTreino(current.perfil_treino, new Date().toISOString());
    const user = await User.findByIdAndUpdate(
      req.userId!,
      { $set: { plano_treino: plano } },
      { new: true },
    );
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('POST /api/users/me/training-plan/regenerate error:', error);
    res.status(500).json({ error: 'Erro ao regenerar plano.' });
  }
});
