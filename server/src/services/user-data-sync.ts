import { Exercise } from '../domain/Exercise.js';
import { User } from '../domain/User.js';
import { ABDORIA_XP_STEP } from '../types/index.js';
import { ensureAbdoriaWallet } from './economy.js';

const RETIRED_SLUGS = new Set(['pallof-press']);

export async function syncAllUsersProgressData(): Promise<{ users: number; pruned: number; coinsAdjusted: number }> {
  const activeSlugs = new Set(
    (await Exercise.find({ ativo: true })).map((e) => e.slug),
  );

  const usersLean = await User.find({});
  let pruned = 0;
  let coinsAdjusted = 0;

  for (const lean of usersLean) {
    const user = await User.findById(lean.id);
    if (!user) continue;

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

  return { users: usersLean.length, pruned, coinsAdjusted };
}
