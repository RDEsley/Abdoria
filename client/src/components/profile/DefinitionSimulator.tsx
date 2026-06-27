import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Lightbulb, Save, Sparkles, Target, TrendingDown } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { updateMe } from '@/lib/api';
import type { DashboardStats, IUserDocument, NivelUsuario, SexoBiologico } from '@/types';
import {
  calcImc,
  calcKgParaMeta,
  calcProgressoDefinicao,
  estimarGorduraCorporal,
  estimarSemanasParaMeta,
  getDefinicaoDicas,
  getDefinicaoMetaPadrao,
  getGorduraFaixa,
  GORDURA_FAIXAS,
} from '@/types';

interface Props {
  profile: IUserDocument;
  stats: DashboardStats | null;
  onSaved: () => Promise<void>;
}

function clampPct(value: number): number {
  return Math.min(55, Math.max(8, Math.round(value * 10) / 10));
}

function parsePctInput(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? clampPct(n) : null;
}

export function DefinitionSimulator({ profile, stats, onSaved }: Props) {
  const saved = profile.simulacao_definicao;
  const [sexo, setSexo] = useState<SexoBiologico>(saved?.sexo ?? 'masculino');
  const [gorduraAtual, setGorduraAtual] = useState<string>(
    saved?.gordura_atual_pct != null ? String(saved.gordura_atual_pct) : '',
  );
  const [gorduraMeta, setGorduraMeta] = useState<number>(
    saved?.gordura_meta_pct ?? getDefinicaoMetaPadrao(saved?.sexo ?? 'masculino'),
  );
  const [saving, setSaving] = useState(false);

  const gorduraAtualNum = parsePctInput(gorduraAtual);
  const imc =
    profile.imc ??
    (profile.peso_kg && profile.altura_cm ? calcImc(profile.peso_kg, profile.altura_cm) : null);

  const faixa = gorduraAtualNum != null ? getGorduraFaixa(gorduraAtualNum, sexo) : null;
  const diff = gorduraAtualNum != null ? gorduraAtualNum - gorduraMeta : null;
  const progresso = gorduraAtualNum != null
    ? calcProgressoDefinicao(gorduraAtualNum, gorduraMeta, saved?.gordura_inicio_pct ?? gorduraAtualNum)
    : 0;
  const kgPerder =
    gorduraAtualNum != null && profile.peso_kg
      ? calcKgParaMeta(profile.peso_kg, gorduraAtualNum, gorduraMeta)
      : null;

  const treinosSemana = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats.musculos_semana).reduce((sum, n) => sum + n, 0);
  }, [stats]);

  const projecao =
    diff != null && diff > 0
      ? estimarSemanasParaMeta(diff, {
          treinosSemana,
          streakAtual: stats?.streak_atual ?? 0,
          nivel: profile.nivel as NivelUsuario,
        })
      : null;

  const dicas = getDefinicaoDicas(faixa?.id ?? 'medio', diff);
  const faixas = GORDURA_FAIXAS[sexo];
  const visibilidadeAbs = faixa
    ? Math.min(100, Math.max(8, 100 - (gorduraAtualNum! - faixas[0].min) * 4))
    : 12;

  const handleSexoChange = (next: SexoBiologico) => {
    setSexo(next);
    if (!saved?.gordura_meta_pct) {
      setGorduraMeta(getDefinicaoMetaPadrao(next));
    }
  };

  const handleEstimateFromImc = () => {
    if (!imc || !profile.idade) {
      showGameToast('Preencha peso, altura e idade na aba Dados para estimar.', { variant: 'warn' });
      return;
    }
    const est = estimarGorduraCorporal(imc, profile.idade, sexo);
    setGorduraAtual(String(est));
    showGameToast(`Estimativa por IMC/idade: ~${est}% (referência educativa).`, { variant: 'info' });
  };

  const handleSave = async () => {
    const atual = parsePctInput(gorduraAtual);
    if (atual == null) {
      showGameToast('Informe sua gordura corporal estimada (8–55%).', { variant: 'warn' });
      return;
    }
    setSaving(true);
    try {
      const inicio =
        saved?.gordura_inicio_pct ??
        (saved?.gordura_atual_pct != null ? saved.gordura_atual_pct : atual);

      await updateMe({
        simulacao_definicao: {
          gordura_atual_pct: atual,
          gordura_meta_pct: gorduraMeta,
          gordura_inicio_pct: inicio,
          sexo,
          atualizado_em: new Date().toISOString(),
        },
      });
      await onSaved();
      showGameToast('Simulação atualizada.', { variant: 'success' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="definicao-sim glass-card rounded-2xl p-4">
      <header className="definicao-sim__header">
        <div className="game-level-badge definicao-sim__header-icon">
          <Target size={20} className="mx-auto text-amber-600" />
        </div>
        <div>
          <h3 className="game-section-title !mb-1">Simulação de definição</h3>
          <p className="definicao-sim__intro">
            Projeção educativa com base em % de gordura, perfil e constância nos treinos. Não substitui
            avaliação profissional.
          </p>
        </div>
      </header>

      <div className="definicao-sim__sexo-row">
        {(['masculino', 'feminino'] as SexoBiologico[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleSexoChange(s)}
            className={`game-tab flex-1 !text-[0.62rem]${sexo === s ? ' game-tab--active' : ''}`}
          >
            {s === 'masculino' ? 'Homem' : 'Mulher'}
          </button>
        ))}
      </div>

      <div className="definicao-sim__visual">
        <div className="definicao-sim__silhouette" aria-hidden>
          <motion.div
            className="definicao-sim__abs-glow"
            animate={{ opacity: visibilidadeAbs / 100 }}
            transition={{ duration: 0.5 }}
          />
          <div className="definicao-sim__abs-lines">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="definicao-sim__abs-line"
                animate={{ opacity: visibilidadeAbs / 120, scaleX: 0.6 + visibilidadeAbs / 250 }}
              />
            ))}
          </div>
        </div>
        {faixa ? (
          <p className="definicao-sim__faixa-label">
            Faixa atual: <strong>{faixa.label}</strong>
          </p>
        ) : (
          <p className="definicao-sim__faixa-label">Informe sua gordura estimada</p>
        )}
        <p className="definicao-sim__faixa-hint">{faixa?.descricao ?? 'Use o campo abaixo ou estime pelo IMC na aba Dados.'}</p>
      </div>

      {gorduraAtualNum != null && (
        <div className="definicao-sim__compare">
          <div className="definicao-sim__compare-card">
            <span className="definicao-sim__compare-label">Atual</span>
            <span className="definicao-sim__compare-value">{gorduraAtualNum}%</span>
          </div>
          <div className="definicao-sim__compare-arrow" aria-hidden>→</div>
          <div className="definicao-sim__compare-card definicao-sim__compare-card--meta">
            <span className="definicao-sim__compare-label">Meta</span>
            <span className="definicao-sim__compare-value">{gorduraMeta}%</span>
          </div>
        </div>
      )}

      <section className="definicao-sim__section">
        <h4 className="definicao-sim__section-title">Seus números</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="definicao-sim__field">
            Gordura corporal atual (%)
            <input
              type="text"
              inputMode="decimal"
              value={gorduraAtual}
              onChange={(e) => setGorduraAtual(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder={sexo === 'masculino' ? 'Ex.: 18' : 'Ex.: 26'}
              className="definicao-sim__input"
            />
          </label>
          <label className="definicao-sim__field">
            Meta de definição ({gorduraMeta}%)
            <input
              type="range"
              min={sexo === 'masculino' ? 8 : 14}
              max={sexo === 'masculino' ? 18 : 24}
              step={0.5}
              value={gorduraMeta}
              onChange={(e) => setGorduraMeta(Number(e.target.value))}
              className="definicao-sim__range"
            />
            <span className="definicao-sim__range-hint">
              Referência: {getDefinicaoMetaPadrao(sexo)}% ({sexo === 'masculino' ? 'homens' : 'mulheres'})
            </span>
          </label>
        </div>

        <div className="definicao-sim__quick-actions">
          <button type="button" onClick={handleEstimateFromImc} className="game-scheme-chip !min-w-0 flex-1">
            <span className="game-scheme-chip__label">Estimar por IMC</span>
            <span className="game-scheme-chip__hint">Usa peso, altura e idade</span>
          </button>
          <button
            type="button"
            onClick={() => setGorduraMeta(getDefinicaoMetaPadrao(sexo))}
            className="game-scheme-chip !min-w-0 flex-1"
          >
            <span className="game-scheme-chip__label">Meta padrão</span>
            <span className="game-scheme-chip__hint">{getDefinicaoMetaPadrao(sexo)}%</span>
          </button>
        </div>
      </section>

      {gorduraAtualNum != null && (
        <section className="definicao-sim__section">
          <h4 className="definicao-sim__section-title">Resultados</h4>

          <div className="definicao-sim__progress-block">
            <div className="mb-1 flex justify-between text-xs font-bold">
              <span className="text-stone-600">Progresso até a meta</span>
              <span className="text-emerald-700">{progresso}%</span>
            </div>
            <div className="definicao-sim__progress-track">
              <motion.div
                className="definicao-sim__progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progresso}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[0.58rem] font-bold text-stone-400">
              <span>{saved?.gordura_inicio_pct ?? gorduraAtualNum}% início</span>
              <span>{gorduraMeta}% meta</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="definicao-sim__stat">
              <TrendingDown size={16} className="text-emerald-600" />
              <span className="definicao-sim__stat-value">
                {diff != null && diff > 0 ? `−${diff.toFixed(1)}%` : 'Na meta'}
              </span>
              <span className="definicao-sim__stat-label">Gordura a reduzir</span>
            </div>
            <div className="definicao-sim__stat">
              <Flame size={16} className="text-orange-500" />
              <span className="definicao-sim__stat-value">
                {kgPerder != null && kgPerder > 0 ? `~${kgPerder} kg` : '—'}
              </span>
              <span className="definicao-sim__stat-label">Peso estimado (massa magra)</span>
            </div>
          </div>

          {projecao && diff! > 0 && (
            <div className="definicao-sim__projection">
              <p className="definicao-sim__projection-title">
                <Sparkles size={14} /> Projeção com seu ritmo atual
              </p>
              <p className="definicao-sim__projection-value">
                {projecao.realista}–{projecao.conservador} semanas
                <span className="definicao-sim__projection-optimistic"> (otimista: {projecao.otimista} sem.)</span>
              </p>
              <p className="definicao-sim__projection-hint">
                Baseado em {treinosSemana} estímulo(s) muscular(es) esta semana · streak {stats?.streak_atual ?? 0}d
              </p>
            </div>
          )}

          {diff != null && diff <= 0 && (
            <p className="definicao-sim__goal-hit">
              Você atingiu (ou superou) a meta de definição simulada!
            </p>
          )}

          <div className="definicao-sim__dicas">
            <p className="definicao-sim__dicas-title">
              <Lightbulb size={14} /> Dicas para sua faixa
            </p>
            <ul className="definicao-sim__dicas-list">
              {dicas.map((dica) => (
                <li key={dica}>{dica}</li>
              ))}
            </ul>
          </div>

          <div className="definicao-sim__faixas">
            <p className="definicao-sim__faixas-title">Faixas de referência</p>
            <div className="flex flex-wrap gap-1">
              {faixas.map((f) => (
                <span
                  key={f.id}
                  className={`definicao-sim__faixa-chip${faixa?.id === f.id ? ' definicao-sim__faixa-chip--active' : ''}`}
                  title={f.descricao}
                >
                  {f.label} ({f.min}–{f.max === 60 ? '55' : f.max}%)
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="definicao-sim__actions game-profile-form__actions">
        <GameButton
          size="lg"
          className="game-profile-save-btn"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          <Save size={18} strokeWidth={2.5} aria-hidden />
          {saving ? 'Salvando...' : 'Salvar simulação'}
        </GameButton>
      </div>
    </section>
  );
}
