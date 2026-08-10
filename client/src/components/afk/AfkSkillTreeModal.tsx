import { useEffect, useRef, useState, type ComponentType, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import {
  BowArrow,
  CircleAlert,
  Check,
  CircleDotDashed,
  Clover,
  Coins,
  Crosshair,
  Gem,
  HeartPulse,
  LockKeyhole,
  Move,
  RotateCcw,
  Search,
  ShieldPlus,
  Sparkles,
  Swords,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  AFK_SKILL_NODES,
  canUnlockAfkSkill,
  getAfkSkillNode,
  type AfkCombatSnapshot,
  type AfkSkillEffect,
} from '@/types';

interface Props {
  open: boolean;
  combat: AfkCombatSnapshot | null;
  busy?: boolean;
  onUnlock: (nodeId: string) => void;
  onReset: (currency: 'coins' | 'gems') => void;
  onClose: () => void;
}

const BRANCH_LABELS = {
  arco: 'Caminho do arco',
  espada: 'Caminho da espada',
  magia: 'Caminho arcano',
  sobrevivencia: 'Raiz da vitalidade',
  fortuna: 'Caminho dos drops',
};

const EFFECT_ICONS: Record<AfkSkillEffect, ComponentType<{ size?: number }>> = {
  bow_damage_pct: BowArrow,
  bow_crit_pct: Crosshair,
  sword_damage_pct: Swords,
  sword_crit_pct: Zap,
  crit_damage_pct: Crosshair,
  magic_damage_pct: WandSparkles,
  spell_drop_pct: Sparkles,
  hero_hp_pct: HeartPulse,
  search_reduction_ms: Search,
  defeat_reduction_ms: ShieldPlus,
  drop_chance_pct: Clover,
};

export function AfkSkillTreeModal({ open, combat, busy, onUnlock, onReset, onClose }: Props) {
  const [selectedId, setSelectedId] = useState('core_instinct');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCurrency, setResetCurrency] = useState<'coins' | 'gems'>('coins');
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open || !combat) return null;

  const unlocked = combat.skill_nodes;
  const selected = getAfkSkillNode(selectedId) ?? AFK_SKILL_NODES[0];
  const selectedLearned = unlocked.includes(selected.id);
  const selectedAvailable = canUnlockAfkSkill(unlocked, selected.id);
  const canAffordSelected = combat.orbs >= selected.cost;
  const hasFreeReset = !combat.skill_tree_free_reset_used;
  const SelectedIcon = EFFECT_ICONS[selected.effect];

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  };

  return (
    <div
      className="game-afk-skills"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-tree-title"
    >
      <motion.div
        className="game-afk-skills__panel"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <header className="game-afk-skills__head">
          <div>
            <span>Árvore ancestral</span>
            <h2 id="skill-tree-title">Caminhos do herói</h2>
          </div>
          <div className="game-afk-skills__head-actions">
            <div className="game-afk-skills__orbs" aria-label={`${combat.orbs} orbes disponíveis`}>
              <CircleDotDashed size={20} aria-hidden />
              <span>
                <small>Orbes</small>
                <strong>{combat.orbs}</strong>
              </span>
            </div>
            <button
              type="button"
              className="game-afk-skills__reset-trigger"
              disabled={busy || unlocked.length === 0}
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw size={15} />
              <span>{hasFreeReset ? 'Reset grátis' : 'Resetar'}</span>
            </button>
            <button type="button" onClick={onClose} aria-label="Fechar árvore">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="game-afk-skills__body">
          <div
            ref={viewportRef}
            className={`game-afk-skills__viewport${dragging ? ' game-afk-skills__viewport--dragging' : ''}`}
            aria-label="Mapa de habilidades. Arraste para navegar."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <div className="game-afk-skills__canvas">
              <div className="game-afk-skills__mist" aria-hidden />
              <svg
                className="game-afk-skills__connections"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                {AFK_SKILL_NODES.flatMap((node) =>
                  node.requires.map((requiredId) => {
                    const parent = getAfkSkillNode(requiredId);
                    if (!parent) return null;
                    return (
                      <line
                        key={`${requiredId}-${node.id}`}
                        x1={parent.x}
                        y1={parent.y}
                        x2={node.x}
                        y2={node.y}
                        className={
                          unlocked.includes(requiredId) && unlocked.includes(node.id)
                            ? 'game-afk-skills__line game-afk-skills__line--active'
                            : unlocked.includes(requiredId)
                              ? 'game-afk-skills__line game-afk-skills__line--ready'
                              : 'game-afk-skills__line'
                        }
                      />
                    );
                  }),
                )}
              </svg>

              {AFK_SKILL_NODES.map((node) => {
                const learned = unlocked.includes(node.id);
                const available = canUnlockAfkSkill(unlocked, node.id);
                const Icon = EFFECT_ICONS[node.effect];
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`game-afk-skill-node game-afk-skill-node--${node.branch}${node.id === 'core_instinct' ? ' game-afk-skill-node--core' : ''}${learned ? ' game-afk-skill-node--learned' : ''}${available ? ' game-afk-skill-node--available' : ''}${selected.id === node.id ? ' game-afk-skill-node--selected' : ''}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    onClick={() => setSelectedId(node.id)}
                    aria-label={`${node.name}. ${node.description}. Custo: ${node.cost} orbes.`}
                    aria-pressed={selected.id === node.id}
                    title={node.name}
                  >
                    <Icon aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>

          <aside className={`game-afk-skills__detail game-afk-skills__detail--${selected.branch}`}>
            <div className="game-afk-skills__detail-icon">
              <SelectedIcon size={28} />
            </div>
            <span>{BRANCH_LABELS[selected.branch]}</span>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
            {selected.requires.length > 0 ? (
              <div className="game-afk-skills__requires">
                <LockKeyhole size={13} />
                <span>
                  Requer {selected.requires.map((id) => getAfkSkillNode(id)?.name).join(' + ')}
                </span>
              </div>
            ) : null}
            <button
              type="button"
              className="game-afk-skills__unlock"
              disabled={busy || selectedLearned || !selectedAvailable || !canAffordSelected}
              onClick={() => onUnlock(selected.id)}
            >
              {selectedLearned ? (
                <>
                  <Check size={16} /> Aprendida
                </>
              ) : !selectedAvailable ? (
                <>
                  <LockKeyhole size={16} /> Caminho bloqueado
                </>
              ) : (
                <>
                  <CircleDotDashed size={17} /> Desbloquear · {selected.cost}
                </>
              )}
            </button>
          </aside>
        </div>

        {resetOpen ? (
          <div className="game-afk-skills__reset-layer" onClick={() => setResetOpen(false)}>
            <motion.section
              className="game-afk-skills__reset-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="skill-reset-title"
              aria-describedby="skill-reset-description"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="game-afk-skills__reset-icon">
                <CircleAlert size={24} />
              </div>
              <span>{hasFreeReset ? 'Primeiro reset gratuito' : 'Restauração da árvore'}</span>
              <h3 id="skill-reset-title">Resetar todas as habilidades?</h3>
              <p id="skill-reset-description">
                Todas as habilidades serão removidas e os Orbes gastos serão devolvidos. Seu
                progresso nos capítulos, equipamentos e Orbes que ainda não foram usados não será
                afetado.{' '}
                {hasFreeReset
                  ? 'Este é seu primeiro reset e nenhuma moeda será consumida.'
                  : 'Escolha abaixo como deseja pagar pelo reset.'}
              </p>

              {hasFreeReset ? (
                <div className="game-afk-skills__reset-free" aria-label="Reset gratuito disponível">
                  <RotateCcw size={20} />
                  <span>
                    <strong>Grátis</strong>
                    <small>Disponível somente neste primeiro reset</small>
                  </span>
                </div>
              ) : (
                <div
                  className="game-afk-skills__reset-options"
                  role="radiogroup"
                  aria-label="Forma de pagamento"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={resetCurrency === 'coins'}
                    className={resetCurrency === 'coins' ? 'is-selected' : ''}
                    onClick={() => setResetCurrency('coins')}
                  >
                    <Coins size={20} />
                    <span>
                      <strong>5.000 Coins</strong>
                      <small>Usar saldo de Coins</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={resetCurrency === 'gems'}
                    className={resetCurrency === 'gems' ? 'is-selected' : ''}
                    onClick={() => setResetCurrency('gems')}
                  >
                    <Gem size={20} />
                    <span>
                      <strong>1 Gema</strong>
                      <small>Usar uma Gema</small>
                    </span>
                  </button>
                </div>
              )}

              <div className="game-afk-skills__reset-actions">
                <button type="button" onClick={() => setResetOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="game-afk-skills__reset-confirm"
                  disabled={busy}
                  onClick={() => {
                    onReset(resetCurrency);
                    setResetOpen(false);
                  }}
                >
                  <RotateCcw size={15} />
                  {busy ? 'Resetando…' : hasFreeReset ? 'Usar reset grátis' : 'Sim, resetar árvore'}
                </button>
              </div>
            </motion.section>
          </div>
        ) : null}

        <footer className="game-afk-skills__footer">
          <span>
            <Move size={14} /> Arraste o mapa para explorar os caminhos.
          </span>
        </footer>
      </motion.div>
    </div>
  );
}
