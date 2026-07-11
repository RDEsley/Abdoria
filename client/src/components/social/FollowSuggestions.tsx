import { useEffect, useState } from 'react';
import { UserPlus, Check, Share2 } from 'lucide-react';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { followUser, getFollowSuggestions, type FollowSuggestion } from '@/lib/api/social';

/** Convite via Web Share (fallback: copia o link) quando não há ninguém pra sugerir. */
async function shareInvite() {
  const text = 'Bora treinar comigo no Abdoria — treino de abdômen com XP, streak e ranking!';
  const url = window.location.origin;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Abdoria · Core Quest', text, url });
      return;
    }
  } catch {
    return; // usuário cancelou o share
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  showGameToast('Link copiado — manda pra quem vai treinar com você!', { variant: 'success' });
}

export function FollowSuggestions() {
  const [items, setItems] = useState<FollowSuggestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getFollowSuggestions()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFollow = async (userId: string) => {
    setFollowed((current) => new Set(current).add(userId));
    try {
      await followUser(userId);
    } catch (err) {
      setFollowed((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      showGameToast(getErrorMessage(err, 'Não foi possível seguir.'), { variant: 'error' });
    }
  };

  if (!loaded) return null;

  return (
    <section aria-label="Sugestões de perfis">
      <h3 className="game-section-title">Sugestões pra seguir</h3>
      {items.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-2 p-4 text-center">
          <p className="text-sm font-bold text-stone-500">
            Ninguém novo por aqui — chama alguém pro treino.
          </p>
          <button type="button" className="follow-card__btn" onClick={() => void shareInvite()}>
            <Share2 size={14} aria-hidden />
            Adicionar alguém
          </button>
        </div>
      ) : (
        <div className="follow-suggestions" role="list">
          {items.map((item) => {
            const isFollowed = followed.has(item.user_id);
            return (
              <div key={item.user_id} role="listitem" className="follow-card">
                <UserAvatar
                  nome={item.nome}
                  avatarUrl={item.avatar_url}
                  moldura={item.moldura_equipada}
                  size="md"
                />
                <p className="follow-card__name">{item.nome}</p>
                <p className="follow-card__meta">Nível {item.level}</p>
                <button
                  type="button"
                  className={`follow-card__btn${isFollowed ? ' follow-card__btn--done' : ''}`}
                  disabled={isFollowed}
                  onClick={() => void handleFollow(item.user_id)}
                >
                  {isFollowed ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    <UserPlus size={14} aria-hidden />
                  )}
                  {isFollowed ? 'Seguindo' : 'Seguir'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
