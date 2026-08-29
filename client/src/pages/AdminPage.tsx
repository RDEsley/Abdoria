import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Coins,
  Flag,
  Leaf,
  KeyRound,
  Lightbulb,
  Pencil,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { AdminDeleteUserModal } from '@/components/admin/AdminDeleteUserModal';
import { ModerationModal } from '@/components/admin/ModerationModal';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/PageLoader';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/AuthContext';
import {
  getAdminOverview,
  getAdminReports,
  getAdminUsers,
  patchAdminUser,
  resolveAdminReport,
  type AdminOverviewResponse,
  type AdminReportEntry,
  type AdminUserEntry,
} from '@/lib/api';
import { isBanimentoAtivo, NOME_MAX_LENGTH, REPORT_MOTIVO_LABELS, type UserRole } from '@/types';

type Tab = 'avaliacoes' | 'sugestoes' | 'usuarios' | 'denuncias';

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Jogador',
  moderador: 'Moderador',
  admin: 'Admin',
};

function Stars({ value }: { value: number }) {
  return (
    <span className="admin-stars" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          className={i < value ? 'admin-stars__on' : 'admin-stars__off'}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** Painel de administração — só o botão do perfil de contas admin chega aqui. */
export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('avaliacoes');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [reports, setReports] = useState<AdminReportEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUserEntry | null>(null);
  const [moderating, setModerating] = useState<AdminUserEntry | null>(null);
  const [deleting, setDeleting] = useState<AdminUserEntry | null>(null);

  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, list, reportList] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminReports('pendente'),
      ]);
      setOverview(ov);
      setUsers(list.users);
      setReports(reportList.reports);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar o painel.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (entry) =>
        entry.nome.toLowerCase().includes(q) ||
        entry.email.toLowerCase().includes(q) ||
        (entry.tag ?? '').toLowerCase().includes(q),
    );
  }, [users, query]);

  const applyEntry = (entry: AdminUserEntry) => {
    setUsers((prev) => prev.map((item) => (item.id === entry.id ? entry : item)));
  };

  const resolveReport = async (id: string, status: 'revisado' | 'arquivado') => {
    try {
      await resolveAdminReport(id, status);
      setReports((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível atualizar a denúncia.'), {
        variant: 'error',
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Shield size={32} className="text-stone-400" aria-hidden />
        <p className="text-sm font-bold text-stone-500">Acesso restrito à administração.</p>
        <GameButton onClick={() => navigate('/perfil')}>Voltar</GameButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-16">
      <header className="flex items-center gap-3">
        <button
          type="button"
          className="game-icon-btn"
          aria-label="Voltar ao perfil"
          onClick={() => navigate('/perfil')}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-stone-900">Administração</h1>
          <p className="text-xs font-bold text-stone-500">
            {overview ? `${overview.total_usuarios} contas · ` : ''}
            {overview?.media_estrelas != null
              ? `nota média ${overview.media_estrelas.toFixed(1)}★`
              : 'sem avaliações ainda'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2">
        {(
          [
            { id: 'avaliacoes', label: 'Avaliações', Icon: Star, count: 0 },
            { id: 'sugestoes', label: 'Sugestões', Icon: Lightbulb, count: 0 },
            { id: 'usuarios', label: 'Usuários', Icon: Users, count: 0 },
            { id: 'denuncias', label: 'Denúncias', Icon: Flag, count: reports.length },
          ] as const
        ).map(({ id, label, Icon, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative flex cursor-pointer items-center justify-center gap-1 rounded-full border-2 py-2 text-[0.7rem] font-bold ${
              tab === id
                ? 'border-stone-900 bg-emerald-500 text-white shadow-[2px_2px_0_#1c1917]'
                : 'border-stone-900 bg-white text-stone-700'
            }`}
          >
            <Icon size={14} /> {label}
            {count > 0 && <span className="admin-tab-badge">{count > 99 ? '99+' : count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : tab === 'avaliacoes' ? (
        <section className="flex flex-col gap-2">
          {(overview?.ratings.length ?? 0) === 0 && (
            <p className="py-8 text-center text-sm font-bold text-stone-500">
              Nenhuma avaliação ainda — o popup aparece quando o jogador atinge 3 dias de streak.
            </p>
          )}
          {overview?.ratings.map((rating) => (
            <article key={rating.id} className="glass-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold text-stone-800">{rating.nome}</p>
                <Stars value={rating.estrelas} />
              </div>
              {rating.comentario && (
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-stone-600">
                  {rating.comentario}
                </p>
              )}
              <p className="mt-1 text-[0.62rem] font-bold text-stone-400">
                {new Date(rating.criada_em).toLocaleDateString('pt-BR')}
              </p>
            </article>
          ))}
        </section>
      ) : tab === 'sugestoes' ? (
        <section className="flex flex-col gap-2">
          {(overview?.suggestions?.length ?? 0) === 0 && (
            <p className="py-8 text-center text-sm font-bold text-stone-500">
              Nenhuma sugestão ainda — o popup aparece quando o jogador atinge 7 dias de streak.
            </p>
          )}
          {overview?.suggestions?.map((suggestion) => (
            <article key={suggestion.id} className="glass-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold text-stone-800">{suggestion.nome}</p>
                <span className="shrink-0 text-[0.62rem] font-bold text-stone-400">
                  {new Date(suggestion.criada_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-stone-600">
                {suggestion.texto}
              </p>
            </article>
          ))}
        </section>
      ) : tab === 'usuarios' ? (
        <section className="flex flex-col gap-2">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, email ou tag..."
              className="w-full rounded-xl border-2 border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium outline-none focus:border-emerald-500"
            />
          </label>

          {filteredUsers.map((entry) => {
            const banned = isBanimentoAtivo(entry.banimento);
            return (
              <article key={entry.id} className={`glass-card p-3${banned ? ' opacity-80' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-stone-800">
                      {entry.nome}
                      {entry.tag && <span className="ml-1 text-stone-400">#{entry.tag}</span>}
                      {entry.role !== 'user' && (
                        <span className="ml-1.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[0.58rem] font-black uppercase text-purple-700">
                          {ROLE_LABELS[entry.role]}
                        </span>
                      )}
                      {banned && (
                        <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[0.58rem] font-black uppercase text-rose-700">
                          {entry.banimento?.tipo === 'ban' ? 'Banido' : 'Suspenso'}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[0.65rem] font-semibold text-stone-500">
                      {entry.email} · nível XP {entry.nivel_xp} · streak {entry.streak_atual}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[0.65rem] font-bold text-stone-600">
                      <span className="inline-flex items-center gap-0.5">
                        <Coins size={11} className="text-amber-600" aria-hidden /> {entry.coins}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Leaf size={11} className="text-emerald-600" aria-hidden /> {entry.gems}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="game-icon-btn !h-8 !w-8"
                      aria-label={`Editar ${entry.nome}`}
                      title="Editar conta"
                      onClick={() => setEditing(entry)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="game-icon-btn !h-8 !w-8"
                      aria-label={`Moderar ${entry.nome}`}
                      title={banned ? 'Ver punição' : 'Banir ou suspender'}
                      onClick={() => setModerating(entry)}
                    >
                      {banned ? (
                        <ShieldCheck size={14} className="text-rose-600" />
                      ) : (
                        <Ban size={14} />
                      )}
                    </button>
                    {entry.role !== 'admin' && entry.id !== user?.id && (
                      <button
                        type="button"
                        className="game-icon-btn !h-8 !w-8 !text-rose-600"
                        aria-label={`Apagar conta de ${entry.nome}`}
                        title="Apagar conta"
                        onClick={() => setDeleting(entry)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          {reports.length === 0 && (
            <p className="py-8 text-center text-sm font-bold text-stone-500">
              Nenhuma denúncia pendente — tudo tranquilo por aqui.
            </p>
          )}
          {reports.map((report) => (
            <article key={report.id} className="glass-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-extrabold text-stone-800">
                  {report.reported_nome}
                </p>
                <span className="shrink-0 text-[0.62rem] font-bold text-stone-400">
                  {new Date(report.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="mt-1 text-[0.65rem] font-bold text-rose-600">
                {REPORT_MOTIVO_LABELS[report.motivo]}
              </p>
              <p className="mt-0.5 text-[0.65rem] font-semibold text-stone-500">
                Denunciado por {report.reporter_nome}
              </p>
              {report.descricao && (
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-stone-600">
                  {report.descricao}
                </p>
              )}
              <div className="mt-2.5 flex gap-2">
                <GameButton
                  variant="secondary"
                  className="!w-auto flex-1 !text-xs"
                  onClick={() => void resolveReport(report.id, 'arquivado')}
                >
                  Arquivar
                </GameButton>
                <GameButton
                  variant="danger"
                  className="!w-auto flex-1 !text-xs"
                  onClick={() =>
                    setModerating({
                      id: report.reported_id,
                      nome: report.reported_nome,
                      email: '',
                      tag: null,
                      role: 'user',
                      coins: 0,
                      gems: 0,
                      nivel_xp: 0,
                      streak_atual: 0,
                      banimento: null,
                      is_guest: false,
                    })
                  }
                >
                  Moderar
                </GameButton>
                <GameButton
                  className="!w-auto flex-1 !text-xs"
                  onClick={() => void resolveReport(report.id, 'revisado')}
                >
                  Revisado
                </GameButton>
              </div>
            </article>
          ))}
        </section>
      )}

      {editing && (
        <AdminEditModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={(entry) => {
            applyEntry(entry);
            setEditing(null);
          }}
        />
      )}

      {moderating && (
        <ModerationModal
          open
          userId={moderating.id}
          userName={moderating.nome}
          banimento={moderating.banimento}
          onClose={() => setModerating(null)}
          onChanged={(banimento) => applyEntry({ ...moderating, banimento })}
        />
      )}

      {deleting && (
        <AdminDeleteUserModal
          open
          userId={deleting.id}
          userName={deleting.nome}
          onClose={() => setDeleting(null)}
          onDeleted={() => setUsers((prev) => prev.filter((item) => item.id !== deleting.id))}
        />
      )}
    </div>
  );
}

function AdminEditModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: AdminUserEntry;
  onClose: () => void;
  onSaved: (entry: AdminUserEntry) => void;
}) {
  const [nome, setNome] = useState(entry.nome);
  const [senha, setSenha] = useState('');
  const [coins, setCoins] = useState(entry.coins);
  const [gems, setGems] = useState(entry.gems);
  const [role, setRole] = useState<UserRole>(entry.role);
  const [busy, setBusy] = useState(false);

  const salvar = async () => {
    setBusy(true);
    try {
      const res = await patchAdminUser(entry.id, {
        ...(nome.trim() !== entry.nome ? { nome: nome.trim() } : {}),
        ...(senha.length >= 6 ? { senha } : {}),
        ...(coins !== entry.coins ? { coins } : {}),
        ...(gems !== entry.gems ? { gems } : {}),
        ...(role !== entry.role ? { role } : {}),
      });
      onSaved(res.user);
      showGameToast('Conta atualizada.', { variant: 'success' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'mt-1 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500';

  return (
    <Modal open onClose={onClose} labelledBy="admin-edit-title">
      <h2 id="admin-edit-title" className="text-base font-extrabold text-stone-800">
        Editar {entry.nome}
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        <label className="block text-sm font-semibold">
          Nome
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={NOME_MAX_LENGTH}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-semibold">
          <span className="flex items-center gap-1">
            <KeyRound size={13} aria-hidden /> Nova senha (opcional, mín. 6)
          </span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Deixe vazio pra manter"
            className={fieldClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Coins
            <input
              type="number"
              min={0}
              value={coins}
              onChange={(e) => setCoins(Math.max(0, Number(e.target.value)))}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-semibold">
            Folhas
            <input
              type="number"
              min={0}
              value={gems}
              onChange={(e) => setGems(Math.max(0, Number(e.target.value)))}
              className={fieldClass}
            />
          </label>
        </div>
        <div>
          <p className="text-sm font-semibold">Papel</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(['user', 'moderador', 'admin'] as UserRole[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`cursor-pointer rounded-xl border-2 py-2 text-xs font-bold ${
                  role === option ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                }`}
              >
                {ROLE_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <GameButton variant="secondary" className="!w-auto flex-1" onClick={onClose}>
          Cancelar
        </GameButton>
        <GameButton className="!w-auto flex-1" disabled={busy} onClick={() => void salvar()}>
          {busy ? 'Salvando...' : 'Salvar'}
        </GameButton>
      </div>
    </Modal>
  );
}
