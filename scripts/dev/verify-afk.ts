/**
 * Valida regras da Exploração AFK (drops por kill, cap 24h, combate/boss).
 * Rode: npx tsx scripts/dev/verify-afk.ts
 */
import assert from 'node:assert/strict';
import {
  AFK_KILLS_PER_MINUTE,
  AFK_GOLDEN_SLIME_MOEDA_BONUS,
  advanceKillsUntilBoss,
  shouldSpawnBoss,
} from '../../shared/afk/combat.ts';
import {
  AFK_KILL_DROP_CHANCE_BOSS,
  AFK_KILL_DROP_CHANCE_COMMON,
  AFK_KILL_DROP_CHANCE_ELITE,
  AFK_KILL_DROP_CHANCES,
  AFK_MAX_MINUTES,
  PATROL_CACHE_HOURS,
} from '../../shared/types/index.ts';
import {
  afkCapReached,
  afkDisplayMinutes,
  afkKillsForHours,
  afkProgressToCap,
  countAfkDropEvents,
} from '../../shared/utils/afk.ts';
import {
  activateAfk,
  grantPatrolCacheRewards,
  syncAfkRewards,
  claimAfkRewards,
  resumeAfk,
} from '../../server/src/services/afk.ts';
import {
  applyKill,
  ensureCombat,
  simulateOfflineKills,
  defeatCurrentEnemy,
} from '../../server/src/services/afk-combat.ts';
import {
  getKillDropChanceForTier,
  rollKillDrop,
  rollLootTable,
} from '../../server/src/services/afk-rolls.ts';
import type { UserRecord } from '../../server/src/types/user-record.ts';
import { EMPTY_AFK_PENDING } from '../../server/src/repositories/user-repository.ts';

function mockUser(minutos = 0, pending: Partial<typeof EMPTY_AFK_PENDING> = {}): UserRecord {
  return {
    id: 'test-user-afk',
    email: 'afk@test.local',
    nome: 'Tester',
    nivel: 'iniciante',
    objetivo: 'definicao',
    gamificacao: {
      nivel_xp: 0,
      streak_atual: 0,
      streak_maior: 0,
      total_minutos: 0,
      conquistas: [],
    },
    cosmeticos: {
      moedas: 0,
      moedas_xp_blocos: 0,
      moldura_loja_equipada: 'borda_basica',
      titulo_equipado: null,
      som_equipado: 'som_classico',
      efeito_equipado: 'efeito_padrao',
      banner_equipado: 'fundo_padrao',
      desbloqueados: ['borda_basica'],
      codigos_resgatados: [],
    },
    loja_diaria: { data_reset: '', slots: [] },
    simulacao_definicao: { gordura_meta_pct: 12 },
    preferencias: {},
    dados_salvos: {
      treino_personalizado: [],
      treinos_salvos: [],
      esquemas_reps: {},
      exercicios_desbloqueados: [],
    },
    xp_diario: { ganho_hoje: 0, data_reset: '' },
    inventario: { itens: [] },
    afk: {
      last_seen_at: new Date().toISOString(),
      minutos_acumulados: minutos,
      pending: { ...EMPTY_AFK_PENDING, ...pending },
    },
    onboarding_completed: true,
    is_guest: false,
    is_demo_npc: false,
  };
}

assert.equal(AFK_KILL_DROP_CHANCE_COMMON, 4);
assert.equal(AFK_KILL_DROP_CHANCE_ELITE, 7);
assert.equal(AFK_KILL_DROP_CHANCE_BOSS, 35);
assert.equal(AFK_KILL_DROP_CHANCES.common, 4);
assert.equal(getKillDropChanceForTier('common'), 4);
assert.equal(getKillDropChanceForTier('elite'), 7);
assert.equal(getKillDropChanceForTier('boss'), 35);

assert.equal(afkProgressToCap(0), 0);
assert.equal(afkDisplayMinutes(1400, 100), AFK_MAX_MINUTES);
assert.ok(afkCapReached(AFK_MAX_MINUTES));

const t0 = new Date('2026-01-01T12:00:00Z');

const u1 = mockUser(0);
u1.afk.last_seen_at = t0.toISOString();
syncAfkRewards(u1, new Date(t0.getTime() + 15 * 60_000));
assert.equal(u1.afk.minutos_acumulados, 15);

