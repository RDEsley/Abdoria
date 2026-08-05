import { useMemo, useState } from 'react';
import { Check, MessageSquareText, NotebookPen, Pencil } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { updateAtividadeHistorico } from '@/lib/api';
import { formatMetricas } from '@/lib/atividade-format';
import {
  ATIVIDADE_OBS_MAX,
  camposParaAtividade,
  type AtividadeExtra,
  type AtividadeLog,
} from '@shared/atividades';

/** O log guarda só o que aconteceu; `camposParaAtividade` espera a atividade
    do catálogo. Como ela pode ter sido excluída/editada depois, reconstrói o
    mínimo a partir do próprio log — o que importa aqui é o `tipo`, que decide
    quais campos existem. */
function atividadeDoLog(log: AtividadeLog): AtividadeExtra {
  return {
    id: log.atividade_id,
    nome: log.nome,
    icon: log.icon,
    tipo: log.tipo,
    meta_tipo: 'tempo',
    meta_valor: 0,
  } as AtividadeExtra;
}

/**
 * Mostra (e deixa completar) os dados de uma atividade já registrada.
 *
 * Concluir uma atividade não exige preencher nada — quem só quer marcar que
 * fez registra na hora e volta aqui depois, se quiser. Editar nunca mexe em
 * XP/Coins/streak: só no conteúdo do registro.
 */
export function AtividadeHistoricoEditor({
  historicoId,
  atividade,
  onSaved,
}: {
  historicoId: string;
  atividade: AtividadeLog;
  onSaved?: (atualizada: AtividadeLog) => void;
}) {
  const [log, setLog] = useState(atividade);
  const [editando, setEditando] = useState(false);
  const [busy, setBusy] = useState(false);

  const campos = useMemo(() => camposParaAtividade(atividadeDoLog(log)), [log]);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(atividade.metricas ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [obs, setObs] = useState(atividade.obs ?? '');

  const detalhe = formatMetricas(log.metricas);
  const vazia = !detalhe && !log.obs;

  const salvar = async () => {
    setBusy(true);
    try {
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

      const res = await updateAtividadeHistorico(historicoId, {
        metricas,
        obs: obs.trim() || undefined,
      });
      setLog(res.atividade);
      setEditando(false);
      onSaved?.(res.atividade);
      showGameToast('Atividade atualizada.', { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar a atividade.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!editando) {
    return (
      <div className="rounded-xl border-2 border-stone-100 bg-stone-50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-extrabold text-stone-700">
          <NotebookPen size={14} aria-hidden /> {log.nome}
        </p>

        {vazia ? (
          <p className="mt-1 text-xs font-semibold text-stone-500">
            Concluída sem dados registrados.
          </p>
        ) : (
          <>
            {detalhe && <p className="mt-1 text-xs font-bold text-stone-600">{detalhe}</p>}
            {log.obs && (
              <p className="mt-1 text-xs font-medium text-stone-500 italic">“{log.obs}”</p>
            )}
          </>
        )}

        <button
          type="button"
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-extrabold text-emerald-700 hover:text-emerald-800"
          onClick={() => setEditando(true)}
        >
          <Pencil size={12} aria-hidden /> {vazia ? 'Preencher os dados' : 'Editar dados'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-3">
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-stone-700">
        <NotebookPen size={14} aria-hidden /> {log.nome}
      </p>

      <div className="mt-2 flex flex-col gap-3 text-left">
        {campos.map((campo) => (
          <label key={campo.id} className="block text-sm font-semibold">
            {campo.label}
            <span className={`atividade-campo${campo.unidade ? '' : ' atividade-campo--texto'}`}>
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

      <div className="mt-3 flex gap-2">
        <GameButton
          variant="secondary"
          className="!w-auto flex-1"
          disabled={busy}
          onClick={() => setEditando(false)}
        >
          Cancelar
        </GameButton>
        <GameButton
          className="!w-auto flex-1 flex items-center justify-center gap-1.5"
          disabled={busy}
          onClick={() => void salvar()}
        >
          <Check size={14} aria-hidden /> {busy ? 'Salvando...' : 'Salvar'}
        </GameButton>
      </div>
    </div>
  );
}
