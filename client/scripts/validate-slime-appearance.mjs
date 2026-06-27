import {
  resolveSlimeAppearance,
  collectSlimeAccessories,
  accessoryDropMotion,
} from '../../shared/afk/slime-appearance.ts';

const ENEMIES = [
  'slime',
  'bat',
  'demon_bat',
  'zombie',
  'skeleton',
  'armored_skeleton',
  'slime_knight',
  'golden_slime',
  'boss_colossus',
  'boss_lich',
  'boss_hydra',
];

let errors = 0;

for (const enemyId of ENEMIES) {
  for (let seed = 0; seed < 40; seed += 1) {
    const isBoss = enemyId.startsWith('boss_');
    const elite = seed % 5 === 0;
    const appearance = resolveSlimeAppearance(seed, enemyId, isBoss, elite);
    const accessories = collectSlimeAccessories(enemyId, isBoss, elite, appearance);

    if (!appearance.eyes || !appearance.mouth) {
      console.error(`Missing face parts for ${enemyId} seed=${seed}`);
      errors += 1;
    }

    accessories.forEach((kind, index) => {
      const motion = accessoryDropMotion(seed, index);
      if (typeof motion.x !== 'number' || typeof motion.y !== 'number' || typeof motion.rot !== 'number') {
        console.error(`Invalid drop motion for ${enemyId} seed=${seed} kind=${kind}`);
        errors += 1;
      }
    });
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

console.log('Slime appearance validation OK');