// Conta que nunca abriu a tela de Exploração (last_seen_at null) não acumula tempo.
const uNaoIniciado = mockUser(0);
uNaoIniciado.afk.last_seen_at = null;
syncAfkRewards(uNaoIniciado, new Date(t0.getTime() + 30 * 60_000));
assert.equal(uNaoIniciado.afk.minutos_acumulados, 0, 'AFK só acumula depois da primeira visita');
assert.equal(uNaoIniciado.afk.last_seen_at, null, 'sync não inicia o timer sozinho');

// activateAfk liga o relógio (last_seen_at) na primeira visita, mas nasce PAUSADO — o
// personagem começa na vila, só acumula depois que o jogador clica em "Explorar"
// (resumeAfk). Reabrir a tela depois NÃO reseta o progresso acumulado (era o bug:
// last_seen_at voltava pra "agora" a cada reabertura da tela).
const uPrimeiraVisita = mockUser(0);
uPrimeiraVisita.afk.last_seen_at = null;
activateAfk(uPrimeiraVisita, t0);
assert.equal(uPrimeiraVisita.afk.last_seen_at, t0.toISOString(), 'primeira visita liga o relógio');
assert.ok(uPrimeiraVisita.afk.paused_at, 'primeira visita nasce pausada (vila)');
syncAfkRewards(uPrimeiraVisita, new Date(t0.getTime() + 10 * 60_000));
assert.equal(
  uPrimeiraVisita.afk.minutos_acumulados,
  0,
  'pausado na vila não acumula antes de clicar em Explorar',
);
// Jogador clica em "Explorar" — a partir daqui o tempo passa a contar de verdade.
resumeAfk(uPrimeiraVisita, new Date(t0.getTime() + 10 * 60_000));
syncAfkRewards(uPrimeiraVisita, new Date(t0.getTime() + 20 * 60_000));
assert.equal(uPrimeiraVisita.afk.minutos_acumulados, 10, '10min acumulados desde o Explorar');
// Reabrir a tela de exploração (activateAfk de novo) não deve resetar last_seen_at nem o timer.
activateAfk(uPrimeiraVisita, new Date(t0.getTime() + 20 * 60_000 + 5_000));
assert.equal(
  uPrimeiraVisita.afk.last_seen_at,
  new Date(t0.getTime() + 20 * 60_000).toISOString(),
  'reabrir a tela não reseta o timer já iniciado',
);
assert.ok(u1.afk.combat && u1.afk.combat.kills_total >= 1, 'offline kills simulated');
const expectedKills15 = Math.floor(15 * AFK_KILLS_PER_MINUTE);
assert.ok(expectedKills15 > 0, 'legacy rate remains available for display calculations');

const uClaim = mockUser(25);
claimAfkRewards(uClaim);
assert.equal(uClaim.afk.minutos_acumulados, 0, 'claim resets patrol timer');

const uCapped = mockUser(AFK_MAX_MINUTES);
claimAfkRewards(uCapped);
assert.equal(uCapped.afk.minutos_acumulados, 0, 'claim at cap also resets patrol timer');

const uBoss = mockUser(0);
ensureCombat(uBoss);
uBoss.afk!.combat!.kills_until_boss = 99;
uBoss.afk!.combat!.region_progress!['verdant-trail']!.kills_until_boss = 99;
applyKill(uBoss);
assert.ok(uBoss.afk!.combat!.is_boss, '100th chapter-1 victory spawns boss');

const freshPending = () => ({ ...EMPTY_AFK_PENDING, cosmetic_ids: [], weapon_ids: [] });

const pendingBefore = freshPending();
const pendingBoss = freshPending();
rollLootTable(uBoss, 1, pendingBefore);
rollLootTable(uBoss, 2, pendingBoss, { bossBoost: true });
assert.ok(
  pendingBoss.xp + pendingBoss.abdoria >= pendingBefore.xp + pendingBefore.abdoria - 1,
  'boss loot table runs',
);

