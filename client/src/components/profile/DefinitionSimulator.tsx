import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Sparkles, Target, TrendingDown } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
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
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage('Preencha peso, altura e idade na aba Dados para estimar.');
      return;
    }
    const est = estimarGorduraCorporal(imc, profile.idade, sexo);
    setGorduraAtual(String(est));
    setMessage(`Estimativa por IMC/idade: ~${est}% (referência educativa).`);
  };

  const handleSave = async () => {
    const atual = parsePctInput(gorduraAtual);
    if (atual == null) {
      setMessage('Informe sua gordura corporal estimada (8–55%).');
      return;
    }
    setSaving(true);
    setMessage(null);
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
      setMessage('Simulação atualizada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="definicao-sim glass-card p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="game-level-badge !h-11 !w-11 shrink-0">
          <Target size={20} className="mx-auto text-amber-600" />
        </div>
        <div>
          <h3 className="font-extrabold text-stone-900">Simulação de definição</h3>
          <p className="mt-1 text-xs font-bold leading-relaxed text-stone-500">
            Projeção educativa com base em % de gordura, perfil e constância nos treinos. Não substitui
            avaliação profissional.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
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

      <div className="definicao-sim__visual mb-4">
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
        {faixa && (
          <p className="definicao-sim__faixa-label">
            Faixa atual: <strong>{faixa.label}</strong>
          </p>
        )}
        <p className="definicao-sim__faixa-hint">{faixa?.descricao ?? 'Informe sua gordura estimada para ver a faixa.'}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-bold text-stone-700">
          Gordura corporal atual (%)
          <input
            type="text"
            inputMode="decimal"
            value={gorduraAtual}
            onChange={(e) => setGorduraAtual(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder={sexo === 'masculino' ? 'Ex.: 18' : 'Ex.: 26'}
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 font-medium"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-stone-700">
          Meta de definição ({gorduraMeta}%)
          <input
            type="range"
            min={sexo === 'masculino' ? 8 : 14}
            max={sexo === 'masculino' ? 18 : 24}
            step={0.5}
            value={gorduraMeta}
            onChange={(e) => setGorduraMeta(Number(e.target.value))}
            className="mt-2 w-full cursor-pointer"
          />
          <span className="text-xs font-bold text-emerald-700">
            Referência: {getDefinicaoMetaPadrao(sexo)}% ({sexo === 'masculino' ? 'homens' : 'mulheres'})
          </span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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

      {gorduraAtualNum != null && (
        <div className="mt-4 space-y-3">
          <div>
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
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 p-3">
              <p className="flex items-center gap-1 text-xs font-extrabold text-amber-900">
                <Sparkles size={14} /> Projeção com seu ritmo atual
              </p>
              <p className="mt-2 text-sm font-bold text-stone-700">
                {projecao.realista}–{projecao.conservador} semanas (otimista: {projecao.otimista} sem.)
              </p>
              <p className="mt-1 text-[0.65rem] font-bold text-stone-500">
                Baseado em {treinosSemana} estímulo(s) muscular(es) esta semana · streak {stats?.streak_atual ?? 0}d
              </p>
            </div>
          )}

          {diff != null && diff <= 0 && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-800">
              Você atingiu (ou superou) a meta de definição simulada!
            </p>
          )}

          <ul className="space-y-1.5">
            {dicas.map((dica) => (
              <li key={dica} className="text-[0.65rem] font-bold leading-relaxed text-stone-600">
                · {dica}
              </li>
            ))}
          </ul>

          <div className="definicao-sim__faixas">
            <p className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-wide text-stone-500">
              Faixas de referência
            </p>
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
        </div>
      )}

      {message && <p className="mt-3 text-xs font-bold text-stone-600">{message}</p>}

      <GameButton size="lg" className="mt-4 w-full" onClick={() => void handleSave()} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar simulação'}
      </GameButton>
    </section>
  );
}
