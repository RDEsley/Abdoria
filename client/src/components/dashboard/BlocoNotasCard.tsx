import { useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, History, NotebookPen, Plus, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { usePreferencesPersist } from '@/hooks/usePreferencesPersist';
import { grantLembreteXp } from '@/lib/api/users';
import { emitXpEarned } from '@/lib/xp-orbs';
import { playClick, playSuccess } from '@/lib/sounds';
import {
  BLOCO_NOTAS_HISTORICO_DIAS,
  BLOCO_NOTAS_LIMITE_MSG,
  BLOCO_NOTAS_MAX,
  NOTA_TEXTO_MAX,
  ordenarNotas,
  resolveBlocoNotas,
  resolveBlocoNotasHistorico,
  sanitizeBlocoNotasHistorico,
  type NotaItem,
} from '@shared/bloco-notas';

function formatDiaBR(dia: string): string {
  return dia.split('-').reverse().join('/');
}

/** Pequeno burst de partículas ao concluir um item — só a flourish decorativa,
    a marcação em si (check, risco, reordenar) funciona igual com "Celebrações"
    desligado. */
function NotaBurst() {
  const particulas = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
  return (
    <span className="nota-burst" aria-hidden>
      {particulas.map((i) => {
        const angulo = (i / particulas.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="nota-burst__spark"
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 1,
              x: Math.cos(angulo) * 20,
              y: Math.sin(angulo) * 20,
            }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        );
      })}
    </span>
  );
}

/**
 * Lembretes (ex-"Bloco de Notas") — lista de tarefas livre dentro da seção
 * Atividades: não é sobre bem-estar, é pra qualquer coisa que o jogador
 * queira anotar (afazeres, lista de compras, lembretes...). Concluir dá um
 * empurrãozinho de dopamina (som + partículas + risco animado) e o item
 * desce pro fim da lista — igual a qualquer app de tarefas que vicia de
 * usar. Nunca sustenta streak; dá XP fixo (silencioso, sem toast) por item.
 */
