import { motion } from 'framer-motion';
import { Check, LoaderCircle, LockKeyhole, Map, Swords, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { AFK_REGIONS, type AfkCombatSnapshot, type AfkRegionId } from '@/types';

interface Props {
  open: boolean;
  combat: AfkCombatSnapshot | null;
  busy?: boolean;
  travelingRegionId?: AfkRegionId | null;
  onSelect: (regionId: AfkRegionId) => void;
  onClose: () => void;
}

export function AfkRegionMapModal({
  open,
  combat,
  busy,
  travelingRegionId,
  onSelect,
  onClose,
}: Props) {
  if (!open || !combat) return null;
  const unlocked = new Set(combat.unlocked_regions);

  return (
    <div className="game-afk-map" role="dialog" aria-modal="true" aria-labelledby="afk-map-title">
      <motion.div
        className="game-afk-map__sheet"
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <header className="game-afk-map__head">
          <div>
            <span>Atlas de Abdoria</span>
            <h2 id="afk-map-title">
              <Map size={20} /> Mapa da campanha
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar mapa">
            <X size={20} />
          </button>
        </header>
        <div className="game-afk-map__route">
          {AFK_REGIONS.map((region, index) => {
            const isUnlocked = unlocked.has(region.id);
            const isCurrent = combat.region_id === region.id;
            const progress = combat.region_progress[region.id];
            const bossDefeated = Boolean(progress?.boss_defeated);
            const isTraveling = travelingRegionId === region.id;
            return (
              <div key={region.id} className="game-afk-map__stop">
                {index < AFK_REGIONS.length - 1 ? (
                  <span className="game-afk-map__path" aria-hidden />
                ) : null}
                <button
                  type="button"
                  className={`game-afk-map__region${isCurrent ? ' game-afk-map__region--current' : ''}${bossDefeated ? ' game-afk-map__region--cleared' : ''}`}
                  disabled={!isUnlocked || busy}
                  onClick={() => onSelect(region.id)}
                  style={{ '--region-accent': region.accent } as CSSProperties}
                >
                  <span className="game-afk-map__chapter">CAP. {region.chapter}</span>
                  <span className="game-afk-map__node">
                    {isTraveling ? (
                      <LoaderCircle className="game-afk-map__travel-spinner" size={18} />
                    ) : !isUnlocked ? (
                      <LockKeyhole size={18} />
                    ) : bossDefeated ? (
                      <Check size={19} />
                    ) : (
                      <Swords size={18} />
                    )}
                  </span>
                  <strong>
                    {isTraveling
                      ? `Viajando para ${region.name}`
                      : isUnlocked
                        ? region.name
                        : 'Região bloqueada'}
                  </strong>
                  <small>
                    {isTraveling
                      ? 'Carregando cenário e encontro…'
                      : !isUnlocked
                        ? 'Derrote o guardião anterior'
                        : bossDefeated
                          ? `${progress?.boss_kills ?? 0} chefe(s) derrotado(s)`
                          : `${progress?.kills_until_boss ?? 0}/${region.killsToBoss} até o chefe`}
                  </small>
                  {isCurrent && !isTraveling ? <em>Explorando agora</em> : null}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
