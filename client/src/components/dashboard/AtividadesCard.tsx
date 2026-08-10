import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ListTodo,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Square,
  SquareCheck,
  Trash2,
  X,
} from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { useAtividadesFlow } from '@/hooks/useAtividadesFlow';
import { usePreferencesPersist } from '@/hooks/usePreferencesPersist';
import { playClick } from '@/lib/sounds';
import { AtividadeFormModal } from './AtividadeFormModal';
import { AtividadesAgendaModal } from './AtividadesAgendaModal';
import { BlocoNotasCard } from './BlocoNotasCard';
import { resolveBlocoNotas } from '@shared/bloco-notas';
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
 * Uma linha da lista: reordenar é por setas ↑/↓ (não drag-and-drop — numa
 * lista dentro de um feed rolável, arraste em touch conflita com o scroll
 * da página; setas são instantâneas e não têm ambiguidade de gesto).
 * Editar/excluir ficam direto no row, visíveis só em modo de edição, sem
 * submenu.
 */
function AtividadeItem({
  atividade,
  feita,
  naFila,
  modoEdicao,
  bloqueada,
  busy,
  selecionado,
  podeSubir,
  podeDescer,
  onToggleFila,
  onEdit,
  onDelete,
  onToggleSelecionado,
  onMoveUp,
  onMoveDown,
}: {
  atividade: AtividadeExtra;
  feita: boolean;
  naFila: boolean;
  modoEdicao: boolean;
  /** Hoje não está nos dias agendados pra atividades — só visualização/CRUD. */
  bloqueada: boolean;
  busy: boolean;
  /** Marcada pra exclusão em lote (só faz sentido com modoEdicao ativo). */
  selecionado: boolean;
  podeSubir: boolean;
  podeDescer: boolean;
  onToggleFila: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSelecionado: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const Icon = ACHIEVEMENT_ICON_COMPONENTS[atividade.icon];
  const meta =
    atividade.meta_tipo === 'tempo'
      ? `${atividade.meta_valor} min`
      : `${atividade.meta_valor} ${atividade.meta_unidade ?? ''}`.trim();

  return (
    <li
      className={`atividade-item${feita ? ' atividade-item--feita' : ''}${naFila ? ' atividade-item--fila' : ''}${selecionado ? ' atividade-item--selecionada' : ''}`}
    >
      {modoEdicao ? (
        <button
          type="button"
          className="atividade-item__select"
          aria-label={selecionado ? `Desmarcar ${atividade.nome}` : `Selecionar ${atividade.nome}`}
          aria-pressed={selecionado}
          onClick={onToggleSelecionado}
        >
          {selecionado ? <SquareCheck size={18} aria-hidden /> : <Square size={18} aria-hidden />}
        </button>
      ) : (
        <span className="atividade-item__reorder">
          <button
            type="button"
            className="atividade-item__reorder-btn"
            aria-label={`Mover ${atividade.nome} para cima`}
            disabled={!podeSubir}
            onClick={onMoveUp}
          >
            <ChevronUp size={13} aria-hidden />
          </button>
          <button
            type="button"
            className="atividade-item__reorder-btn"
            aria-label={`Mover ${atividade.nome} para baixo`}
            disabled={!podeDescer}
            onClick={onMoveDown}
          >
            <ChevronDown size={13} aria-hidden />
          </button>
        </span>
      )}

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
  const { user, persist } = usePreferencesPersist();
  const navigate = useNavigate();
  const flow = useAtividadesFlow();

  const [modoEdicao, setModoEdicao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<AtividadeExtra | 'nova' | null>(null);
  const [mostrarAgenda, setMostrarAgenda] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Alternância Atividades ↔ Bloco de Notas — persistente (não volta sozinha
  // pro modo Atividades). Hidrata uma vez quando `user` chega (pode ainda
  // estar null no primeiro render).
  const [modo, setModo] = useState<'atividades' | 'notas'>(() =>
    user?.preferencias?.atividades_modo_notas ? 'notas' : 'atividades',
  );
  const modoHidratadoRef = useRef(false);
  useEffect(() => {
    if (modoHidratadoRef.current || !user) return;
    modoHidratadoRef.current = true;
    setModo(user.preferencias?.atividades_modo_notas ? 'notas' : 'atividades');
  }, [user]);

  const alternarModo = () => {
    playClick();
    const proximo = modo === 'atividades' ? 'notas' : 'atividades';
    setModo(proximo);
    persist({ atividades_modo_notas: proximo === 'notas' });
  };

  // Badge no botão de alternar — visível só em modo Atividades, avisando que
  // há itens pendentes esperando no Bloco de Notas do outro lado.
  const notasPendentes = resolveBlocoNotas(user?.preferencias).filter((n) => !n.feita).length;

  const { atividades, fila, hojeNaAgenda, diaDeTreino, concluidasHoje, filaPendente } = flow;

  const noLimite = atividades.length >= ATIVIDADES_MAX;

  // Conta só as que ainda existem na lista do usuário — `concluidasHoje` é
  // indexado por nome e guarda o histórico do dia inteiro, então incluiria
  // atividades já excluídas e o total passaria do denominador.
  const feitasHoje = atividades.filter((a) => concluidasHoje.has(a.nome)).length;

  // Particionamento estável: preserva a ordem personalizada dentro de cada
  // grupo, mas mantém as pendentes sempre acima das já concluídas no dia.
  const atividadesOrdenadas = useMemo(() => {
    const pendentes: AtividadeExtra[] = [];
    const concluidas: AtividadeExtra[] = [];
    for (const atividade of atividades) {
      (concluidasHoje.has(atividade.nome) ? concluidas : pendentes).push(atividade);
    }
    return [...pendentes, ...concluidas];
  }, [atividades, concluidasHoje]);

  const sairDoModoEdicao = () => {
    setModoEdicao(false);
    setSelecionados(new Set());
  };

  // Clique fora da seção desativa o modo editar sozinho — antes só saía
  // clicando de novo no botão ou trocando de página. Os modais de
  // criar/editar atividade e de agenda são portais pro <body> (fora da
  // subárvore desta seção), então ficam ignorados enquanto abertos: sem essa
  // guarda, abrir "Criar atividade" em modo edição desativaria o modo sozinho.
  useEffect(() => {
    if (!modoEdicao) return;
    if (editando || mostrarAgenda) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!sectionRef.current) return;
      if (sectionRef.current.contains(event.target as Node)) return;
      sairDoModoEdicao();
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [modoEdicao, editando, mostrarAgenda]);

  /* ------------- persistência otimista (CRUD da lista + fila) ------------- */

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
    salvarLista(lista, existe ? 'Atividade atualizada.' : 'Atividade criada!');
    setEditando(null);
  };

  const excluir = (id: string) => {
    // Lista + fila saem no MESMO patch: uma request só, sem travar a tela.
    const patch: Record<string, unknown> = { atividades: atividades.filter((a) => a.id !== id) };
    if (fila.includes(id)) {
      patch.atividades_fila = { data: getTodaySaoPaulo(), ids: fila.filter((f) => f !== id) };
    }
    persist(patch, 'Atividade removida.');
    setSelecionados((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const excluirSelecionados = () => {
    if (selecionados.size === 0) return;
    const patch: Record<string, unknown> = {
      atividades: atividades.filter((a) => !selecionados.has(a.id)),
    };
    const filaSemSelecionadas = fila.filter((id) => !selecionados.has(id));
    if (filaSemSelecionadas.length !== fila.length) {
      patch.atividades_fila = { data: getTodaySaoPaulo(), ids: filaSemSelecionadas };
    }
    persist(
      patch,
      selecionados.size === 1 ? 'Atividade removida.' : `${selecionados.size} atividades removidas.`,
    );
    setSelecionados(new Set());
  };

  /** Move uma posição pra cima/baixo — clique é instantâneo, sem ambiguidade de gesto. */
  const moverAtividade = (id: string, direcao: 'cima' | 'baixo') => {
    const index = atividadesOrdenadas.findIndex((a) => a.id === id);
    if (index === -1) return;
    const alvo = direcao === 'cima' ? index - 1 : index + 1;
    if (alvo < 0 || alvo >= atividadesOrdenadas.length) return;
    const atividadeAlvo = atividadesOrdenadas[alvo];
    const atividadeAtual = atividadesOrdenadas[index];
    if (concluidasHoje.has(atividadeAtual.nome) !== concluidasHoje.has(atividadeAlvo.nome)) {
      return;
    }

    const indicePersistido = atividades.findIndex((a) => a.id === atividadeAtual.id);
    const alvoPersistido = atividades.findIndex((a) => a.id === atividadeAlvo.id);
    if (indicePersistido === -1 || alvoPersistido === -1) return;
    const lista = [...atividades];
    [lista[indicePersistido], lista[alvoPersistido]] = [
      lista[alvoPersistido],
      lista[indicePersistido],
    ];
    salvarLista(lista);
  };

  const resetar = () => {
    salvarLista(
      ATIVIDADES_CATALOGO.map((a) => ({ ...a })),
      'Atividades restauradas para o padrão.',
    );
    sairDoModoEdicao();
  };

  /* ---------------- fila ---------------- */

  const alternarFila = (atividade: AtividadeExtra) => {
    // Concluída hoje não trava mais a atividade — o usuário pode enfileirar
    // de novo pra repetir (ex.: outra sessão de leitura no mesmo dia).
    if (!hojeNaAgenda) return;
    playClick();
    const naFila = fila.includes(atividade.id);
    salvarFila(naFila ? fila.filter((id) => id !== atividade.id) : [...fila, atividade.id]);
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
    <section ref={sectionRef} className="glass-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="game-section-title !mb-0 flex items-center gap-2 leading-none">
          <span className="atividades-mode-toggle-wrap">
            <button
              type="button"
              className={`atividades-mode-toggle${modo === 'notas' ? ' atividades-mode-toggle--notas' : ''}`}
              aria-pressed={modo === 'notas'}
              aria-label={modo === 'notas' ? 'Ver Atividades' : 'Ver Lembretes'}
              title={modo === 'notas' ? 'Ver Atividades' : 'Ver Lembretes'}
              onClick={alternarModo}
            >
              {modo === 'notas' ? (
                <ListTodo size={15} aria-hidden />
              ) : (
                <NotebookPen size={15} aria-hidden />
              )}
            </button>
            {modo === 'atividades' && notasPendentes > 0 && (
              <span className="atividades-mode-toggle__badge" aria-hidden>
                {notasPendentes > 9 ? '9+' : notasPendentes}
              </span>
            )}
          </span>
          {modo === 'notas' ? 'Lembretes' : 'Atividades'}
        </h3>
        {modo === 'atividades' && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={`atividade-action-btn${modoEdicao ? ' atividade-action-btn--active' : ' atividade-action-btn--editar'}`}
            aria-label={modoEdicao ? 'Concluir edição da lista' : 'Editar lista de atividades'}
            aria-pressed={modoEdicao}
            title={modoEdicao ? 'Concluir edição' : 'Editar lista'}
            onClick={() => {
              playClick();
              if (modoEdicao) sairDoModoEdicao();
              else setModoEdicao(true);
            }}
          >
            <span className="atividade-action-btn__icon" aria-hidden>
              {modoEdicao ? <Check size={13} /> : <Pencil size={13} />}
            </span>
            {modoEdicao ? 'Concluir' : 'Editar'}
          </button>
          <button
            type="button"
            className="atividade-action-btn atividade-action-btn--agenda"
            aria-label="Configurações de atividades"
            title="Configurações de atividades"
            onClick={() => setMostrarAgenda(true)}
          >
            <span className="atividade-action-btn__icon" aria-hidden>
              <Settings size={13} />
            </span>
            Config
          </button>
        </div>
        )}
      </div>

      <div className="atividades-flip-viewport">
        <AnimatePresence mode="wait" initial={false}>
          {modo === 'notas' ? (
            <motion.div
              key="notas"
              className="atividades-flip-panel"
              initial={{ rotateY: -100, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 100, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.15, 0.64, 1] }}
            >
              <BlocoNotasCard />
            </motion.div>
          ) : (
            <motion.div
              key="atividades"
              className="atividades-flip-panel"
              initial={{ rotateY: -100, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 100, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.15, 0.64, 1] }}
            >
      {atividades.length > 0 && (
        <p className="atividades-resumo">
          <strong>{feitasHoje}</strong>/{atividades.length} concluídas hoje
        </p>
      )}

      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
        {diaDeTreino ? (
          <>
            <Dumbbell size={12} aria-hidden /> Dia de treino — o treino ou qualquer Atividade
            concluída mantêm sua sequência
          </>
        ) : hojeNaAgenda ? (
          <>
            <Sparkles size={12} aria-hidden /> Escolha, crie ou edite Atividades
          </>
        ) : (
          <>
            <CalendarClock size={12} aria-hidden /> Não agendadas hoje — ajuste no calendário acima
          </>
        )}
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
            onClick={() => {
              playClick();
              navigate('/atividades-player');
            }}
          >
            Iniciar {filaPendente.length} atividade{filaPendente.length === 1 ? '' : 's'}
          </GameButton>
        </div>
      )}

      <ul className="atividades-lista">
        {atividadesOrdenadas.map((atividade, index) => {
          const feita = concluidasHoje.has(atividade.nome);
          const anterior = atividadesOrdenadas[index - 1];
          const proxima = atividadesOrdenadas[index + 1];
          return (
            <AtividadeItem
              key={atividade.id}
              atividade={atividade}
              feita={feita}
              naFila={fila.includes(atividade.id)}
              modoEdicao={modoEdicao}
              bloqueada={!hojeNaAgenda}
              busy={false}
              selecionado={selecionados.has(atividade.id)}
              podeSubir={Boolean(anterior) && concluidasHoje.has(anterior.nome) === feita}
              podeDescer={Boolean(proxima) && concluidasHoje.has(proxima.nome) === feita}
              onToggleFila={() => alternarFila(atividade)}
              onEdit={() => setEditando(atividade)}
              onDelete={() => excluir(atividade.id)}
              onToggleSelecionado={() => toggleSelecionado(atividade.id)}
              onMoveUp={() => moverAtividade(atividade.id, 'cima')}
              onMoveDown={() => moverAtividade(atividade.id, 'baixo')}
            />
          );
        })}
      </ul>

      {modoEdicao && selecionados.size > 0 && (
        <GameButton
          variant="danger"
          className="mt-2 flex w-full items-center justify-center gap-2"
          onClick={excluirSelecionados}
        >
          <Trash2 size={15} aria-hidden /> Excluir {selecionados.size} selecionada
          {selecionados.size === 1 ? '' : 's'}
        </GameButton>
      )}
      {modoEdicao && selecionados.size === 0 && (
        <p className="mt-2 text-[0.65rem] font-semibold text-stone-400">
          Toque nos quadrados para selecionar e excluir em lote.
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
          onClick={() => setEditando('nova')}
        >
          <Plus size={16} aria-hidden /> Criar atividade
        </GameButton>
      )}

      {modoEdicao && (
        <GameButton
          variant="ghost"
          className="mt-2 flex w-full items-center justify-center gap-2"
          onClick={resetar}
        >
          <RotateCcw size={15} aria-hidden /> Restaurar atividades padrão
        </GameButton>
      )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
