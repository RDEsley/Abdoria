import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimationControls } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarClock,
  Check,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { updateMe } from '@/lib/api';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { useAtividadesFlow } from '@/hooks/useAtividadesFlow';
import { playClick } from '@/lib/sounds';
import { AtividadeFormModal } from './AtividadeFormModal';
import { AtividadesAgendaModal } from './AtividadesAgendaModal';
import {
  ATIVIDADES_CATALOGO,
  ATIVIDADES_LIMITE_MSG,
  ATIVIDADES_MAX,
  type AtividadeExtra,
} from '@shared/atividades';
import { getTodaySaoPaulo } from '@shared/utils/timezone';

const FILA_MEDIDOR_MAX = 6;

/**
 * Reforço positivo crescente ao encher a fila — puramente função de `n`,
 * então some sozinho se a quantidade cair pra um patamar sem mensagem (ex.:
 * de 3 pra 1) e volta a aparecer se subir de novo. Nada de exclamação em
 * excesso — frases curtas, naturais.
 */
function mensagemFila(n: number): string | null {
  if (n === 2) return 'Boa, mais uma!';
  if (n === 3) return 'Isso aí, seguindo forte.';
  if (n === 4) return 'Você tá com tudo hoje.';
  if (n === 5) return 'Uau, que fôlego!';
  if (n >= 6) return 'Lendário — nada te para.';
  return null;
}

/**
 * Uma linha da lista: sempre arrastável pela alça (mesmo padrão puro
 * dnd-kit — sem Framer Motion no item — usado na fila de exercícios do
 * Construtor; misturar spring animation com o transform do dnd-kit no
 * mesmo nó deixava o arraste com lag). Editar/excluir ficam direto no
 * row, visíveis só em modo de edição, sem submenu.
 */
function SortableAtividadeItem({
  atividade,
  feita,
  naFila,
  modoEdicao,
  bloqueada,
  busy,
  onToggleFila,
  onEdit,
  onDelete,
}: {
  atividade: AtividadeExtra;
  feita: boolean;
  naFila: boolean;
  modoEdicao: boolean;
  /** Hoje não está nos dias agendados pra atividades — só visualização/CRUD. */
  bloqueada: boolean;
  busy: boolean;
  onToggleFila: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: atividade.id,
  });

  const Icon = ACHIEVEMENT_ICON_COMPONENTS[atividade.icon];
  const meta =
    atividade.meta_tipo === 'tempo'
      ? `${atividade.meta_valor} min`
      : `${atividade.meta_valor} ${atividade.meta_unidade ?? ''}`.trim();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`atividade-item${feita ? ' atividade-item--feita' : ''}${naFila ? ' atividade-item--fila' : ''}${isDragging ? ' atividade-item--dragging' : ''}`}
    >
      <button
        type="button"
        className="atividade-item__handle"
        aria-label={`Arrastar ${atividade.nome} para reordenar`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} aria-hidden />
      </button>

      <button
        type="button"
        className="atividade-item__main"
        disabled={modoEdicao || busy || bloqueada}
        onClick={onToggleFila}
        title={
          bloqueada
            ? 'Não agendada para hoje'
            : naFila
              ? 'Remover da fila'
              : feita
                ? 'Concluída hoje — toque para fazer de novo'
                : 'Adicionar à fila'
        }
      >
        <span className="atividade-item__icon" aria-hidden>
          {feita ? <Check size={16} /> : <Icon size={16} />}
        </span>
        <span className="atividade-item__text">
          <strong>{atividade.nome}</strong>
          <small>
            {feita && naFila
              ? 'Vai repetir hoje'
              : feita
                ? 'Concluída hoje · toque para repetir'
                : meta}
          </small>
        </span>
        {!modoEdicao && !bloqueada && (
          <span className="atividade-item__badge" aria-hidden>
            {naFila ? <X size={13} /> : <Plus size={13} />}
          </span>
        )}
      </button>

      {modoEdicao && (
        <span className="atividade-item__acoes">
          <button
            type="button"
            className="atividade-item__acao"
            aria-label={`Editar ${atividade.nome}`}
            disabled={busy}
            onClick={onEdit}
          >
            <Pencil size={13} aria-hidden />
          </button>
          <button
            type="button"
            className="atividade-item__acao atividade-item__acao--excluir"
            aria-label={`Excluir ${atividade.nome}`}
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </span>
      )}
    </li>
  );
}

