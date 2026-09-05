import { useEffect, useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { getNutritionStats, getWeightLogs, saveWeightLog } from '@/lib/api/nutrition';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { useAuth } from '@/hooks/useAuth';

function WeightSparkline({
  logs,
}: {
  logs: Array<{ day_key: string; weight_kg: number }>;
}) {
  const width = 320;
  const height = 120;
  const pad = 12;
  const values = logs.map((log) => log.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.1, max - min);
  const points = values
    .map((value, index) => {
      const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const delta = values[values.length - 1]! - values[0]!;
  return (
    <div className="nutrition-spark">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendência de peso">
        <polyline fill="none" stroke="#0a9875" strokeWidth="2.5" points={points} />
      </svg>
      <p className="text-xs text-stone-500">
        Tendência no período: {delta >= 0 ? '+' : ''}
        {delta.toFixed(1)} kg (variação bruta, não interpretação de gordura).
      </p>
    </div>
  );
}

export function NutritionProgress({
  weightOpen,
  onWeightOpenChange,
  showContent = true,
}: {
  weightOpen: boolean;
  onWeightOpenChange: (open: boolean) => void;
  /** Quando false, só o modal de peso fica montado (ex.: aberto a partir de Hoje). */
  showContent?: boolean;
}) {
  const { user, refreshUser } = useAuth();
  const today = getTodaySaoPaulo();
  const [weightDays, setWeightDays] = useState(30);
  const [weightSeries, setWeightSeries] = useState<Awaited<
    ReturnType<typeof getWeightLogs>
  > | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getNutritionStats>> | null>(
    null,
  );
  const [weightValue, setWeightValue] = useState(String(user?.peso_kg ?? ''));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!showContent && !weightOpen) return;
    void getWeightLogs(weightDays)
      .then(setWeightSeries)
      .catch(() => setWeightSeries(null));
    void getNutritionStats(weightDays)
      .then(setStats)
      .catch(() => setStats(null));
  }, [weightDays, showContent, weightOpen]);

  useEffect(() => {
    if (weightOpen) setWeightValue(String(user?.peso_kg ?? ''));
  }, [weightOpen, user?.peso_kg]);

  const saveWeight = async () => {
    const value = Number(weightValue.replace(',', '.'));
    if (!Number.isFinite(value)) {
      showGameToast('Informe um peso válido.', { variant: 'warn' });
      return;
    }
    setSaving(true);
    try {
      await saveWeightLog({ weight_kg: value, day_key: today });
      showGameToast('Peso registrado.', { variant: 'success' });
      onWeightOpenChange(false);
      await refreshUser();
      setWeightSeries(await getWeightLogs(weightDays));
      setStats(await getNutritionStats(weightDays));
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível salvar o peso.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showContent && (
        <section className="nutrition-progress">
          <div className="nutrition-day-nav">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                className={weightDays === days ? 'is-on' : undefined}
                onClick={() => setWeightDays(days)}
              >
                {days}d
              </button>
            ))}
          </div>

          <p className="text-sm text-stone-600">
            Último peso:{' '}
            <strong>
              {weightSeries?.latest
                ? `${weightSeries.latest.weight_kg.toFixed(1)} kg`
                : 'ainda não registrado'}
            </strong>
          </p>

          {(weightSeries?.logs.length ?? 0) < 2 ? (
            <p className="nutrition-empty">Registre peso em mais dias para ver a tendência.</p>
          ) : (
            <WeightSparkline logs={weightSeries!.logs} />
          )}

          {stats && stats.days_with_logs > 0 && (
            <div className="nutrition-consistency">
              <strong>Consistência</strong>
              <p>
                {stats.days_with_logs} de {stats.days} dias com registro de refeição.
              </p>
            </div>
          )}

          <GameButton variant="secondary" onClick={() => onWeightOpenChange(true)}>
            Registrar peso
          </GameButton>
          <p className="text-xs text-stone-500">
            Metas são referência de bem-estar — não substituem orientação profissional.
          </p>
        </section>
      )}

      <Modal
        open={weightOpen}
        onClose={() => onWeightOpenChange(false)}
        labelledBy="nutrition-weight-title"
      >
        <h2 id="nutrition-weight-title" className="text-base font-extrabold text-stone-800">
          Registrar peso
        </h2>
        <input
          className="game-input mt-3 w-full"
          inputMode="decimal"
          value={weightValue}
          onChange={(e) => setWeightValue(e.target.value)}
          placeholder="kg"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GameButton
            variant="ghost"
            className="!w-auto px-4"
            onClick={() => onWeightOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </GameButton>
          <GameButton
            className="!w-auto px-5"
            onClick={() => void saveWeight()}
            disabled={saving}
          >
            Salvar
          </GameButton>
        </div>
      </Modal>
    </>
  );
}
