import { Exercise } from '../models/Exercise.js';
import { User } from '../models/User.js';
import { ABDORIA_XP_STEP } from '../types/index.js';
import { ensureAbdoriaWallet } from './economy.js';

const RETIRED_SLUGS = new Set(['pallof-press']);

/** Recalcula moedas por blocos de XP, poda slugs inválidos e alinha desbloqueios ao catálogo ativo. */
export async function syncAllUsersProgressData(): Promise<{ users: number; pruned: number; coinsAdjusted: number }> {
  const activeSlugs = new Set(
    (await Exercise.find({ ativo: true }).select('slug').lean()).map((e) => e.slug),
  );

  const users = await User.find({});
  let pruned = 0;
  let coinsAdjusted = 0;

  for (const user of users) {
    let dirty = false;

    const unlocked = user.dados_salvos?.exercicios_desbloqueados ?? [];
    const nextUnlocked = unlocked.filter((slug) => activeSlugs.has(slug) && !RETIRED_SLUGS.has(slug));
    if (nextUnlocked.length !== unlocked.length) {
      user.dados_salvos.exercicios_desbloqueados = nextUnlocked;
      pruned += unlocked.length - nextUnlocked.length;
      dirty = true;
    }

    ensureAbdoriaWallet(user);
    const blocks = Math.floor(user.gamificacao.nivel_xp / ABDORIA_XP_STEP);
    const previous = user.cosmeticos.moedas_xp_blocos ?? 0;
    const gained = Math.max(0, blocks - previous);
    if (gained > 0) {
      user.cosmeticos.moedas += gained;
      coinsAdjusted += gained;
      dirty = true;
    }
    if (user.cosmeticos.moedas_xp_blocos !== blocks) {
      user.cosmeticos.moedas_xp_blocos = blocks;
      dirty = true;
    }

    if (dirty) await user.save();
  }

  return { users: users.length, pruned, coinsAdjusted };
}
