import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Flame, Search, Share2, Trophy, UserPlus, X } from 'lucide-react';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { playTabSwitch } from '@/lib/sounds';
import {
  followUser,
  getFollowers,
  getFollowing,
  getFriends,
  removeFollower,
  searchUsers,
  unfollowUser,
  type SocialUserEntry,
} from '@/lib/api/social';

type Tab = 'amigos' | 'seguindo' | 'seguidores';

const TABS: { id: Tab; label: string }[] = [
  { id: 'amigos', label: 'Amigos' },
  { id: 'seguindo', label: 'Seguindo' },
  { id: 'seguidores', label: 'Seguidores' },
];

/** Convite via Web Share (fallback: copia o link). */
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

function parseTab(raw: string | null): Tab {
  return raw === 'seguindo' || raw === 'seguidores' ? raw : 'amigos';
}

export function FriendsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const [items, setItems] = useState<SocialUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SocialUserEntry[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    try {
      const data =
        activeTab === 'amigos'
          ? await getFriends()
          : activeTab === 'seguindo'
            ? await getFollowing()
            : await getFollowers();
      setItems(data.items);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar a lista.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  // Busca por nome com debounce — mínimo 2 caracteres.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchUsers(q)
        .then((data) => setResults(data.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const setTab = (next: Tab) => {
    playTabSwitch();
    setSearchParams(next === 'amigos' ? {} : { tab: next }, { replace: true });
  };

  const openProfile = (entry: SocialUserEntry) => {
    navigate(entry.is_me ? '/perfil' : `/perfil/${entry.user_id}`);
  };

  const runAction = async (userId: string, action: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(userId);
    try {
      await action();
      await load(tab);
      if (results) {
        const data = await searchUsers(query.trim());
        setResults(data.items);
      }
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível concluir.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const friendsRanking = useMemo(
    () => (tab === 'amigos' ? items : null),
    [tab, items],
  );

  const renderActions = (entry: SocialUserEntry) => {
    if (entry.is_me) return null;
    const busy = busyId === entry.user_id;

    if (entry.amigo) {
      return (
        <span className="friends-chip friends-chip--friend" title="Vocês seguem um ao outro">
          <Check size={12} aria-hidden /> Amigos
        </span>
      );
    }

    if (!entry.seguindo) {
      return (
        <button
          type="button"
          className="follow-card__btn"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void runAction(entry.user_id, () => followUser(entry.user_id));
          }}
        >
          <UserPlus size={13} aria-hidden />
          {entry.segue_voce ? 'Seguir de volta' : 'Seguir'}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="follow-card__btn follow-card__btn--done"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          void runAction(entry.user_id, () => unfollowUser(entry.user_id));
        }}
        title="Deixar de seguir"
      >
        <Check size={13} aria-hidden /> Seguindo
      </button>
    );
  };

  const renderRow = (entry: SocialUserEntry, index: number) => (
    <li key={entry.user_id}>
      <div
        role="button"
        tabIndex={0}
        className={`game-rank-row friends-rank-row${entry.is_me ? ' game-rank-row--me' : ''}`}
        onClick={() => openProfile(entry)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openProfile(entry);
        }}
      >
        {friendsRanking && <span className="game-rank-row__rank">#{index + 1}</span>}
        <UserAvatar
          nome={entry.nome}
          avatarUrl={entry.avatar_url}
          moldura={entry.moldura_equipada}
          molduraCount={entry.moldura_count}
          size="sm"
        />
        <div className="game-rank-row__main">
          <span className="game-rank-row__name">{entry.is_me ? 'Você' : entry.nome}</span>
          <span className="friends-rank-row__meta">
            Nv. {entry.level}
            {entry.streak_atual > 0 && (
              <span className="friends-rank-row__streak" title="Dias seguidos">
                <Flame size={11} aria-hidden />
                {entry.streak_atual}d
              </span>
            )}
          </span>
        </div>
        {renderActions(entry)}
        {tab === 'seguidores' && !entry.is_me && (
          <button
            type="button"
            className="friends-remove"
            aria-label={`Remover ${entry.nome} dos seguidores`}
            title="Remover seguidor"
            disabled={busyId === entry.user_id}
            onClick={(e) => {
              e.stopPropagation();
              void runAction(entry.user_id, () => removeFollower(entry.user_id));
            }}
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );

  const emptyMessage =
    tab === 'amigos'
      ? 'Amizade é seguir e ser seguido de volta. Busque alguém pelo nome acima.'
      : tab === 'seguindo'
        ? 'Você ainda não segue ninguém. Busque alguém pelo nome acima.'
        : 'Ninguém segue você ainda. Convide alguém pro treino!';

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Comunidade Abdoria" title="Amigos" />

      <label className="library-search">
        <Search size={16} className="library-search__icon" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Adicionar amigo pelo nome..."
          className="library-search__input"
          aria-label="Buscar perfis pelo nome"
        />
        {query && (
          <button
            type="button"
            className="library-search__clear"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </label>

      {results !== null ? (
        <section aria-label="Resultados da busca">
          <h3 className="game-section-title">Resultados</h3>
          {searching ? (
            <p className="text-sm font-bold text-stone-500">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="text-sm font-bold text-stone-500">
              Ninguém encontrado com esse nome.
            </p>
          ) : (
            <ul className="game-rank-list">{results.map((entry, i) => renderRow(entry, i))}</ul>
          )}
        </section>
      ) : (
        <>
          <div className="game-rank-tabs" role="tablist" aria-label="Listas sociais">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`game-tab${tab === id ? ' game-tab--active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <PageLoader />
          ) : items.length === 0 || (tab === 'amigos' && items.length <= 1) ? (
            <div className="glass-card flex flex-col items-center gap-3 p-6 text-center">
              <Trophy size={22} className="text-amber-500" aria-hidden />
              <p className="text-sm font-bold text-stone-600">{emptyMessage}</p>
              <button type="button" className="follow-card__btn" onClick={() => void shareInvite()}>
                <Share2 size={14} aria-hidden />
                Convidar
              </button>
            </div>
          ) : (
            <ul className="game-rank-list" aria-label={`Lista de ${tab}`}>
              {items.map((entry, i) => renderRow(entry, i))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
