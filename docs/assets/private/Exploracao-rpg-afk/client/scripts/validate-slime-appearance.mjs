import {
  resolvePortraitAppearance,
  collectSlimeAccessories,
  rollSlimeCosmetic,
  accessoryDropMotion,
  SLIME_COSMETIC_POOL,
} from '../../shared/afk/slime-appearance.ts';
import { AFK_ENEMIES } from '../../shared/afk/combat.ts';

const ENEMIES = Object.keys(AFK_ENEMIES);

let errors = 0;

for (const enemyId of ENEMIES) {
  const def = AFK_ENEMIES[enemyId];
  const isBoss = enemyId.startsWith('boss_');
  const appearance = resolvePortraitAppearance(enemyId);
  const identity = collectSlimeAccessories(enemyId, isBoss, appearance);

  if (!appearance.eyes || !appearance.mouth) {
    console.error(`Missing face parts for ${enemyId}`);
    errors += 1;
  }

  identity.forEach((kind, index) => {
    const motion = accessoryDropMotion(1, index);
    if (
      typeof motion.x !== 'number' ||
      typeof motion.y !== 'number' ||
      typeof motion.rot !== 'number'
    ) {
      console.error(`Invalid drop motion for ${enemyId} kind=${kind}`);
      errors += 1;
    }
  });

  // Cosmético sorteado: boss nunca recebe, e comum/elite nunca pode receber
  // um item que ocupe um slot já usado pela identidade da criatura.
  for (let seed = 0; seed < 400; seed += 1) {
    const cosmetic = rollSlimeCosmetic(seed, isBoss, identity);
    if (cosmetic === null) continue;

    if (isBoss) {
      console.error(`Boss ${enemyId} must never roll a cosmetic (got ${cosmetic})`);
      errors += 1;
      break;
    }
    if (!SLIME_COSMETIC_POOL.includes(cosmetic)) {
      console.error(`${enemyId} rolled cosmetic outside the pool: ${cosmetic}`);
      errors += 1;
      break;
    }
    if (identity.includes(cosmetic)) {
      console.error(`${enemyId} rolled a cosmetic it already owns: ${cosmetic}`);
      errors += 1;
      break;
    }
  }

  if (def?.tier === 'elite' && identity.includes('cap')) {
    console.error(`Elite ${enemyId} should no longer carry the old fixed cap`);
    errors += 1;
  }
}

const motion = accessoryDropMotion(12345, 0);
if (motion.y >= 0) {
  console.error('Expected negative pop Y for loot arc');
  errors += 1;
}

if (errors > 0) {
  console.error(`Slime appearance validation failed (${errors} issues)`);
  process.exit(1);
}

console.log(
  `Slime appearance validation OK (${ENEMIES.length} enemies, ${SLIME_COSMETIC_POOL.length} cosmetics)`,
);
