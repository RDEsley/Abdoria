import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareText, Sparkles, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { AtividadeSavingOverlay } from './AtividadeSavingOverlay';
import {
  ATIVIDADE_COINS_EXTRA,
  ATIVIDADE_OBS_MAX,
  camposParaAtividade,
  type AtividadeCampo,
  type AtividadeExtra,
} from '@shared/atividades';

export interface AtividadeConclusao {
  metricas: Record<string, number | string>;
  obs?: string;
}

/** Sugestões rápidas (toque, sem abrir teclado) pra campos numéricos, a
    partir do valor-referência do placeholder — metade / referência / uma vez
    e meia. Campos de texto não ganham chip (não dá pra sugerir um "livro"). */
function chipsDoCampo(campo: AtividadeCampo): string[] {
  if (campo.formato === 'texto') return [];
  const base = Number(campo.placeholder);
  if (!Number.isFinite(base) || base <= 0) return [];
  const arredonda = (v: number) =>
    campo.formato === 'decimal' ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
  const valores = [arredonda(base * 0.5), arredonda(base), arredonda(base * 1.5)];
  return [...new Set(valores)].map(String);
}

/**
 * Formulário contextual de conclusão: pergunta o que faz sentido pro tipo da
 * atividade (páginas lidas, km corridos, matéria estudada...) + observações.
 * Tudo vai pro histórico e aparece no calendário.
 */
