import { useMemo, type CSSProperties } from 'react';
import type { AfkCombatSnapshot } from '@/types';
import {
  AFK_ENEMIES,
  accessoryDropMotion,
  collectSlimeAccessories,
  hashCombatSeed,
  resolvePortraitAppearance,
  rollSlimeCosmetic,
} from '@/types';
import { SlimeAccessoryLoot } from '@/components/afk/SlimeAccessories';
import { SlimeBody } from '@/components/afk/SlimeBody';

interface Props {
  combat: AfkCombatSnapshot;
  userId: string;
  spawnKillsTotal: number;
  hit: boolean;
  critHit?: boolean;
  dying: boolean;
  looting: boolean;
  hitKey: number;
  displayHp: number;
  /** Vida antes do golpe mais recente — alimenta o rastro da barra. */
  previousDisplayHp: number;
  /** Boss não mostra a barra flutuante — a vida dele fica na barra grande
      embaixo (AfkBossProgressPanel), pra não duplicar a mesma informação. */
  showHpBar?: boolean;
}

export function AfkEnemySprite({
  combat,
  userId,
  spawnKillsTotal,
  hit,
  critHit = false,
  dying,
  looting,
  hitKey,
  displayHp,
  previousDisplayHp,
  showHpBar = true,
}: Props) {
  const enemyId = combat.enemy_id;
  const label = AFK_ENEMIES[enemyId]?.label ?? 'Inimigo';
  const maxHp = combat.enemy_max_hp;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (displayHp / maxHp) * 100)) : 0;
  const prevHpPct =
    maxHp > 0 ? Math.max(0, Math.min(100, (previousDisplayHp / maxHp) * 100)) : 0;
  // Verde > 50%, âmbar 25–50%, vermelho < 25% — os mesmos cortes usados na
  // maioria dos jogos (MOBA/ARPG) pra comunicar "perigo" sem precisar de texto.
  const hpStage = hpPct > 50 ? 'high' : hpPct > 25 ? 'mid' : 'low';

  // Rosto fixo por criatura (igual ao Bestiário) — só o motion de drop do
  // loot ainda precisa de uma semente, já que aquilo é física de queda, não
  // identidade visual do inimigo.
  const dropSeed = useMemo(
    () => hashCombatSeed(`${userId}:${spawnKillsTotal}:drop`),
    [userId, spawnKillsTotal],
  );

  const appearance = useMemo(() => resolvePortraitAppearance(enemyId), [enemyId]);

  // Identidade da criatura (fixa) + um cosmético sorteado por spawn — o
  // sorteio usa uma semente própria pra não mudar quando só o loot re-rola.
  const accessories = useMemo(() => {
    const identity = collectSlimeAccessories(enemyId, combat.is_boss, appearance);
    const cosmeticSeed = hashCombatSeed(`${userId}:${spawnKillsTotal}:cosmetic`);
    const cosmetic = rollSlimeCosmetic(cosmeticSeed, combat.is_boss, identity);
    return cosmetic ? [...identity, cosmetic] : identity;
  }, [enemyId, combat.is_boss, appearance, userId, spawnKillsTotal]);

  const className = [
    'game-afk-enemy',
    `game-afk-enemy--${enemyId}`,
    combat.is_boss ? 'game-afk-enemy--boss' : '',
    combat.elite ? 'game-afk-enemy--elite' : '',
    enemyId === 'golden_slime' || enemyId === 'magic_rabbit' ? 'game-afk-enemy--golden' : '',
    hit && !critHit ? 'game-afk-enemy--hit' : '',
    hit && critHit ? 'game-afk-enemy--crit-hit' : '',
    dying ? 'game-afk-enemy--dying' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    // Chave só no `hitKey` (que sobe no impacto): antes ela alternava
    // 'idle' ↔ 'hit-N', então o nó remontava DUAS vezes por ataque e o
    // rastro/flash da barra tocava de novo no fim do golpe — bem visível em
    // magia, cuja cauda é ~1,5s depois do impacto.
    <div key={`hit-${hitKey}`} className={className} aria-label={label}>
      {combat.is_boss && <div className="game-afk-enemy__boss-aura" aria-hidden />}
      {(enemyId === 'golden_slime' || enemyId === 'magic_rabbit') && (
        <div className="game-afk-enemy__golden-sparkle" aria-hidden />
      )}

      {!dying && !looting && (
        <>
          <span className="game-afk-enemy__name-tag">{label}</span>
          {showHpBar && (
            <div
              className={[
                'game-afk-enemy__hp-track',
                `game-afk-enemy__hp-track--${hpStage}`,
                hit ? 'game-afk-enemy__hp-track--hit' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="progressbar"
              aria-valuenow={displayHp}
              aria-valuemin={0}
              aria-valuemax={maxHp}
              aria-label={`Vida de ${label}`}
            >
              {/* Rastro: mostra o pedaço de vida recém-perdido por um instante
                  antes de escorregar pro valor novo — a barra principal já
                  encolhe na hora. */}
              <div
                className="game-afk-enemy__hp-ghost"
                style={{ '--hp-ghost-from': `${prevHpPct}%`, '--hp-ghost-to': `${hpPct}%` } as CSSProperties}
              />
              <div className="game-afk-enemy__hp-fill" style={{ width: `${hpPct}%` }} />
              <span className="game-afk-enemy__hp-flash" aria-hidden />
            </div>
          )}
        </>
      )}

      <div className="game-afk-enemy__sprite">
        <SlimeBody
          enemyId={enemyId}
          isBoss={combat.is_boss}
          appearance={appearance}
          accessories={accessories}
          looting={looting}
        />
      </div>

      {looting && (
        <div className="game-afk-enemy__loot-layer" aria-hidden>
          {accessories.map((kind, index) => {
            const motion = accessoryDropMotion(dropSeed, index);
            return (
              <SlimeAccessoryLoot
                key={`${kind}-${index}`}
                kind={kind}
                driftX={motion.x}
                driftY={motion.y}
                rotation={motion.rot}
                delayMs={index * 55}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