// Frozen Streak não pertence a nenhuma tabela por inimigo: é um roll diário.
for (let i = 0; i < 3000; i += 1) {
  const trialCommon = freshPending();
  rollLootTable(uBoss, 50_000 + i, trialCommon, { tier: 'common' });
  assert.equal(trialCommon.cosmetic_ids.length, 0, 'comum não dropa cosmético');
  assert.equal(trialCommon.weapon_ids.length, 0, 'comum não dropa arma');
  assert.ok(!trialCommon.titulo_secreto, 'comum não dropa título secreto');
  assert.equal(trialCommon.frozen_streaks, 0, 'comum não dropa frozen streak');
  assert.equal(trialCommon.route_drinks, 0, 'comum não dropa route drink');

  const trialElite = freshPending();
  rollLootTable(uBoss, 90_000 + i, trialElite, { tier: 'elite' });
  assert.equal(trialElite.exp_instant, 0, 'elite não dropa EXP instantâneo');
  assert.equal(trialElite.doria_bags, 0, 'elite não dropa bolsa de coins');
  assert.equal(trialElite.cosmetic_ids.length, 0, 'elite não dropa cosmético');
  assert.ok(!trialElite.titulo_secreto, 'elite não dropa título secreto');
  assert.equal(trialElite.frozen_streaks, 0, 'elite não dropa frozen streak');

  const trialBoss = freshPending();
  rollLootTable(uBoss, 120_000 + i, trialBoss, { tier: 'boss' });
  assert.equal(trialBoss.frozen_streaks, 0, 'boss não dropa frozen streak');
}

let procMisses = 0;
let procHits = 0;
for (let i = 0; i < 50; i += 1) {
  const trial = { ...EMPTY_AFK_PENDING };
  rollKillDrop(uBoss, 10_000 + i, trial, { tier: 'common' });
  if (
    trial.xp === 0 &&
    trial.abdoria === 0 &&
    trial.frozen_streaks === 0 &&
    trial.cosmetic_ids.length === 0 &&
    !trial.titulo_secreto
  ) {
    procMisses += 1;
  } else {
    procHits += 1;
    assert.equal(trial.drop_count, 1, 'successful kill drop increments drop_count once');
  }
}
assert.ok(procMisses > 20, 'common kill drop respects 4% proc chance');
assert.ok(procHits > 0, 'some kill drops succeed in trial batch');

const uGolden = mockUser(0);
ensureCombat(uGolden);
uGolden.afk!.combat!.enemy_id = 'golden_slime';
applyKill(uGolden);
assert.equal(uGolden.afk!.pending.drop_count, 1, 'golden slime counts as one drop event');
assert.equal(uGolden.afk!.pending.abdoria, 999, 'golden slime grants 999 Coins');

const uGoldenDefeat = mockUser(0);
ensureCombat(uGoldenDefeat);
uGoldenDefeat.afk!.combat!.enemy_id = 'golden_slime';
const goldenPending = { ...EMPTY_AFK_PENDING };
defeatCurrentEnemy(uGoldenDefeat, goldenPending);
assert.equal(
  goldenPending.abdoria,
  AFK_GOLDEN_SLIME_MOEDA_BONUS,
  'defeatCurrentEnemy golden slime bonus',
);
assert.equal(goldenPending.drop_count, 1, 'defeatCurrentEnemy golden slime drop event');

assert.equal(
  countAfkDropEvents({ ...EMPTY_AFK_PENDING, xp: 5, abdoria: 3, drop_count: 8 }),
  8,
  'countAfkDropEvents prefers tracked drop_count',
);
assert.equal(
  countAfkDropEvents({ ...EMPTY_AFK_PENDING, xp: 3, abdoria: 2, frozen_streaks: 1 }),
  6,
  'countAfkDropEvents estimates legacy pending loot',
);

const uOffline = mockUser(0);
const kills = simulateOfflineKills(uOffline, 12);
assert.ok(kills > 0, '12 min offline combat defeats enemies');
assert.ok(
  kills <= Math.floor(12 * AFK_KILLS_PER_MINUTE),
  'attacks and searches limit offline kills',
);

// Boss é a cada 100 mortes de verdade (não 99 — o -1 antigo fazia o boss
// chegar um kill antes do contador "X/100" realmente bater no teto).
assert.ok(!shouldSpawnBoss(99), 'não spawna boss ainda em 99 progresso');
assert.ok(shouldSpawnBoss(100), 'spawn boss ao bater 100 progresso');
assert.equal(advanceKillsUntilBoss(60, false), 61);
assert.equal(advanceKillsUntilBoss(98, false), 99);
assert.equal(advanceKillsUntilBoss(99, false), 100);
assert.equal(advanceKillsUntilBoss(100, false), 100);
assert.equal(advanceKillsUntilBoss(100, true), 0);

assert.equal(afkKillsForHours(PATROL_CACHE_HOURS), PATROL_CACHE_HOURS * 60 * AFK_KILLS_PER_MINUTE);

const u4 = mockUser(0);
const claimed = grantPatrolCacheRewards(u4, PATROL_CACHE_HOURS);
assert.ok(claimed.xp >= 0, '6h patrol cache simulates kill drops');

console.log('AFK verification OK');
