import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Settings, User as UserIcon } from 'lucide-react';
import { DefinitionSimulator } from '@/components/profile/DefinitionSimulator';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/lib/api';
import { formatTrainingDuration } from '@/lib/utils';
import { calcImc, NIVEL_LABELS, OBJETIVO_HINTS, OBJETIVO_LABELS, XP_DAILY_CAP_PER_LEVEL, XP_DAILY_MIN_EXERCISES, XP_DAILY_PER_EXERCISE, dailyFullExercisesForCap, xpProgressFromTotal, type NivelUsuario, type Objetivo } from '@/types';

type Tab = 'dados' | 'progresso' | 'definicao';

export function ProfilePage() {
  const { user: appUser, stats, refresh } = useApp();
  const { user, refreshUser } = useAuth();
  const profile = user ?? appUser;
  const [tab, setTab] = useState<Tab>('dados');
  const [saving, setSaving] = useState(false);

  if (!profile) {
    return <PageLoader />;
  }

  const imc = profile.imc ?? (profile.peso_kg && profile.altura_cm ? calcImc(profile.peso_kg, profile.altura_cm) : null);

  const handleRefresh = async () => {
    await refreshUser();
    await refresh();
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const pesoRaw = String(form.get('peso_kg') ?? '').trim();
      const alturaRaw = String(form.get('altura_cm') ?? '').trim();
      const idadeRaw = String(form.get('idade') ?? '').trim();
      const peso = pesoRaw ? Number(pesoRaw) : undefined;
      const altura = alturaRaw ? Number(alturaRaw) : undefined;
      const idade = idadeRaw ? Number(idadeRaw) : undefined;
      await updateMe({
        nome: String(form.get('nome')),
        idade,
        peso_kg: peso,
        altura_cm: altura,
        imc: peso && altura ? calcImc(peso, altura) : undefined,
        nivel: form.get('nivel') as NivelUsuario,
        objetivo: form.get('objetivo') as Objetivo,
      });
      await refreshUser();
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dados', label: 'Dados' },
    { id: 'progresso', label: 'Progresso' },
    { id: 'definicao', label: 'Definição' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <GamePageHeader eyebrow="Ficha do herói" title={profile.nome} />
        <Link to="/configuracoes" className="game-nav-item shrink-0 !p-3">
          <Settings size={20} />
        </Link>
      </header>
      <p className="-mt-3 text-xs font-bold text-stone-500">{profile.email}</p>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`game-tab${tab === t.id ? ' game-tab--active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dados' && (
        <form onSubmit={handleSave} className="glass-card flex flex-col gap-4 rounded-2xl p-4">
          <label className="flex flex-col gap-1 text-sm font-bold text-stone-700">
            Nome
            <input name="nome" defaultValue={profile.nome} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 font-medium" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Idade
            <input
              name="idade"
              type="text"
              inputMode="numeric"
              defaultValue={profile.idade ?? ''}
              placeholder="Ex.: 28"
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm font-bold">
              Peso (kg)
              <input
                name="peso_kg"
                type="text"
                inputMode="numeric"
                defaultValue={profile.peso_kg ?? ''}
                placeholder="Ex.: 70"
                className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              Altura (cm)
              <input
                name="altura_cm"
                type="text"
                inputMode="numeric"
                defaultValue={profile.altura_cm ?? ''}
                placeholder="Ex.: 170"
                className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2"
              />
            </label>
          </div>
          {imc && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">IMC: {imc}</p>}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Nível
            <select name="nivel" defaultValue={profile.nivel} className="cursor-pointer rounded-xl border border-stone-300 bg-stone-50 px-3 py-2">
              {(['iniciante', 'intermediario', 'avancado'] as NivelUsuario[]).map((n) => (
                <option key={n} value={n}>{NIVEL_LABELS[n]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Objetivo
            <select name="objetivo" defaultValue={profile.objetivo} className="cursor-pointer rounded-xl border border-stone-300 bg-stone-50 px-3 py-2">
              {(['definicao', 'resistencia', 'forca', 'manutencao'] as Objetivo[]).map((o) => (
                <option key={o} value={o}>{OBJETIVO_LABELS[o]}</option>
              ))}
            </select>
            <p className="text-xs font-medium text-stone-500">{OBJETIVO_HINTS[profile.objetivo]}</p>
          </label>
          <div className="game-profile-form__actions">
            <GameButton
              type="submit"
              size="lg"
              disabled={saving}
              className="game-profile-save-btn w-full"
            >
              <Save size={18} strokeWidth={2.5} aria-hidden />
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </GameButton>
          </div>
        </form>
      )}

      {tab === 'progresso' && stats && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <UserIcon className="text-emerald-600" />
            <div>
              <p className="font-extrabold">Nível {xpProgressFromTotal(stats.nivel_xp).level}</p>
              <p className="text-sm text-stone-500">
                {stats.total_exercicios} exercícios ·{' '}
                {formatTrainingDuration(stats.total_segundos ?? stats.total_minutos * 60)}
              </p>
            </div>
          </div>
          <p className="text-sm font-bold text-stone-600">
            Dias seguidos treinando: {stats.streak_atual} (recorde: {stats.streak_maior})
          </p>
          <p className="mt-2 text-sm font-bold text-amber-600">
            XP diário (exercícios): {stats.xp_hoje}/{stats.xp_diario_limite}
            {stats.xp_extra_hoje > 0 ? ` · extra +${stats.xp_extra_hoje}` : ''}
          </p>
          <p className="mt-1 text-xs font-bold text-stone-500">
            {XP_DAILY_PER_EXERCISE} XP/exercício · mín. {XP_DAILY_MIN_EXERCISES} no treino · teto{' '}
            {stats.xp_diario_limite} XP/dia (+{XP_DAILY_CAP_PER_LEVEL}/nível) ·{' '}
            {dailyFullExercisesForCap(stats.xp_diario_limite)} exercícios enchem o teto. Bônus (streak,
            conquistas, loja) não contam no teto.
          </p>
        </div>
      )}

      {tab === 'definicao' && (
        <DefinitionSimulator profile={profile} stats={stats} onSaved={handleRefresh} />
      )}
    </div>
  );
}
