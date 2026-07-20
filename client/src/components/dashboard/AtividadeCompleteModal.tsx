import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareText, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import {
  ATIVIDADE_OBS_MAX,
  camposParaAtividade,
  type AtividadeExtra,
} from '@shared/atividades';

export interface AtividadeConclusao {
  metricas: Record<string, number | string>;
  obs?: string;
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
  daXp,
  onCancel,
  onConfirm,
}: {
  atividade: AtividadeExtra;
  busy: boolean;
  /** Posição na fila (1-based) — omitido fora do fluxo sequencial. */
  passo?: number;
  totalPassos?: number;
  /** false = dia de treino, então a atividade não paga XP. */
  daXp: boolean;
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
    const faltando = campos.find((campo) => campo.obrigatorio && !valores[campo.id]?.trim());
    if (faltando) {
      showGameToast(`Preencha: ${faltando.label}`, { variant: 'warn' });
      return;
    }

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

  return (
    <Modal open onClose={onCancel} labelledBy="atividade-complete-title">
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
      </div>

      <div className="mt-4 flex flex-col gap-3 text-left">
        {campos.map((campo) => (
          <label key={campo.id} className="block text-sm font-semibold">
            {campo.label}
            {!campo.obrigatorio && (
              <span className="ml-1 text-[0.68rem] font-medium text-stone-400">(opcional)</span>
            )}
            <span className="atividade-campo">
              <input
                value={valores[campo.id] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [campo.id]: e.target.value }))}
                inputMode={campo.formato === 'texto' ? 'text' : 'decimal'}
                placeholder={campo.placeholder}
                maxLength={campo.formato === 'texto' ? 60 : 6}
              />
              {campo.unidade && <span className="atividade-campo__unidade">{campo.unidade}</span>}
            </span>
          </label>
        ))}

        <label className="block text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <MessageSquareText size={13} aria-hidden /> Observações
            <span className="text-[0.68rem] font-medium text-stone-400">(opcional)</span>
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
        {daXp
          ? 'Marque como concluída só depois de fazer de verdade — o combinado é com você mesmo.'
          : 'Hoje é dia de treino: esta atividade não dá XP nem mexe na streak, mas fica registrada e pode liberar conquistas.'}
      </p>

      <GameButton
        className="mt-4 flex w-full items-center justify-center"
        disabled={busy}
        onClick={confirmar}
      >
        {busy ? 'Salvando...' : 'Concluir atividade'}
      </GameButton>
      <button
        type="button"
        className="mt-3 block w-full cursor-pointer text-center text-xs font-bold text-stone-500 hover:text-stone-700"
        onClick={onCancel}
      >
        Agora não
      </button>
    </Modal>
  );
}
