import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquareWarning,
  Palette,
  Pencil,
  Save,
  Settings,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { CosmeticsModal } from '@/components/cosmetics/CosmeticsModal';
import { SupportModal } from '@/components/profile/SupportModal';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { DefinitionSimulator } from '@/components/profile/DefinitionSimulator';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';
import { PersonalRecordsPanel } from '@/components/profile/PersonalRecordsPanel';
import { ProfileProgressPanel } from '@/components/profile/ProfileProgressPanel';
import { StreakBadge } from '@/components/gamification/StreakBadge';
import { GameButton } from '@/components/ui/GameButton';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { showGameToast } from '@/components/ui/GameToast';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/lib/api';
import { getMySocial } from '@/lib/api/social';
import { playTabSwitch } from '@/lib/sounds';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import {
  calcImc,
  NIVEL_LABELS,
  OBJETIVO_HINTS,
  OBJETIVO_LABELS,
  resolveCosmeticos,
  xpProgressFromTotal,
  type NivelUsuario,
  type Objetivo,
} from '@/types';

type Tab = 'dados' | 'progresso' | 'definicao';

export function ProfilePage() {
  const { user: appUser, stats, refresh } = useApp();
  const { user, refreshUser } = useAuth();
  const profile = user ?? appUser;
  const [tab, setTab] = useState<Tab>('progresso');
  const [saving, setSaving] = useState(false);
  const [showCosmetics, setShowCosmetics] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [social, setSocial] = useState<{
    followers: number;
    following: number;
    amigos: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMySocial()
      .then((data) => {
        if (!cancelled) setSocial(data);
      })
      .catch(() => {
        /* contadores sociais são opcionais */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) {
    return <PageLoader />;
  }

  const shareProfile = async () => {
    const url = `${window.location.origin}/perfil/${profile.id}`;
    const text = `Vem ver meu perfil no Abdoria — nível ${xpProgressFromTotal(profile.gamificacao.nivel_xp).level}, bora treinar junto!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Abdoria · Core Quest', text, url });
        return;
      }
    } catch {
      return; // usuário cancelou o share
    }
    await navigator.clipboard.writeText(url);
    showGameToast('Link do perfil copiado!', { variant: 'success' });
  };

  const imc =
    profile.imc ??
    (profile.peso_kg && profile.altura_cm ? calcImc(profile.peso_kg, profile.altura_cm) : null);
  const cosmeticos = resolveCosmeticos(profile.cosmeticos, profile.gamificacao.nivel_xp);
  const equippedTitle = cosmeticos.titulo_equipado
    ? COSMETIC_BY_ID[cosmeticos.titulo_equipado]?.nome
    : null;
  const titleClass =
    cosmeticos.titulo_equipado === 'titulo_dono_do_jogo'
      ? 'game-profile-hero__title cosmetic-title--dono-do-jogo'
      : cosmeticos.titulo_equipado === 'titulo_secreto'
        ? 'game-profile-hero__title cosmetic-title--secreto'
        : 'game-profile-hero__title';
  const fundoKey = cosmeticos.banner_equipado.replace('fundo_', '');
  const heroShellClass =
    fundoKey === 'padrao'
      ? 'game-profile-hero-shell game-profile-hero-shell--default'
      : fundoKey === 'praia'
        ? `game-profile-hero-shell game-profile-hero-shell--skinned-light game-card-banner--${fundoKey}`
        : `game-profile-hero-shell game-profile-hero-shell--skinned game-card-banner--${fundoKey}`;
  const xpLevel = xpProgressFromTotal(profile.gamificacao.nivel_xp).level;

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
    { id: 'progresso', label: 'Meu Perfil' },
    { id: 'dados', label: 'Dados' },
    { id: 'definicao', label: 'Definição' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <GamePageHeader eyebrow="Ficha do herói" title="Perfil" />
        <div className="flex shrink-0 gap-2">
          {user?.role === 'admin' && (
            <Link to="/admin" className="game-icon-btn" aria-label="Administração">
              <ShieldCheck size={20} aria-hidden />
            </Link>
          )}
          <button
            type="button"
            className="game-icon-btn"
            aria-label="Compartilhar perfil"
            onClick={() => void shareProfile()}
          >
            <Share2 size={20} aria-hidden />
          </button>
          <Link to="/amigos" className="game-icon-btn" aria-label="Amigos">
            <Users size={20} aria-hidden />
          </Link>
          <button
            type="button"
            className="game-icon-btn"
            aria-label="Personalizar perfil"
            onClick={() => setShowCosmetics(true)}
          >
            <Palette size={20} aria-hidden />
          </button>
          <Link to="/configuracoes" className="game-icon-btn" aria-label="Configurações">
            <Settings size={20} aria-hidden />
          </Link>
          <button
            type="button"
            className="game-icon-btn"
            aria-label="Reportar bug ou sugestão"
            onClick={() => setShowSupport(true)}
          >
            <MessageSquareWarning size={20} aria-hidden />
          </button>
        </div>
      </header>

      <CosmeticsModal open={showCosmetics} onClose={() => setShowCosmetics(false)} />
      <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />
      <ProfileEditModal
        open={showEdit}
        profile={profile}
        onClose={() => setShowEdit(false)}
        onChanged={handleRefresh}
      />

      <div className={heroShellClass}>
        <i className="game-profile-hero-shell__ring" aria-hidden />
        <button
          type="button"
          className="game-profile-hero__edit"
          aria-label="Editar perfil"
          onClick={() => setShowEdit(true)}
        >
          <Pencil size={14} aria-hidden />
        </button>
        <div className="game-profile-hero">
          <span className="game-profile-hero__avatar-wrap">
            <UserAvatar
              nome={profile.nome}
              avatarUrl={profile.avatar_url}
              moldura={cosmeticos.moldura_equipada ?? null}
              size="lg"
            />
            <span className="game-profile-hero__level-badge" aria-label={`Nível ${xpLevel}`}>
              {xpLevel}
            </span>
          </span>
          <div className="game-profile-hero__meta min-w-0">
            <p className="game-profile-hero__name-row">
              <span className="game-profile-hero__name truncate">{profile.nome}</span>
              {equippedTitle && <span className={titleClass}>{equippedTitle}</span>}
            </p>
            {profile.descricao ? (
              <p className="game-profile-hero__bio">{profile.descricao}</p>
            ) : (
              <p className="game-profile-hero__bio game-profile-hero__bio--hint">
                Toque no lápis e escreva sua descrição.
              </p>
            )}
            {stats && (
              <div className="mt-2 flex items-center gap-2">
                <StreakBadge streak={stats.streak_atual} frozen={!!stats.streak_frozen_notice} />
              </div>
            )}
          </div>
        </div>

        <nav className="profile-counts" aria-label="Sua rede">
          <Link to="/amigos" className="profile-counts__item">
            <strong>{social?.amigos ?? '—'}</strong>
            <span>amigos</span>
          </Link>
          <Link to="/amigos?tab=seguidores" className="profile-counts__item">
            <strong>{social?.followers ?? '—'}</strong>
            <span>seguidores</span>
          </Link>
          <Link to="/amigos?tab=seguindo" className="profile-counts__item">
            <strong>{social?.following ?? '—'}</strong>
            <span>seguindo</span>
          </Link>
        </nav>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              playTabSwitch();
              setTab(t.id);
            }}
            className={`game-tab${tab === t.id ? ' game-tab--active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dados' && (
        <form onSubmit={handleSave} className="glass-card flex flex-col gap-4 p-4">
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
          {imc && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
              IMC: {imc}
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Nível
            <select
              name="nivel"
              defaultValue={profile.nivel}
              className="cursor-pointer rounded-xl border border-stone-300 bg-stone-50 px-3 py-2"
            >
              {(['iniciante', 'intermediario', 'avancado'] as NivelUsuario[]).map((n) => (
                <option key={n} value={n}>
                  {NIVEL_LABELS[n]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Objetivo
            <select
              name="objetivo"
              defaultValue={profile.objetivo}
              className="cursor-pointer rounded-xl border border-stone-300 bg-stone-50 px-3 py-2"
            >
              {(['definicao', 'resistencia', 'forca', 'manutencao'] as Objetivo[]).map((o) => (
                <option key={o} value={o}>
                  {OBJETIVO_LABELS[o]}
                </option>
              ))}
            </select>
            <p className="text-xs font-medium text-stone-500">{OBJETIVO_HINTS[profile.objetivo]}</p>
          </label>
          <div className="game-profile-form__actions">
            <GameButton
              type="submit"
              size="lg"
              disabled={saving}
              className="game-profile-save-btn w-full flex items-center justify-center gap-2"
            >
              <Save size={18} strokeWidth={2.5} aria-hidden />
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </GameButton>
          </div>
        </form>
      )}

      {tab === 'progresso' && stats && (
        <>
          <ProfileProgressPanel stats={stats} />
          <PersonalRecordsPanel />
        </>
      )}

      {tab === 'progresso' && !stats && (
        <div className="glass-card p-4 text-center text-sm font-bold text-stone-500">
          Não foi possível carregar seu progresso. Tente recarregar a página.
        </div>
      )}

      {tab === 'definicao' && (
        <DefinitionSimulator profile={profile} stats={stats} onSaved={handleRefresh} />
      )}
    </div>
  );
}