export function AtividadeCompleteModal({
  atividade,
  busy,
  passo,
  totalPassos,
  diaDeTreino,
  progressoHoje,
  metaHoje,
  cancelLabel = 'Agora não',
  onCancel,
  onConfirm,
}: {
  atividade: AtividadeExtra;
  busy: boolean;
  /** Posição na fila (1-based) — omitido fora do fluxo sequencial. */
  passo?: number;
  totalPassos?: number;
  /** true = hoje é dia de treino agendado — só muda a mensagem sobre
      sequência (streak); XP vale em qualquer dia, até o teto diário. */
  diaDeTreino: boolean;
  /** Quantas atividades já concluídas hoje — junto de `metaHoje`, mostra o
      progresso rumo ao teto diário de XP por atividades. */
  progressoHoje?: number;
  metaHoje?: number;
  /** Some fluxos abortam tudo ao cancelar (ex.: "Fazer mais tarde" no
      encadeamento pós-treino); outros só voltam pra lista de escolha. */
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: (dados: AtividadeConclusao) => void;
}) {
  const campos = useMemo(() => camposParaAtividade(atividade), [atividade]);
  // Vazio de propósito: só o placeholder sugere um valor (ex.: a meta da
  // atividade) — nunca um número já preenchido que pareça resposta pronta.
  const [valores, setValores] = useState<Record<string, string>>({});
  const [obs, setObs] = useState('');

  const Icon = ACHIEVEMENT_ICON_COMPONENTS[atividade.icon];

  const confirmar = () => {
    const metricas: Record<string, number | string> = {};
    for (const campo of campos) {
      const bruto = valores[campo.id]?.trim();
      if (!bruto) continue;
      if (campo.formato === 'texto') {
        metricas[campo.id] = bruto.slice(0, 60);
        continue;
      }
      const numero = Number(bruto.replace(',', '.'));
      if (Number.isFinite(numero) && numero > 0) metricas[campo.id] = numero;
    }

    onConfirm({ metricas, obs: obs.trim() || undefined });
  };

  const temDados = Object.values(valores).some((v) => v.trim()) || obs.trim().length > 0;

  const ganhaXp = metaHoje == null || progressoHoje == null || progressoHoje < metaHoje;
  const ganhaStreak = !diaDeTreino;
  const hint = ganhaXp
    ? ganhaStreak
      ? 'Marque como concluída só depois de fazer de verdade — vale XP e ajuda a manter sua sequência.'
      : 'Hoje é dia de treino: a sequência vem só do treino, mas esta atividade ainda te dá XP.'
    : ganhaStreak
      ? `Teto de XP do dia já batido — esta te dá +${ATIVIDADE_COINS_EXTRA} Coins e ainda ajuda sua sequência.`
      : `Teto de XP do dia já batido — esta te dá +${ATIVIDADE_COINS_EXTRA} Coins (hoje é dia de treino, não mexe na sequência).`;

  return (
    <Modal
      open
      onClose={onCancel}
      labelledBy="atividade-complete-title"
      panelClassName="atividade-complete-modal"
    >
      <AnimatePresence>
        {busy && <AtividadeSavingOverlay nome={atividade.nome} Icon={Icon} />}
      </AnimatePresence>

      <div className="text-center">
        {passo != null && totalPassos != null && totalPassos > 1 && (
          <p className="mb-2 text-[0.68rem] font-extrabold tracking-wide text-emerald-600 uppercase">
            Atividade {passo} de {totalPassos}
          </p>
        )}
        <motion.span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600"
          initial={{ scale: 0.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          aria-hidden
        >
          <Icon size={26} />
        </motion.span>
        <h2 id="atividade-complete-title" className="mt-3 text-lg font-extrabold text-stone-900">
          {atividade.nome}
        </h2>
        {atividade.descricao && (
          <p className="mt-1 text-sm font-medium text-stone-500">{atividade.descricao}</p>
        )}
        {metaHoje != null && progressoHoje != null && (
          <p
            className={`atividade-progresso-dia${progressoHoje >= metaHoje ? ' is-done' : ''}`}
          >
            {progressoHoje >= metaHoje
              ? `Teto de XP do dia já batido — essa dá +${ATIVIDADE_COINS_EXTRA} Coins de bônus!`
              : `${progressoHoje}/${metaHoje} com XP hoje · falta${
                  metaHoje - progressoHoje === 1 ? '' : 'm'
                } ${metaHoje - progressoHoje} pra completar o teto`}
          </p>
        )}
      </div>

      <p className="atividade-complete-hint">
        Tudo abaixo é opcional — pode concluir direto e preencher depois, editando no histórico.
      </p>

      <div className="mt-3 flex flex-col gap-4 text-left">
        {campos.map((campo) => {
          const chips = chipsDoCampo(campo);
          const valorAtual = valores[campo.id] ?? '';
          return (
            <label key={campo.id} className="block text-sm font-semibold">
              {campo.label}
              <span className={`atividade-campo${campo.unidade ? '' : ' atividade-campo--texto'}`}>
                <input
                  value={valorAtual}
                  onChange={(e) => setValores((v) => ({ ...v, [campo.id]: e.target.value }))}
                  inputMode={campo.formato === 'texto' ? 'text' : 'decimal'}
                  placeholder={campo.placeholder}
                  maxLength={campo.formato === 'texto' ? 60 : 6}
                />
                {campo.unidade && <span className="atividade-campo__unidade">{campo.unidade}</span>}
              </span>
              {chips.length > 0 && (
                <span className="atividade-campo-chips" role="group" aria-label={`Sugestões para ${campo.label}`}>
                  {chips.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      className={`atividade-campo-chip${valorAtual === valor ? ' is-active' : ''}`}
                      onClick={(e) => {
                        // Sem isso, o clique borbulha pro <label> e o navegador foca o
                        // <input> associado por padrão — abrindo o teclado numérico
                        // mesmo assim, exatamente o que o chip existe pra evitar.
                        e.preventDefault();
                        setValores((v) => ({ ...v, [campo.id]: valor }));
                      }}
                    >
                      {valor}
                      {campo.unidade ? ` ${campo.unidade}` : ''}
                    </button>
                  ))}
                </span>
              )}
            </label>
          );
        })}

        <label className="block text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <MessageSquareText size={13} aria-hidden /> Observações
          </span>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value.slice(0, ATIVIDADE_OBS_MAX))}
            rows={2}
            placeholder="Como foi? Algo que queira lembrar depois..."
            className="mt-1 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <p className="mt-3 rounded-xl border-2 border-sky-100 bg-sky-50 p-2.5 text-[0.68rem] font-semibold text-sky-800">
        <Sparkles size={11} className="mr-1 inline" aria-hidden />
        {hint}
      </p>

      <GameButton
        className="mt-4 flex w-full items-center justify-center"
        disabled={busy}
        onClick={confirmar}
      >
        {busy ? 'Salvando...' : temDados ? 'Concluir atividade' : 'Concluir agora'}
      </GameButton>

      {/* Atalho pra quem só quer registrar que fez: pula os campos e salva
          sem métrica nenhuma. Aparece só quando há algo digitado — sem nada
          preenchido o botão principal já faz exatamente isso. */}
      {temDados && (
        <button
          type="button"
          className="atividade-complete-skip"
          disabled={busy}
          onClick={() => onConfirm({ metricas: {} })}
        >
          <Zap size={13} aria-hidden /> Concluir sem registrar os dados
        </button>
      )}

      <button
        type="button"
        className="mt-3 block w-full cursor-pointer text-center text-xs font-bold text-stone-500 hover:text-stone-700"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
    </Modal>
  );
}
