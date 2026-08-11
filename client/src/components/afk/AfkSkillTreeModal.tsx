import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
} from 'react';
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
  userId?: string;
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

const EMPTY_SKILL_ID_SET = new Set<string>();
const READY_SKILLS_STORAGE_PREFIX = 'abdoria_skill_tree_ready_seen_v1';
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function trapKeyboardFocus(event: ReactKeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab' || event.defaultPrevented) return;
  const focusableElements = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  if (focusableElements.length === 0) return;
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function readSeenReadySkills(userId: string): Set<string> {
  try {
    const stored = window.localStorage.getItem(`${READY_SKILLS_STORAGE_PREFIX}_${userId}`);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

function rememberReadySkills(userId: string, skillIds: Set<string>): void {
  try {
    window.localStorage.setItem(
      `${READY_SKILLS_STORAGE_PREFIX}_${userId}`,
      JSON.stringify([...skillIds]),
    );
  } catch {
    // A animação continua funcional na sessão mesmo sem armazenamento local.
  }
}

export function AfkSkillTreeModal({
  open,
  combat,
  userId = 'guest',
  busy,
  onUnlock,
  onReset,
  onClose,
}: Props) {
  const [selectedId, setSelectedId] = useState('core_instinct');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCurrency, setResetCurrency] = useState<'coins' | 'gems'>('coins');
  const [dragging, setDragging] = useState(false);
  const [orbsHintOpen, setOrbsHintOpen] = useState(false);
  const [attentionNodeIds, setAttentionNodeIds] = useState<Set<string>>(EMPTY_SKILL_ID_SET);
  const viewportRef = useRef<HTMLDivElement>(null);
  const orbsHintRef = useRef<HTMLDivElement>(null);
  const resetTriggerRef = useRef<HTMLButtonElement>(null);
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const resetWasOpenRef = useRef(false);
  const readyThisMountRef = useRef(new Set<string>());
  const suppressNodeClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
      viewport.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const availableNodeIdsKey = combat
    ? AFK_SKILL_NODES.filter((node) => canUnlockAfkSkill(combat.skill_nodes, node.id))
        .map((node) => node.id)
        .join('|')
    : '';

  useEffect(() => {
    if (!open) return undefined;
    const availableNodeIds = availableNodeIdsKey ? availableNodeIdsKey.split('|') : [];
    const seenNodeIds = readSeenReadySkills(userId);
    const unseenNodeIds = availableNodeIds.filter((nodeId) => !seenNodeIds.has(nodeId));
    unseenNodeIds.forEach((nodeId) => readyThisMountRef.current.add(nodeId));
    const firstSeenThisMount = availableNodeIds.filter((nodeId) =>
      readyThisMountRef.current.has(nodeId),
    );
    setAttentionNodeIds(
      firstSeenThisMount.length > 0 ? new Set(firstSeenThisMount) : EMPTY_SKILL_ID_SET,
    );

    if (unseenNodeIds.length > 0) {
      unseenNodeIds.forEach((nodeId) => seenNodeIds.add(nodeId));
      rememberReadySkills(userId, seenNodeIds);
    }

    const timer = window.setTimeout(() => setAttentionNodeIds(EMPTY_SKILL_ID_SET), 1_900);
    return () => window.clearTimeout(timer);
  }, [availableNodeIdsKey, open, userId]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (orbsHintOpen) {
        setOrbsHintOpen(false);
        return;
      }
      if (resetOpen) {
        setResetOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open, orbsHintOpen, resetOpen]);

  useEffect(() => {
    if (!open || !orbsHintOpen) return undefined;
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!orbsHintRef.current?.contains(event.target as Node)) setOrbsHintOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open, orbsHintOpen]);

  useEffect(() => {
    if (!open) {
      resetWasOpenRef.current = false;
      return undefined;
    }
    if (resetOpen) {
      resetWasOpenRef.current = true;
      const frame = window.requestAnimationFrame(() => resetCancelRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (!resetWasOpenRef.current) return undefined;
    resetWasOpenRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const resetTrigger = resetTriggerRef.current;
      if (resetTrigger && !resetTrigger.disabled) resetTrigger.focus();
      else viewportRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, resetOpen]);

  if (!open || !combat) return null;

  const unlocked = combat.skill_nodes;
  const selected = getAfkSkillNode(selectedId) ?? AFK_SKILL_NODES[0];
  const selectedLearned = unlocked.includes(selected.id);
  const selectedAvailable = canUnlockAfkSkill(unlocked, selected.id);
  const canAffordSelected = combat.orbs >= selected.cost;
  const hasFreeReset = !combat.skill_tree_free_reset_used;
  const SelectedIcon = EFFECT_ICONS[selected.effect];

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
    if (drag.moved) {
      window.setTimeout(() => {
        suppressNodeClickRef.current = false;
      }, 0);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if ((event.buttons & 1) === 0) {
      dragRef.current = null;
      suppressNodeClickRef.current = false;
      setDragging(false);
      return;
    }
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      suppressNodeClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
    event.currentTarget.scrollTop = drag.scrollTop - deltaY;
  };

  const handleResetDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    trapKeyboardFocus(event);
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
        onKeyDown={(event) => {
          if (!resetOpen) trapKeyboardFocus(event);
        }}
      >
        <header className="game-afk-skills__head">
          <div className="game-afk-skills__title">
            <span>Árvore ancestral</span>
            <h2 id="skill-tree-title">Caminhos do herói</h2>
          </div>
          <div className="game-afk-skills__head-actions">
            <div ref={orbsHintRef} className="game-afk-skills__orbs-wrap">
              <button
                type="button"
                className="game-afk-skills__orbs"
                aria-label={`${combat.orbs} orbes disponíveis. Saiba como conseguir.`}
                aria-expanded={orbsHintOpen}
                aria-controls="skill-orbs-hint"
                aria-describedby={orbsHintOpen ? 'skill-orbs-hint' : undefined}
                onClick={() => setOrbsHintOpen((current) => !current)}
              >
                <CircleDotDashed size={20} aria-hidden />
                <strong>{combat.orbs}</strong>
              </button>
              {orbsHintOpen ? (
                <div id="skill-orbs-hint" className="game-afk-skills__orbs-hint" role="tooltip">
                  <strong>Como conseguir Orbes?</strong>
                  <span>
                    Derrote o chefe de uma região: cada vitória concede 1 Orbe. Nos capítulos 1 a 5,
                    cada chefe concede até 10; no capítulo final, não há limite.
                  </span>
                </div>
              ) : null}
            </div>
            <button
              ref={resetTriggerRef}
              type="button"
              className="game-afk-skills__reset-trigger"
              disabled={busy || unlocked.length === 0}
              onClick={() => setResetOpen(true)}
              aria-label={
                unlocked.length === 0
                  ? 'Reset indisponível: nenhuma habilidade aprendida'
                  : hasFreeReset
                    ? 'Resetar habilidades: primeiro reset grátis'
                    : 'Resetar habilidades'
              }
              title={
                unlocked.length === 0
                  ? 'Aprenda uma habilidade para liberar o reset'
                  : hasFreeReset
                    ? 'Primeiro reset grátis'
                    : 'Resetar habilidades'
              }
            >
              <RotateCcw size={18} strokeWidth={2.5} aria-hidden />
              <span className="game-afk-skills__reset-label">
                {hasFreeReset ? 'Reset grátis' : 'Resetar'}
              </span>
            </button>
            <button
              type="button"
              className="game-afk-skills__close"
              onClick={onClose}
              aria-label="Fechar árvore"
              title="Fechar"
            >
              <X size={20} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        </header>

        <div className="game-afk-skills__body">
          <div
            ref={viewportRef}
            className={`game-afk-skills__viewport${dragging ? ' game-afk-skills__viewport--dragging' : ''}`}
            role="region"
            tabIndex={0}
            aria-label="Mapa de habilidades. Arraste ou use as setas para navegar."
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
                    className={`game-afk-skill-node game-afk-skill-node--${node.branch}${node.id === 'core_instinct' ? ' game-afk-skill-node--core' : ''}${learned ? ' game-afk-skill-node--learned' : ''}${available ? ' game-afk-skill-node--available' : ''}${attentionNodeIds.has(node.id) ? ' game-afk-skill-node--newly-available' : ''}${selected.id === node.id ? ' game-afk-skill-node--selected' : ''}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    onClick={(event) => {
                      if (suppressNodeClickRef.current) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      setSelectedId(node.id);
                    }}
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
              onKeyDown={handleResetDialogKeyDown}
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
                <button ref={resetCancelRef} type="button" onClick={() => setResetOpen(false)}>
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
