import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Cake,
  Dumbbell,
  MessageSquareWarning,
  MoreHorizontal,
  Pencil,
  Ruler,
  Save,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Weight,
} from 'lucide-react';
import { BannerPickerModal } from '@/components/profile/BannerPickerModal';
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
import { useCopy } from '@/hooks/useCopy';
import { useAuth } from '@/context/AuthContext';
import { getAdminReportsPendingCount, updateMe } from '@/lib/api';
import { getMySocial } from '@/lib/api/social';
import { playTabSwitch } from '@/lib/sounds';
import { AnimatedTitleText } from '@/components/ui/AnimatedTitleText';
import { resolveEquippedTitle } from '@/lib/cosmetic-title';
import { resolveIdentityBorder } from '@/lib/identity-border';
import { shareContent } from '@/lib/platform/share';
import {
  digitsOnly,
  formatAlturaMask,
  imcFaixa,
  sanitizeDecimalInput,
  validateBodyMetrics,
} from '@/lib/utils';
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
  const copy = useCopy();
  const profile = user ?? appUser;
  const [tab, setTab] = useState<Tab>('progresso');
  const [saving, setSaving] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [social, setSocial] = useState<{
    followers: number;
    following: number;
    amigos: number;
    likes_recebidos: number;
    visualizacoes_recebidas: number;
  } | null>(null);
  const [pendingReports, setPendingReports] = useState(0);

  // Rascunho dos Dados: pré-preenchido com o que já veio do Onboarding
  // (profile.idade/peso_kg/altura_cm) e sincronizado se a conta mudar em
  // segundo plano (ex.: outro dispositivo). Máscaras iguais às do Onboarding
  // — altura em "1.75 m" e peso com 1 casa decimal ("72.5 kg").
  const [idadeDraft, setIdadeDraft] = useState(String(profile?.idade ?? ''));
  const [pesoDraft, setPesoDraft] = useState(String(profile?.peso_kg ?? ''));
  const [alturaDraft, setAlturaDraft] = useState(
    profile?.altura_cm != null ? String(profile.altura_cm) : '',
  );
  const [nivelDraft, setNivelDraft] = useState<NivelUsuario>(profile?.nivel ?? 'iniciante');
  const [objetivoDraft, setObjetivoDraft] = useState<Objetivo>(profile?.objetivo ?? 'definicao');
  const [dadosHydratedFor, setDadosHydratedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || dadosHydratedFor === profile.id) return;
    setIdadeDraft(String(profile.idade ?? ''));
    setPesoDraft(String(profile.peso_kg ?? ''));
    setAlturaDraft(profile.altura_cm != null ? String(profile.altura_cm) : '');
    setNivelDraft(profile.nivel);
    setObjetivoDraft(profile.objetivo);
    setDadosHydratedFor(profile.id);
  }, [profile, dadosHydratedFor]);

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

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;
    let cancelled = false;
    getAdminReportsPendingCount()
      .then((data) => {
        if (!cancelled) setPendingReports(data.count);
      })
      .catch(() => {
        /* badge é só um indicativo — falha silenciosa */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (!profile) {
    return <PageLoader />;
  }

  const shareProfile = async () => {
    const url = `${window.location.origin}/perfil/${profile.id}`;
    const text = `Vem ver meu perfil no Evolyn — nível ${xpProgressFromTotal(profile.gamificacao.nivel_xp).level}, bora treinar junto!`;
    const result = await shareContent({ title: 'Evolyn · Core Quest', text, url });
    if (result === 'copied') showGameToast('Link do perfil copiado!', { variant: 'success' });
  };

  const cosmeticos = resolveCosmeticos(profile.cosmeticos, profile.gamificacao.nivel_xp);
  const identityBorder = resolveIdentityBorder(cosmeticos);
  const resolvedTitle = resolveEquippedTitle(cosmeticos.titulo_equipado);
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

  const dadosValidation = validateBodyMetrics(idadeDraft, pesoDraft, alturaDraft);
  const dadosImc =
    dadosValidation.peso_kg && dadosValidation.altura_cm
      ? calcImc(dadosValidation.peso_kg, dadosValidation.altura_cm)
      : null;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (dadosValidation.error) {
      showGameToast(dadosValidation.error, { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await updateMe({
        idade: dadosValidation.idade ?? undefined,
        peso_kg: dadosValidation.peso_kg ?? undefined,
        altura_cm: dadosValidation.altura_cm ?? undefined,
        imc: dadosImc ?? undefined,
        nivel: nivelDraft,
        objetivo: objetivoDraft,
      });
      await refreshUser();
      await refresh();
      showGameToast('Dados atualizados!', { variant: 'success' });
    } catch (err) {
      showGameToast(err instanceof Error ? err.message : 'Não foi possível salvar seus dados.', {
        variant: 'error',
      });
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
        <GamePageHeader eyebrow={copy('perfil_eyebrow')} title="Perfil" />
        <div className="relative flex shrink-0 gap-2">
          <button
            type="button"
            className="game-icon-btn"
            aria-label="Compartilhar perfil"
            onClick={() => void shareProfile()}
          >
            <Share2 size={20} aria-hidden />
          </button>
          <Link to="/configuracoes" className="game-icon-btn" aria-label="Configurações">
            <Settings size={20} aria-hidden />
          </Link>
          <button
            type="button"
            className="game-icon-btn"
            aria-label="Mais ações"
            aria-expanded={showMoreActions}
            onClick={() => setShowMoreActions((open) => !open)}
          >
            <MoreHorizontal size={20} aria-hidden />
          </button>
          {showMoreActions && (
            <div className="absolute right-0 top-12 z-30 min-w-52 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-stone-700 hover:bg-stone-100"
                onClick={() => {
                  setShowMoreActions(false);
                  setShowSupport(true);
                }}
              >
                <MessageSquareWarning size={18} aria-hidden />
                Ajuda e sugestões
              </button>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-stone-700 hover:bg-stone-100"
                  onClick={() => setShowMoreActions(false)}
                >
                  <ShieldCheck size={18} aria-hidden />
                  Administração
                  {pendingReports > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                      {pendingReports > 99 ? '99+' : pendingReports}
                    </span>
                  )}
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <BannerPickerModal
        open={showBannerPicker}
        onClose={() => setShowBannerPicker(false)}
        onChanged={handleRefresh}
      />
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
          aria-label="Trocar banner do perfil"
          title="Trocar banner"
          onClick={() => setShowBannerPicker(true)}
        >
          <Pencil size={14} aria-hidden />
        </button>
        <div className="game-profile-hero">
          <button
            type="button"
            className="game-profile-hero__avatar-wrap game-profile-hero__avatar-btn"
            aria-label="Editar perfil (foto, nome, moldura, título)"
            onClick={() => setShowEdit(true)}
          >
            <UserAvatar
              nome={profile.nome}
              avatarUrl={profile.avatar_url}
              moldura={identityBorder.moldura}
              borderLoja={identityBorder.borderLoja}
              size="lg"
            />
            <span className="game-profile-hero__level-badge" aria-label={`Nível ${xpLevel}`}>
              {xpLevel}
            </span>
            <span className="game-profile-hero__avatar-overlay" aria-hidden>
              <Pencil size={20} aria-hidden />
            </span>
          </button>
          <div className="game-profile-hero__meta min-w-0">
            <p className="game-profile-hero__name-row">
              <span className="game-profile-hero__name truncate">{profile.nome}</span>
              <AnimatedTitleText title={resolvedTitle} className="game-profile-hero__title" />
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
          <span className="profile-counts__item" title="Curtidas que seu perfil recebeu">
            <strong>{social?.likes_recebidos ?? '—'}</strong>
            <span>curtidas</span>
          </span>
        </nav>
      </div>

      <p className="profile-views-hint">
        <strong>{social?.visualizacoes_recebidas ?? '—'}</strong> visualizações no seu perfil
      </p>

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
        <form onSubmit={handleSave} className="glass-card profile-dados-form p-4">
          <p className="profile-dados-hint">
            Preenchido no cadastro — ajuste sempre que seu corpo ou seus objetivos mudarem.
          </p>

          <label className="onb-field">
            <span className="onb-field__icon" aria-hidden>
              <Cake size={16} />
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={idadeDraft}
              onChange={(e) => setIdadeDraft(digitsOnly(e.target.value).slice(0, 3))}
              placeholder="Idade"
              maxLength={3}
            />
            <span className="onb-field__suffix">anos</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="onb-field">
              <span className="onb-field__icon" aria-hidden>
                <Weight size={16} />
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={pesoDraft}
                onChange={(e) => setPesoDraft(sanitizeDecimalInput(e.target.value))}
                placeholder="72.5"
                maxLength={5}
              />
              <span className="onb-field__suffix">kg</span>
            </label>
            <label className="onb-field">
              <span className="onb-field__icon" aria-hidden>
                <Ruler size={16} />
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={formatAlturaMask(alturaDraft)}
                onChange={(e) => setAlturaDraft(digitsOnly(e.target.value).slice(0, 3))}
                placeholder="1.75"
                maxLength={4}
              />
              <span className="onb-field__suffix">m</span>
            </label>
          </div>

          {dadosImc != null && (
            <div className={`profile-dados-imc ${imcFaixa(dadosImc).className}`}>
              <Activity size={16} aria-hidden />
              <span>
                IMC <strong>{dadosImc}</strong> · {imcFaixa(dadosImc).label}
              </span>
            </div>
          )}

          <label className="profile-dados-select">
            <span className="profile-dados-select__label">
              <Dumbbell size={14} aria-hidden /> Nível
            </span>
            <select
              value={nivelDraft}
              onChange={(e) => setNivelDraft(e.target.value as NivelUsuario)}
            >
              {(['iniciante', 'intermediario', 'avancado'] as NivelUsuario[]).map((n) => (
                <option key={n} value={n}>
                  {NIVEL_LABELS[n]}
                </option>
              ))}
            </select>
          </label>

          <label className="profile-dados-select">
            <span className="profile-dados-select__label">
              <Target size={14} aria-hidden /> Objetivo
            </span>
            <select
              value={objetivoDraft}
              onChange={(e) => setObjetivoDraft(e.target.value as Objetivo)}
            >
              {(['definicao', 'resistencia', 'forca', 'manutencao'] as Objetivo[]).map((o) => (
                <option key={o} value={o}>
                  {OBJETIVO_LABELS[o]}
                </option>
              ))}
            </select>
            <p className="profile-dados-select__hint">{OBJETIVO_HINTS[objetivoDraft]}</p>
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
