/** Verificação manual da tabela de XP por nível. Rode: node scripts/verify-xp-level.mjs */

function xpStepForLevel(currentLevel) {
  const level = Math.max(1, Math.floor(currentLevel));
  const tier = Math.floor((level - 1) / 10);
  return 50 * (tier + 1);
}

function xpRequiredForNextLevel(currentLevel) {
  const level = Math.max(1, Math.floor(currentLevel));
  if (level === 1) return 100;
  return xpRequiredForNextLevel(level - 1) + xpStepForLevel(level);
}

function xpLevelFromTotal(totalXp) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpRequiredForNextLevel(level)) {
    remaining -= xpRequiredForNextLevel(level);
    level += 1;
  }
  return level;
}

const expected = { 1: 100, 2: 150, 3: 200, 9: 500, 10: 550, 11: 650, 12: 750 };
let failed = false;
for (const [level, want] of Object.entries(expected)) {
  const got = xpRequiredForNextLevel(Number(level));
  if (got !== want) {
    console.error(`xpRequiredForNextLevel(${level}): expected ${want}, got ${got}`);
    failed = true;
  }
}
let total = 0;
for (let l = 1; l < 12; l += 1) total += xpRequiredForNextLevel(l);
if (xpLevelFromTotal(total) !== 12) failed = true;
if (failed) process.exit(1);
console.log('xp-level verification OK');