/**
 * Seção de Atividades do Início: a lista do usuário (criar/editar/excluir/
 * reordenar) e a fila do dia. A conclusão em si acontece numa tela cheia
 * própria (`/atividades-player`, mesma linguagem visual do Player) — este
 * card só monta a fila e navega pra lá.
 *
 * Regra: em dia de descanso as atividades dão XP e sustentam a streak a
 * partir de `ATIVIDADES_MIN_DESCANSO`; em dia de treino elas só ficam
 * registradas (quem paga o dia é o treino).
 */
export function AtividadesCard() {
  const { user, refresh } = useApp();
  const { applyUser } = useAuth();
  const navigate = useNavigate();
  const flow = useAtividadesFlow();

  const [busy, setBusy] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editando, setEditando] = useState<AtividadeExtra | 'nova' | null>(null);
  const [mostrarAgenda, setMostrarAgenda] = useState(false);

  const { atividades, fila, hojeNaAgenda, diaDeTreino, concluidasHoje, filaPendente } = flow;

  const noLimite = atividades.length >= ATIVIDADES_MAX;

  /* ---------------- persistência (CRUD da lista) ---------------- */

  const persist = async (patch: Record<string, unknown>, mensagem?: string): Promise<boolean> => {
    if (!user || busy) return false;
    setBusy(true);
    try {
      const atualizado = await updateMe({ preferencias: { ...user.preferencias, ...patch } });
      // Este card lê `user` do AppContext (via useApp), não do AuthContext —
      // applyUser sozinho não bastava: a fila/lista ficava "travada" porque o
      // AppContext nunca sabia que preferencias tinham mudado. refresh()
      // busca o /me atualizado e resolve os dois contextos de uma vez.
      applyUser(atualizado);
      await refresh();
      if (mensagem) showGameToast(mensagem, { variant: 'success' });
      return true;
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar.'), { variant: 'error' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const salvarLista = (lista: AtividadeExtra[], mensagem?: string) =>
    persist({ atividades: lista }, mensagem);

  const salvarFila = (ids: string[]) =>
    persist({ atividades_fila: { data: getTodaySaoPaulo(), ids } });

  /* ---------------- CRUD ---------------- */

  const criarOuEditar = (atividade: AtividadeExtra) => {
    const existe = atividades.some((a) => a.id === atividade.id);
    // Novas entram no topo da lista (a animação de layout cuida do resto).
    const lista = existe
      ? atividades.map((a) => (a.id === atividade.id ? atividade : a))
      : [atividade, ...atividades];
    void salvarLista(lista, existe ? 'Atividade atualizada.' : 'Atividade criada!');
    setEditando(null);
  };

  const excluir = (id: string) => {
    void salvarLista(
      atividades.filter((a) => a.id !== id),
      'Atividade removida.',
    );
    if (fila.includes(id)) void salvarFila(fila.filter((f) => f !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Arrastar pela alça reordena — sempre ativo. */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = atividades.findIndex((a) => a.id === active.id);
    const newIndex = atividades.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    void salvarLista(arrayMove(atividades, oldIndex, newIndex));
  };

  const resetar = () => {
    void salvarLista(
      ATIVIDADES_CATALOGO.map((a) => ({ ...a })),
      'Atividades restauradas para o padrão.',
    );
    setModoEdicao(false);
  };

  /* ---------------- fila ---------------- */

  const alternarFila = (atividade: AtividadeExtra) => {
    // Concluída hoje não trava mais a atividade — o usuário pode enfileirar
    // de novo pra repetir (ex.: outra sessão de leitura no mesmo dia).
    if (!hojeNaAgenda) return;
    playClick();
    const naFila = fila.includes(atividade.id);
    void salvarFila(naFila ? fila.filter((id) => id !== atividade.id) : [...fila, atividade.id]);
  };

  /* ---------------- medidor da fila ---------------- */

  // Pulso ao mudar a quantidade — imperativo (não `key`), pra nunca remontar
  // o elemento: um remount por troca de contagem chegava a duplicar visualmente
  // as barrinhas por uma fração de segundo em alguns navegadores.
  const medidorControls = useAnimationControls();
  const filaLenRef = useRef(filaPendente.length);
  useEffect(() => {
    if (filaPendente.length === filaLenRef.current) return;
    filaLenRef.current = filaPendente.length;
    void medidorControls.start({
      scale: [0.94, 1],
      transition: { type: 'spring', stiffness: 500, damping: 20 },
    });
  }, [filaPendente.length, medidorControls]);

  /* ---------------- render ---------------- */

  return (
    <section className="glass-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="game-section-title !mb-0 flex items-center gap-2">
          <ListChecks size={14} aria-hidden /> Atividades
        </h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <button
            type="button"
            className="atividade-action-btn"
            aria-label="Quando fazer atividades"
            title="Quando fazer atividades"
            onClick={() => setMostrarAgenda(true)}
          >
            <CalendarClock size={13} aria-hidden /> Agenda
          </button>
          <button
            type="button"
            className={`atividade-action-btn${modoEdicao ? ' atividade-action-btn--active' : ''}`}
            aria-label={modoEdicao ? 'Concluir edição da lista' : 'Editar lista de atividades'}
            aria-pressed={modoEdicao}
            title={modoEdicao ? 'Concluir edição' : 'Editar lista'}
            onClick={() => {
              playClick();
              setModoEdicao((v) => !v);
            }}
          >
            {modoEdicao ? (
              <>
                <Check size={13} aria-hidden /> Concluir
              </>
            ) : (
              <>
                <Pencil size={13} aria-hidden /> Editar
              </>
            )}
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs font-semibold text-stone-500">
        {diaDeTreino
          ? 'Hoje é dia de treino: as atividades ficam registradas e podem liberar conquistas, mas o XP e a streak vêm do treino.'
          : hojeNaAgenda
            ? 'Dia de descanso: escolha atividades pra ganhar XP e manter sua sequência.'
            : 'Atividades não agendadas para hoje — toque no calendário acima pra ajustar os dias.'}
      </p>

      {filaPendente.length > 0 && !modoEdicao && hojeNaAgenda && (
        <div className="atividades-fila-cta mt-3">
          <motion.div
            className={`atividades-fila-medidor atividades-fila-medidor--tier-${Math.min(filaPendente.length, FILA_MEDIDOR_MAX)}`}
            animate={medidorControls}
          >
            {Array.from({ length: FILA_MEDIDOR_MAX }).map((_, i) => (
              <span
                key={i}
                className={`atividades-fila-medidor__pip${i < filaPendente.length ? ' is-filled' : ''}`}
              />
            ))}
          </motion.div>

          {mensagemFila(filaPendente.length) && (
            <p className="atividades-fila-mensagem">
              <Sparkles size={12} aria-hidden /> {mensagemFila(filaPendente.length)}
            </p>
          )}

          <GameButton
            className="mt-2 flex w-full items-center justify-center gap-2"
            disabled={busy}
            onClick={() => {
              playClick();
              navigate('/atividades-player');
            }}
          >
            Iniciar {filaPendente.length} atividade{filaPendente.length === 1 ? '' : 's'}
          </GameButton>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={atividades.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="atividades-lista">
            {atividades.map((atividade) => (
              <SortableAtividadeItem
                key={atividade.id}
                atividade={atividade}
                feita={concluidasHoje.has(atividade.nome)}
                naFila={fila.includes(atividade.id)}
                modoEdicao={modoEdicao}
                bloqueada={!hojeNaAgenda}
                busy={busy}
                onToggleFila={() => alternarFila(atividade)}
                onEdit={() => setEditando(atividade)}
                onDelete={() => excluir(atividade.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {atividades.length > 1 && (
        <p className="mt-2 flex items-center gap-1.5 text-[0.65rem] font-semibold text-stone-400">
          <GripVertical size={12} aria-hidden /> Segure a alça e arraste pra reordenar.
        </p>
      )}

      {noLimite ? (
        <p className="mt-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-2.5 text-center text-[0.68rem] font-bold text-amber-800">
          {ATIVIDADES_LIMITE_MSG}
        </p>
      ) : (
        <GameButton
          variant="secondary"
          className="mt-3 flex w-full items-center justify-center gap-2"
          disabled={busy}
          onClick={() => setEditando('nova')}
        >
          <Plus size={16} aria-hidden /> Criar atividade
        </GameButton>
      )}

      {modoEdicao && (
        <GameButton
          variant="ghost"
          className="mt-2 flex w-full items-center justify-center gap-2"
          disabled={busy}
          onClick={resetar}
        >
          <RotateCcw size={15} aria-hidden /> Restaurar atividades padrão
        </GameButton>
      )}

      {editando && (
        <AtividadeFormModal
          atividade={editando === 'nova' ? null : editando}
          onClose={() => setEditando(null)}
          onSave={criarOuEditar}
        />
      )}

      {mostrarAgenda && <AtividadesAgendaModal onClose={() => setMostrarAgenda(false)} />}
    </section>
  );
}
