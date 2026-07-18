import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Flame, Medal, Timer, Trophy, UserPlus } from 'lucide-react';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { PageLoader } from '@/components/ui/PageLoader';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { getPublicProfile } from '@/lib/api';
import { followUser, unfollowUser } from '@/lib/api/social';
import { COSMETIC_BY_ID } from '@/lib/cosmetics-meta';
import { formatTrainingDuration } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { MolduraId, PublicProfile } from '@/types';

function molduraCountOf(profile: PublicProfile, moldura: MolduraId | null): number | null {
  if (!moldura || moldura === 'especial') return null;
  if (moldura === 'ouro') return profile.podio.first;
  if (moldura === 'prata') return profile.podio.second;
  return profile.podio.third;
}

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getPublicProfile(userId);
      setProfile(data);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar este perfil.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (me && userId === me.id) {
      navigate('/perfil', { replace: true });
      return;
    }
    setLoading(true);
    void load();
  }, [userId, me, navigate, load]);

  const toggleFollow = async () => {
    if (!userId || !profile || followBusy) return;
    setFollowBusy(true);
    try {
      if (profile.relacao.seguindo) await unfollowUser(userId);
      else await followUser(userId);
      await load();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível atualizar.'), { variant: 'error' });
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-bold text-stone-500">Perfil não encontrado.</p>
        <button type="button" className="game-link-btn" onClick={() => navigate(-1)}>
          ← Voltar
        </button>
      </div>
    );
  }

  const equippedTitle = profile.titulo_equipado
    ? COSMETIC_BY_ID[profile.titulo_equipado]?.nome
    : null;
  const titleClass =
    profile.titulo_equipado === 'titulo_dono_do_jogo'
      ? 'game-profile-hero__title cosmetic-title--dono-do-jogo'
      : profile.titulo_equipado === 'titulo_secreto'
        ? 'game-profile-hero__title cosmetic-title--secreto'
        : 'game-profile-hero__title';
  const fundoKey = profile.banner_equipado.replace('fundo_', '');
  const heroShellClass =
    fundoKey === 'padrao'
      ? 'game-profile-hero-shell game-profile-hero-shell--default'
      : fundoKey === 'praia'
        ? `game-profile-hero-shell game-profile-hero-shell--skinned-light game-card-banner--${fundoKey}`
        : `game-profile-hero-shell game-profile-hero-shell--skinned game-card-banner--${fundoKey}`;
  const podiumTotal = profile.podio.first + profile.podio.second + profile.podio.third;
  const { relacao, social } = profile;

  const followLabel = relacao.amigo ? 'Amigos' : relacao.seguindo ? 'Seguindo' : 'Seguir';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="game-icon-btn"
          aria-label="Voltar"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="flex items-center gap-2">
          {relacao.segue_voce && !relacao.amigo && (
            <span className="friends-chip">segue você</span>
          )}
          <button
            type="button"
            className={`follow-card__btn${relacao.seguindo ? ' follow-card__btn--done' : ''}${relacao.amigo ? ' follow-card__btn--friend' : ''}`}
            disabled={followBusy}
            onClick={() => void toggleFollow()}
          >
            {relacao.seguindo ? <Check size={14} aria-hidden /> : <UserPlus size={14} aria-hidden />}
            {followLabel}
          </button>
        </div>
      </div>

      <div className={heroShellClass}>
        <i className="game-profile-hero-shell__ring" aria-hidden />
        <div className="game-profile-hero">
          <span className="game-profile-hero__avatar-wrap">
            <UserAvatar
              nome={profile.nome}
              avatarUrl={profile.avatar_url}
              moldura={profile.moldura_equipada}
              molduraCount={molduraCountOf(profile, profile.moldura_equipada)}
              size="lg"
            />
            <span
              className="game-profile-hero__level-badge"
              aria-label={`Nível ${profile.level}`}
            >
              {profile.level}
            </span>
          </span>
          <div className="game-profile-hero__meta min-w-0">
            <p className="game-profile-hero__name-row">
              <span className="game-profile-hero__name truncate">{profile.nome}</span>
              {equippedTitle && <span className={titleClass}>{equippedTitle}</span>}
            </p>
            {profile.descricao && <p className="game-profile-hero__bio">{profile.descricao}</p>}
          </div>
        </div>

        <div className="profile-counts" aria-label="Rede do jogador">
          <span className="profile-counts__item">
            <strong>{social.amigos}</strong>
            <span>amigos</span>
          </span>
          <span className="profile-counts__item">
            <strong>{social.followers}</strong>
            <span>seguidores</span>
          </span>
          <span className="profile-counts__item">
            <strong>{social.following}</strong>
            <span>seguindo</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="public-profile-stat">
          <Flame size={16} className="text-orange-500" aria-hidden />
          <strong>{profile.streak_atual}d</strong>
          <span>Streak</span>
        </div>
        <div className="public-profile-stat">
          <Trophy size={16} className="text-amber-500" aria-hidden />
          <strong>{podiumTotal}</strong>
          <span>Pódios</span>
        </div>
        <div className="public-profile-stat">
          <Timer size={16} className="text-sky-600" aria-hidden />
          <strong>{formatTrainingDuration(profile.tempo_jogo_minutos * 60)}</strong>
          <span>Treinando</span>
        </div>
      </div>

      <section className="glass-card p-4" aria-label="Conquistas">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="game-section-title mb-0">Conquistas</h3>
          <p className="text-xs font-bold text-stone-500">
            {profile.conquistas.desbloqueadas}/{profile.conquistas.total}
          </p>
        </div>
        {profile.conquistas.destaque.length === 0 ? (
          <p className="text-sm font-bold text-stone-500">Nenhuma conquista ainda.</p>
        ) : (
          <ul className="public-profile-achievements">
            {profile.conquistas.destaque.map((c) => (
              <li key={c.id} className="public-profile-achievements__item" title={c.titulo}>
                <AchievementBadge icon={c.icon} unlocked size={18} />
                <span>{c.titulo}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card p-4" aria-label="Melhores recordes">
        <h3 className="game-section-title mb-3">Top 3 recordes</h3>
        {profile.records_top.length === 0 ? (
          <p className="text-sm font-bold text-stone-500">Sem recordes registrados ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {profile.records_top.map((r, index) => (
              <li
                key={r.slug}
                className="flex items-center justify-between gap-2 rounded-xl border-2 border-stone-100 bg-stone-50 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Medal
                    className={`shrink-0 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-700'}`}
                    size={16}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-bold text-stone-700">{r.nome}</span>
                </span>
                <span className="shrink-0 text-sm font-extrabold text-emerald-700">
                  {r.melhor_valor}
                  {r.unidade === 'segundos' ? 's' : ' reps'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
