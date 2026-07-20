import { useState } from 'react';
import { motion } from 'framer-motion';
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
import { useAtividadesFlow, type AtividadesFluxoResumo } from '@/hooks/useAtividadesFlow';
import { playClick } from '@/lib/sounds';
import { AtividadeFormModal } from './AtividadeFormModal';
import { AtividadeCompleteModal } from './AtividadeCompleteModal';
import { AtividadesCelebration } from './AtividadesCelebration';
import { AtividadesAgendaModal } from './AtividadesAgendaModal';
import {
  ATIVIDADES_CATALOGO,
  ATIVIDADES_LIMITE_MSG,
  ATIVIDADES_MAX,
  ATIVIDADES_MIN_DESCANSO,
  type AtividadeExtra,
} from '@shared/atividades';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { resolveCosmeticos } from '@/types';

interface Celebracao extends AtividadesFluxoResumo {
  streak: number;
}

const FILA_MEDIDOR_MAX = 6;

/** Reforço positivo crescente ao encher a fila — some depois de 6, sem mais nada a comemorar. */
function mensagemFila(n: number): string | null {
  if (n === 2) return 'Isso mesmo, coloque mais atividades!';
  if (n === 3) return 'Isso aí! Continue assim!';
  if (n === 4) return 'Incrível, você é bem produtivo!';
  if (n === 5) return 'Wow! Você vai fazer isso tudo?';
  if (n >= 6) return 'Que incrível!';
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
        disabled={feita || modoEdicao || busy || bloqueada}
        onClick={onToggleFila}
        title={
          feita
            ? 'Concluída hoje'
            : bloqueada
              ? 'Não agendada para hoje'
              : naFila
                ? 'Remover da fila'
                : 'Adicionar à fila'
        }
      >
        <span className="atividade-item__icon" aria-hidden>
          {feita ? <Check size={16} /> : <Icon size={16} />}
        </span>
        <span className="atividade-item__text">
          <strong>{atividade.nome}</strong>
          <small>{feita ? 'Concluída hoje' : meta}</small>
        </span>
        {!modoEdicao && !feita && !bloqueada && (
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
 * reordenar), a fila do dia e o fluxo sequencial de conclusão. A lógica de
 * negócio do fluxo em si (fila pendente, conclusão passo a passo) vem de
 * `useAtividadesFlow`, reaproveitada também no encadeamento pós-treino do
 * PlayerPage.
 *
 * Regra: em dia de descanso as atividades dão XP e sustentam a streak a
 * partir de `ATIVIDADES_MIN_DESCANSO`; em dia de treino elas só ficam
 * registradas (quem paga o dia é o treino).
 */
export function AtividadesCard() {
  const { user, stats, refresh } = useApp();
  const { applyUser } = useAuth();
  const flow = useAtividadesFlow();

  const [busy, setBusy] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [editando, setEditando] = useState<AtividadeExtra | 'nova' | null>(null);
  const [mostrarAgenda, setMostrarAgenda] = useState(false);
  const [celebracao, setCelebracao] = useState<Celebracao | null>(null);

  const {
    atividades,
    fila,
    hojeNaAgenda,
    diaDeTreino,
    concluidasHoje,
    filaPendente,
    avulsa,
    atividadeDoPasso,
    passoFila,
    totalFluxo,
  } = flow;

  const efeitoId = resolveCosmeticos(user?.cosmeticos, user?.gamificacao.nivel_xp).efeito_equipado;
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
    if (concluidasHoje.has(atividade.nome) || !hojeNaAgenda) return;
    playClick();
    const naFila = fila.includes(atividade.id);
    void salvarFila(naFila ? fila.filter((id) => id !== atividade.id) : [...fila, atividade.id]);
  };

  /* ---------------- fluxo de conclusão ---------------- */

  const handleFluxoConcluido = (resumo: AtividadesFluxoResumo) => {
    if (resumo.total === 0) return;
    setCelebracao({ ...resumo, streak: stats?.streak_atual ?? 0 });
  };

  const cancelarFluxo = () => {
    const resumo = flow.fecharFluxo();
    if (resumo.total > 0) {
      showGameToast(
        `${resumo.total} atividade(s) concluída(s). Faltam ${filaPendente.length}.`,
        { variant: 'success' },
      );
    }
  };

  const cancelarAvulsa = () => {
    const resumo = flow.fecharFluxo();
    if (resumo.total > 0) {
      showGameToast(`${resumo.total} atividade(s) concluída(s).`, { variant: 'success' });
    }
  };

  /* ---------------- render ---------------- */

  const progressoDescanso = concluidasHoje.size;
  const metaBatida = progressoDescanso >= ATIVIDADES_MIN_DESCANSO;

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
            ? `Dia de descanso: conclua ${ATIVIDADES_MIN_DESCANSO} atividades pra ganhar XP e manter sua sequência.`
            : 'Atividades não agendadas para hoje — toque no calendário acima pra ajustar os dias.'}
      </p>

      {!diaDeTreino && hojeNaAgenda && (
        <div className="atividades-progresso" role="status">
          <div className="atividades-progresso__barra">
            <motion.span
              className="atividades-progresso__fill"
              animate={{
                width: `${Math.min(100, (progressoDescanso / ATIVIDADES_MIN_DESCANSO) * 100)}%`,
              }}
            />
          </div>
          <span className={`atividades-progresso__label${metaBatida ? ' is-done' : ''}`}>
            {metaBatida ? 'Meta do dia batida!' : `${progressoDescanso}/${ATIVIDADES_MIN_DESCANSO}`}
          </span>
        </div>
      )}

      {filaPendente.length > 0 && !modoEdicao && hojeNaAgenda && (
        <div className="atividades-fila-cta mt-3">
          <motion.div
            key={Math.min(filaPendente.length, FILA_MEDIDOR_MAX)}
            className={`atividades-fila-medidor atividades-fila-medidor--tier-${Math.min(filaPendente.length, FILA_MEDIDOR_MAX)}`}
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            {Array.from({ length: FILA_MEDIDOR_MAX }).map((_, i) => (
              <span
                key={i}
                className={`atividades-fila-medidor__pip${i < filaPendente.length ? ' is-filled' : ''}`}
              />
            ))}
          </motion.div>

          {mensagemFila(filaPendente.length) && (
            <motion.p
              key={filaPendente.length}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="atividades-fila-mensagem"
            >
              <Sparkles size={12} aria-hidden /> {mensagemFila(filaPendente.length)}
            </motion.p>
          )}

          <GameButton
            className="mt-2 flex w-full items-center justify-center gap-2"
            disabled={busy}
            onClick={() => {
              playClick();
              flow.iniciarFluxo();
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

      {atividadeDoPasso && (
        <AtividadeCompleteModal
          atividade={atividadeDoPasso}
          busy={flow.busy}
          passo={(passoFila ?? 0) + 1}
          totalPassos={totalFluxo}
          daXp={!diaDeTreino}
          onCancel={cancelarFluxo}
          onConfirm={(dados) => void flow.concluirPassoFila(dados, handleFluxoConcluido)}
        />
      )}

      {avulsa && (
        <AtividadeCompleteModal
          atividade={avulsa}
          busy={flow.busy}
          daXp={!diaDeTreino}
          onCancel={cancelarAvulsa}
          onConfirm={(dados) => void flow.concluirAvulsa(dados, handleFluxoConcluido)}
        />
      )}

      {celebracao && (
        <AtividadesCelebration
          totalConcluidas={celebracao.total}
          xpGanho={celebracao.xp}
          moedasGanhas={celebracao.moedas}
          streakAtual={celebracao.streak}
          efeitoId={efeitoId}
          onClose={() => setCelebracao(null)}
        />
      )}
    </section>
  );
}