export function BlocoNotasCard() {
  const { user, persist, applyServerUser } = usePreferencesPersist();
  const [novoTexto, setNovoTexto] = useState('');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [confirmarLimparTudo, setConfirmarLimparTudo] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  // useId (não Date.now/Math.random) — id estável e puro pra cada item novo,
  // um contador por instância do componente garante que não repete.
  const idPrefix = useId();
  const novoIdSeqRef = useRef(0);

  const minimal = Boolean(useReducedMotion());
  const notas = ordenarNotas(resolveBlocoNotas(user?.preferencias));
  const feitas = notas.filter((n) => n.feita);
  const noLimite = notas.length >= BLOCO_NOTAS_MAX;
  const historico = resolveBlocoNotasHistorico(user?.preferencias);
  const historicoAgrupado = useMemo(() => {
    const grupos = new Map<string, typeof historico>();
    for (const item of historico) {
      const dia = item.concluida_em.slice(0, 10);
      const lista = grupos.get(dia) ?? [];
      lista.push(item);
      grupos.set(dia, lista);
    }
    return [...grupos.entries()];
  }, [historico]);

  const adicionar = () => {
    const texto = novoTexto.trim().slice(0, NOTA_TEXTO_MAX);
    if (!texto) return;
    if (noLimite) {
      showGameToast(BLOCO_NOTAS_LIMITE_MSG, { variant: 'warn' });
      return;
    }
    playClick();
    novoIdSeqRef.current += 1;
    const item: NotaItem = {
      id: `nota${idPrefix}-${novoIdSeqRef.current}`,
      texto,
      feita: false,
      criada_em: new Date().toISOString(),
    };
    persist({ bloco_notas: [item, ...notas] });
    setNovoTexto('');
  };

  const alternarFeita = (nota: NotaItem) => {
    const marcarFeita = !nota.feita;
    if (marcarFeita) {
      playSuccess();
      if (!minimal) {
        setJustCompletedId(nota.id);
        window.setTimeout(() => {
          setJustCompletedId((atual) => (atual === nota.id ? null : atual));
        }, 650);
      }
    } else {
      playClick();
    }
    const agora = new Date().toISOString();
    const atualizado = notas.map((n) =>
      n.id === nota.id
        ? {
            ...n,
            feita: marcarFeita,
            ...(marcarFeita ? { concluida_em: agora } : { concluida_em: undefined }),
          }
        : n,
    );
    const patch: Record<string, unknown> = { bloco_notas: atualizado };
    // Concluir também registra no histórico (30 dias) — sobrevive a excluir
    // o item da lista ativa ou a "Limpar tudo", pra ficar como registro do
    // que o jogador fez, mesmo depois de riscar a lista.
    if (marcarFeita) {
      patch.bloco_notas_historico = sanitizeBlocoNotasHistorico([
        { texto: nota.texto, concluida_em: agora },
        ...historico,
      ]);
    }
    persist(patch);

    // XP silencioso (sem toast) por lembrete concluído — nunca ao desmarcar.
    // Rota própria (não a fila de preferências) porque XP é sempre
    // server-authoritative, com teto diário. `applyServerUser` (não
    // `applyUser`) porque essa resposta carrega as `preferencias` de antes da
    // marcação: aplicá-la crua desmarcava o item que o usuário acabou de
    // riscar.
    if (marcarFeita) {
      void grantLembreteXp()
        .then((res) => {
          applyServerUser(res.user);
          if (res.xp_ganho > 0) emitXpEarned(res.xp_ganho);
        })
        .catch(() => {
          /* XP de lembrete é um bônus discreto — falha silenciosa, sem toast de erro */
        });
    }
  };

  const excluir = (id: string) => {
    persist({ bloco_notas: notas.filter((n) => n.id !== id) });
  };

  const limparConcluidas = () => {
    playClick();
    persist({ bloco_notas: notas.filter((n) => !n.feita) }, 'Concluídas removidas.');
  };

  const limparTudo = () => {
    persist({ bloco_notas: [] }, 'Anotações limpas.');
    setConfirmarLimparTudo(false);
  };

  const apagarHistorico = () => {
    persist({ bloco_notas_historico: [] }, 'Histórico apagado.');
  };

  return (
    <div className="bloco-notas">
      <div className="bloco-notas__resumo-row">
        {notas.length > 0 && (
          <p className="bloco-notas__resumo">
            <strong>{feitas.length}</strong>/{notas.length} concluídas
          </p>
        )}
        <button
          type="button"
          className="bloco-notas__historico-link"
          onClick={() => setMostrarHistorico(true)}
        >
          <History size={12} aria-hidden /> Histórico
        </button>
      </div>

      <div className="bloco-notas__add">
        <input
          value={novoTexto}
          onChange={(e) => setNovoTexto(e.target.value.slice(0, NOTA_TEXTO_MAX))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="O que você quer anotar?"
          maxLength={NOTA_TEXTO_MAX}
          aria-label="Nova anotação"
          className="bloco-notas__input"
        />
        <button
          type="button"
          className="bloco-notas__add-btn"
          aria-label="Adicionar item"
          disabled={!novoTexto.trim()}
          onClick={adicionar}
        >
          <Plus size={18} aria-hidden />
        </button>
      </div>

      {notas.length === 0 ? (
        <div className="bloco-notas__empty">
          <NotebookPen size={26} aria-hidden />
          <p>
            Sua lista está vazia. Use pra tarefas do dia a dia, lista de compras, ideias — o que
            você quiser.
          </p>
        </div>
      ) : (
        <ul className="bloco-notas__list">
          <AnimatePresence initial={false}>
            {notas.map((nota) => (
              <motion.li
                key={nota.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={`bloco-notas__item${nota.feita ? ' bloco-notas__item--feita' : ''}`}
              >
                <button
                  type="button"
                  className="bloco-notas__check"
                  role="checkbox"
                  aria-checked={nota.feita}
                  aria-label={nota.feita ? `Reabrir "${nota.texto}"` : `Concluir "${nota.texto}"`}
                  onClick={() => alternarFeita(nota)}
                >
                  <CheckCircle2 size={20} aria-hidden />
                  {justCompletedId === nota.id && <NotaBurst />}
                </button>

                <span className="bloco-notas__texto">{nota.texto}</span>

                <button
                  type="button"
                  className="bloco-notas__delete"
                  aria-label={`Excluir "${nota.texto}"`}
                  onClick={() => excluir(nota.id)}
                >
                  <X size={14} aria-hidden />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {noLimite && (
        <p className="mt-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-2.5 text-center text-[0.68rem] font-bold text-amber-800">
          {BLOCO_NOTAS_LIMITE_MSG}
        </p>
      )}

      {notas.length > 0 && (
        <div className="bloco-notas__footer">
          {feitas.length > 0 && (
            <GameButton variant="secondary" className="!w-auto flex-1" onClick={limparConcluidas}>
              Limpar concluídas
            </GameButton>
          )}
          <GameButton
            variant="danger"
            className="!w-auto flex-1 flex items-center justify-center gap-1.5"
            onClick={() => setConfirmarLimparTudo(true)}
          >
            <Trash2 size={14} aria-hidden /> Limpar tudo
          </GameButton>
        </div>
      )}

      <Modal
        open={mostrarHistorico}
        onClose={() => setMostrarHistorico(false)}
        labelledBy="bloco-notas-historico-title"
      >
        <h2
          id="bloco-notas-historico-title"
          className="flex items-center gap-2 text-base font-extrabold text-stone-800"
        >
          <History size={16} aria-hidden /> Histórico de concluídas
        </h2>
        <p className="mt-1 text-xs font-semibold text-stone-500">
          Fica guardado por {BLOCO_NOTAS_HISTORICO_DIAS} dias e some sozinho depois disso.
        </p>

        {historico.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm font-bold text-stone-400">
            Nada concluído ainda.
          </p>
        ) : (
          <div className="bloco-notas-historico__scroll mt-3">
            {historicoAgrupado.map(([dia, itens]) => (
              <div key={dia} className="bloco-notas-historico__grupo">
                <p className="bloco-notas-historico__data">{formatDiaBR(dia)}</p>
                <ul>
                  {itens.map((item, i) => (
                    <li key={i} className="bloco-notas-historico__item">
                      <CheckCircle2 size={13} aria-hidden /> {item.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <GameButton
            variant="secondary"
            className="!w-auto flex-1"
            onClick={() => setMostrarHistorico(false)}
          >
            Fechar
          </GameButton>
          {historico.length > 0 && (
            <GameButton variant="danger" className="!w-auto flex-1" onClick={apagarHistorico}>
              Apagar histórico
            </GameButton>
          )}
        </div>
      </Modal>

      <Modal
        open={confirmarLimparTudo}
        onClose={() => setConfirmarLimparTudo(false)}
        labelledBy="bloco-notas-clear-title"
      >
        <h2 id="bloco-notas-clear-title" className="text-base font-extrabold text-stone-800">
          Limpar todas as anotações?
        </h2>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Isso apaga os {notas.length} itens da lista, feitos e pendentes. Não dá pra desfazer.
        </p>
        <div className="mt-4 flex gap-2">
          <GameButton
            variant="secondary"
            className="!w-auto flex-1"
            onClick={() => setConfirmarLimparTudo(false)}
          >
            Cancelar
          </GameButton>
          <GameButton variant="danger" className="!w-auto flex-1" onClick={limparTudo}>
            Limpar tudo
          </GameButton>
        </div>
      </Modal>
    </div>
  );
}
