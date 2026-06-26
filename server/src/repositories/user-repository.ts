import { getSupabase } from '../db.js';
import {
  DEFAULT_COSMETICOS,
  DEFAULT_USER_DADOS_SALVOS,
  DEFAULT_PREFERENCIAS,
  DEFAULT_AFK_COMBAT,
  type AfkCombatState,
  type AfkEnemyId,
  type AfkPendingReward,
  type AfkState,
  getEnemyMaxHp,
} from '../types/index.js';
import type { UserDocument, UserLean } from '../types/user-document.js';

const EMPTY_AFK_PENDING: AfkPendingReward = {
  xp: 0,
  abdoria: 0,
  energy_drinks: 0,
  cosmetic_ids: [],
  titulo_secreto: false,
};

type ProfileRow = {
  id: string;
  email: string;
  password_hash?: string | null;
  nome: string;
  idade?: number | null;
  peso_kg?: number | null;
  altura_cm?: number | null;
  imc?: number | null;
  nivel: string;
  objetivo: string;
  gamificacao: Record<string, unknown>;
  cosmeticos: Record<string, unknown>;
  loja_diaria: Record<string, unknown>;
  simulacao_definicao: Record<string, unknown>;
  preferencias: Record<string, unknown>;
  dados_salvos: Record<string, unknown>;
  xp_diario: Record<string, unknown>;
  inventario: Record<string, unknown>;
  onboarding_completed: boolean;
  terms_accepted_at?: string | null;
  muscle_map_reset_at?: string | null;
  is_guest: boolean;
  is_demo_npc: boolean;
  created_at: string;
  updated_at: string;
};

type AfkRow = {
  user_id: string;
  last_seen_at?: string | null;
  minutos_acumulados: number;
  pending: Record<string, unknown>;
  combat?: Record<string, unknown>;
};

const VALID_ENEMY_IDS = new Set<string>([
  'bat', 'zombie', 'skeleton', 'armored_skeleton', 'demon_bat', 'slime_knight',
  'boss_colossus', 'boss_lich', 'boss_hydra',
]);

function normalizeCombat(raw: unknown): AfkCombatState {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<AfkCombatState>;
  const enemy_id = VALID_ENEMY_IDS.has(String(c.enemy_id ?? ''))
    ? (c.enemy_id as AfkEnemyId)
    : DEFAULT_AFK_COMBAT.enemy_id;
  const maxHp = getEnemyMaxHp(enemy_id);
  const enemy_hp = Math.max(1, Math.min(maxHp, Number(c.enemy_hp ?? maxHp)));
  return {
    kills_total: Math.max(0, Number(c.kills_total ?? 0)),
    kills_until_boss: Math.max(0, Math.min(99, Number(c.kills_until_boss ?? 0))),
    enemy_id,
    enemy_hp,
    is_boss: Boolean(c.is_boss),
    elite: Boolean(c.elite),
  };
}

function normalizePending(raw: unknown): AfkPendingReward {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<AfkPendingReward>;
  return {
    xp: Number(p.xp ?? 0),
    abdoria: Number(p.abdoria ?? 0),
    energy_drinks: Number(p.energy_drinks ?? 0),
    cosmetic_ids: Array.isArray(p.cosmetic_ids) ? [...p.cosmetic_ids] : [],
    titulo_secreto: Boolean(p.titulo_secreto),
  };
}

function rowToUser(profile: ProfileRow, afk?: AfkRow | null, includePassword = false): UserDocument {
  const pending = normalizePending(afk?.pending);
  const afkState: AfkState & { pending: AfkPendingReward } = {
    last_seen_at: afk?.last_seen_at ?? null,
    minutos_acumulados: afk?.minutos_acumulados ?? 0,
    pending,
    combat: normalizeCombat(afk?.combat),
  };

  const user: UserDocument = {
    id: profile.id,
    email: profile.email,
    nome: profile.nome,
    idade: profile.idade ?? undefined,
    peso_kg: profile.peso_kg != null ? Number(profile.peso_kg) : undefined,
    altura_cm: profile.altura_cm != null ? Number(profile.altura_cm) : undefined,
    imc: profile.imc != null ? Number(profile.imc) : undefined,
    nivel: profile.nivel as UserDocument['nivel'],
    objetivo: profile.objetivo as UserDocument['objetivo'],
    gamificacao: profile.gamificacao as unknown as UserDocument['gamificacao'],
    cosmeticos: { ...DEFAULT_COSMETICOS, ...(profile.cosmeticos as unknown as UserDocument['cosmeticos']) },
    loja_diaria: profile.loja_diaria as unknown as UserDocument['loja_diaria'],
    simulacao_definicao: profile.simulacao_definicao as unknown as UserDocument['simulacao_definicao'],
    preferencias: {
      ...DEFAULT_PREFERENCIAS,
      ...(profile.preferencias as unknown as UserDocument['preferencias']),
      exercicios_fixos: (profile.preferencias as unknown as UserDocument['preferencias'])?.exercicios_fixos ?? [],
      exercicios_nao_recomendar:
        (profile.preferencias as unknown as UserDocument['preferencias'])?.exercicios_nao_recomendar ?? [],
      ciclos_completados_rodada:
        (profile.preferencias as unknown as UserDocument['preferencias'])?.ciclos_completados_rodada ?? {},
    },
    dados_salvos: { ...DEFAULT_USER_DADOS_SALVOS, ...(profile.dados_salvos as unknown as UserDocument['dados_salvos']) },
    xp_diario: profile.xp_diario as unknown as UserDocument['xp_diario'],
    inventario: profile.inventario as unknown as UserDocument['inventario'],
    afk: afkState,
    onboarding_completed: profile.onboarding_completed,
    terms_accepted_at: profile.terms_accepted_at ?? null,
    muscle_map_reset_at: profile.muscle_map_reset_at ?? null,
    is_guest: profile.is_guest,
    is_demo_npc: profile.is_demo_npc,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };

  if (includePassword && profile.password_hash) {
    user.passwordHash = profile.password_hash;
  }

  return user;
}

function userToProfileRow(user: UserDocument): Record<string, unknown> {
  return {
    email: user.email,
    password_hash: user.passwordHash ?? undefined,
    nome: user.nome,
    idade: user.idade ?? null,
    peso_kg: user.peso_kg ?? null,
    altura_cm: user.altura_cm ?? null,
    imc: user.imc ?? null,
    nivel: user.nivel,
    objetivo: user.objetivo,
    gamificacao: user.gamificacao,
    cosmeticos: user.cosmeticos,
    loja_diaria: user.loja_diaria,
    simulacao_definicao: user.simulacao_definicao,
    preferencias: user.preferencias,
    dados_salvos: user.dados_salvos,
    xp_diario: user.xp_diario,
    inventario: user.inventario,
    onboarding_completed: user.onboarding_completed,
    terms_accepted_at: user.terms_accepted_at ?? null,
    muscle_map_reset_at: user.muscle_map_reset_at ?? null,
    is_guest: user.is_guest,
    is_demo_npc: user.is_demo_npc,
  };
}

async function fetchAfk(userId: string): Promise<AfkRow | null> {
  const sb = getSupabase();
  const { data } = await sb.from('user_afk_state').select('*').eq('user_id', userId).maybeSingle();
  return data as AfkRow | null;
}

async function fetchAfkBatch(userIds: string[]): Promise<Map<string, AfkRow>> {
  const map = new Map<string, AfkRow>();
  if (userIds.length === 0) return map;

  const sb = getSupabase();
  const { data } = await sb.from('user_afk_state').select('*').in('user_id', userIds);
  for (const row of (data ?? []) as AfkRow[]) {
    map.set(row.user_id, row);
  }
  return map;
}

async function ensureAfkRow(userId: string): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.from('user_afk_state').select('user_id').eq('user_id', userId).maybeSingle();
  if (!data) {
    await sb.from('user_afk_state').insert({
      user_id: userId,
      pending: EMPTY_AFK_PENDING,
      combat: DEFAULT_AFK_COMBAT,
    });
  }
}

function mapPatchToRow(patch: Record<string, unknown>): Record<string, unknown> {
  const row = { ...patch };
  if ('passwordHash' in row) {
    row.password_hash = row.passwordHash;
    delete row.passwordHash;
  }
  return row;
}

export class UserMutable implements UserDocument {
  id!: string;
  email!: string;
  passwordHash?: string;
  nome!: string;
  idade?: number;
  peso_kg?: number;
  altura_cm?: number;
  imc?: number;
  nivel!: UserDocument['nivel'];
  objetivo!: UserDocument['objetivo'];
  gamificacao!: UserDocument['gamificacao'];
  cosmeticos!: UserDocument['cosmeticos'];
  loja_diaria!: UserDocument['loja_diaria'];
  simulacao_definicao!: UserDocument['simulacao_definicao'];
  preferencias!: UserDocument['preferencias'];
  dados_salvos!: UserDocument['dados_salvos'];
  xp_diario!: UserDocument['xp_diario'];
  inventario!: UserDocument['inventario'];
  afk!: UserDocument['afk'];
  onboarding_completed!: boolean;
  terms_accepted_at?: Date | string | null;
  muscle_map_reset_at?: Date | string | null;
  is_guest!: boolean;
  is_demo_npc!: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;

  constructor(data: UserDocument) {
    Object.assign(this, data);
    this.afk = {
      ...data.afk,
      pending: normalizePending(data.afk?.pending),
      combat: normalizeCombat(data.afk?.combat),
    };
  }

  set(path: string, value: unknown): void {
    (this as Record<string, unknown>)[path] = value;
  }

  async save(): Promise<UserMutable> {
    const sb = getSupabase();
    const profileUpdate = userToProfileRow(this);
    delete profileUpdate.email;

    const { error: profileError } = await sb
      .from('profiles')
      .update(profileUpdate)
      .eq('id', this.id);

    if (profileError) throw profileError;

    await ensureAfkRow(this.id);
    const afkPayload = {
      last_seen_at: this.afk.last_seen_at,
      minutos_acumulados: this.afk.minutos_acumulados ?? 0,
      pending: normalizePending(this.afk.pending),
      combat: normalizeCombat(this.afk.combat),
    };

    let { error: afkError } = await sb
      .from('user_afk_state')
      .update(afkPayload)
      .eq('user_id', this.id);

    if (afkError?.code === 'PGRST204' && String(afkError.message ?? '').includes('combat')) {
      const { combat: _combat, ...legacyPayload } = afkPayload;
      ({ error: afkError } = await sb
        .from('user_afk_state')
        .update(legacyPayload)
        .eq('user_id', this.id));
    }

    if (afkError) throw afkError;
    return this;
  }
}

export const User = {
  async findById(
    id: string,
    options?: { select?: string; lean?: boolean },
  ): Promise<UserMutable | null> {
    const sb = getSupabase();
    const selectPassword = options?.select?.includes('passwordHash') || options?.select?.includes('+passwordHash');

    const { data: profile, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !profile) return null;

    const afk = await fetchAfk(id);
    const user = rowToUser(profile as ProfileRow, afk, selectPassword);

    if (options?.lean) return Object.assign(new UserMutable(user), user);
    return new UserMutable(user);
  },

  async findOne(
    filter: { email?: string },
    options?: { select?: string },
  ): Promise<UserMutable | null> {
    const sb = getSupabase();
    const selectPassword = options?.select?.includes('passwordHash') || options?.select?.includes('+passwordHash');
    let query = sb.from('profiles').select('*');
    if (filter.email) query = query.eq('email', filter.email);
    const { data: profile, error } = await query.maybeSingle();
    if (error || !profile) return null;

    const afk = await fetchAfk(profile.id);
    return new UserMutable(rowToUser(profile as ProfileRow, afk, selectPassword));
  },

  async find(
    filter: Record<string, unknown>,
    options?: { sort?: Record<string, 1 | -1>; limit?: number; select?: string },
  ): Promise<UserLean[]> {
    const sb = getSupabase();
    let query = sb.from('profiles').select('*');

    if (filter.is_guest === false) query = query.eq('is_guest', false);
    if (filter.is_demo_npc === false) query = query.eq('is_demo_npc', false);
    if (filter.onboarding_completed === true) query = query.eq('onboarding_completed', true);

    if (options?.sort) {
      const [field, dir] = Object.entries(options.sort)[0] ?? [];
      if (field === 'gamificacao.nivel_xp') {
        query = query.order('gamificacao->nivel_xp', { ascending: dir === 1 });
      } else if (field === 'gamificacao.streak_atual') {
        query = query.order('gamificacao->streak_atual', { ascending: dir === 1 });
      } else if (field === 'cosmeticos.moedas') {
        query = query.order('cosmeticos->moedas', { ascending: dir === 1 });
      }
    }

    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];

    const profiles = data as ProfileRow[];
    const afkMap = await fetchAfkBatch(profiles.map((p) => p.id));
    return profiles.map((p) => rowToUser(p, afkMap.get(p.id) ?? null));
  },

  async countLeaderboardRank(
    user: {
      id: string;
      nome: string;
      gamificacao: { nivel_xp: number; streak_atual: number };
      cosmeticos?: { moedas?: number | null } | null;
    },
    metric: 'xp' | 'streak' | 'moedas',
  ): Promise<number> {
    const sb = getSupabase();
    const base = () =>
      sb
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('onboarding_completed', true)
        .eq('is_guest', false);

    if (metric === 'xp') {
      const value = user.gamificacao.nivel_xp;
      const [{ count: higher }, { count: tiedName }] = await Promise.all([
        base().gt('gamificacao->nivel_xp', value),
        base().eq('gamificacao->nivel_xp', value).lt('nome', user.nome),
      ]);
      return (higher ?? 0) + (tiedName ?? 0) + 1;
    }

    if (metric === 'streak') {
      const value = user.gamificacao.streak_atual;
      const { count } = await base().gt('gamificacao->streak_atual', value);
      return (count ?? 0) + 1;
    }

    const value = user.cosmeticos?.moedas ?? 0;
    const { count } = await base().gt('cosmeticos->moedas', value);
    return (count ?? 0) + 1;
  },

  async countDocuments(filter: Record<string, unknown>): Promise<number> {
    const sb = getSupabase();
    let query = sb.from('profiles').select('id', { count: 'exact', head: true });
    if (filter.is_guest === false) query = query.eq('is_guest', false);
    if (filter.is_demo_npc === false) query = query.eq('is_demo_npc', false);
    if (filter.onboarding_completed === true) query = query.eq('onboarding_completed', true);
    const { count } = await query;
    return count ?? 0;
  },

  async create(data: Partial<UserDocument> & { email: string; nome: string }): Promise<UserMutable> {
    const sb = getSupabase();
    const row = {
      email: data.email,
      password_hash: data.passwordHash,
      nome: data.nome,
      nivel: data.nivel ?? 'iniciante',
      objetivo: data.objetivo ?? 'definicao',
      gamificacao: data.gamificacao ?? { nivel_xp: 0, streak_atual: 0, streak_maior: 0, total_minutos: 0, conquistas: [] },
      cosmeticos: data.cosmeticos ?? DEFAULT_COSMETICOS,
      loja_diaria: data.loja_diaria ?? { data_reset: '', slots: [] },
      simulacao_definicao: data.simulacao_definicao ?? { gordura_meta_pct: 12 },
      preferencias: { ...DEFAULT_PREFERENCIAS, ...(data.preferencias ?? {}) },
      dados_salvos: data.dados_salvos ?? DEFAULT_USER_DADOS_SALVOS,
      xp_diario: data.xp_diario ?? { ganho_hoje: 0, extra_hoje: 0, data_reset: '', bonus_pool_restante: 0, bonus_pool_total: 0 },
      inventario: data.inventario ?? { itens: [] },
      onboarding_completed: data.onboarding_completed ?? false,
      is_guest: data.is_guest ?? false,
      is_demo_npc: data.is_demo_npc ?? false,
    };

    const { data: profile, error } = await sb.from('profiles').insert(row).select('*').single();
    if (error || !profile) throw error ?? new Error('Falha ao criar usuário');

    await sb.from('user_afk_state').insert({
      user_id: profile.id,
      pending: EMPTY_AFK_PENDING,
      combat: DEFAULT_AFK_COMBAT,
    });

    const afk = await fetchAfk(profile.id);
    return new UserMutable(rowToUser(profile as ProfileRow, afk));
  },

  async findByIdAndUpdate(
    id: string,
    update: { $set?: Record<string, unknown> },
    _options?: { new?: boolean },
  ): Promise<UserLean | null> {
    const sb = getSupabase();
    const patch = mapPatchToRow(update.$set ?? {});
    const { error } = await sb.from('profiles').update(patch).eq('id', id);
    if (error) throw error;
    return User.findById(id, { lean: true }) as Promise<UserLean | null>;
  },

  async findOneAndUpdate(
    filter: { email: string },
    update: { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown> },
    options?: { upsert?: boolean; new?: boolean },
  ): Promise<UserLean | null> {
    const existing = await User.findOne({ email: filter.email });

    if (existing) {
      const patch = mapPatchToRow(update.$set ?? {});
      const sb = getSupabase();
      await sb.from('profiles').update(patch).eq('id', existing.id);
      return User.findById(existing.id, { lean: true }) as Promise<UserLean | null>;
    }

    if (options?.upsert) {
      const merged = mapPatchToRow({
        ...(update.$setOnInsert ?? {}),
        ...(update.$set ?? {}),
      });
      const nome = (merged.nome as string) ?? 'Usuário';
      const created = await User.create({
        email: filter.email,
        nome,
        passwordHash: merged.password_hash as string | undefined,
        ...merged,
      } as Partial<UserDocument> & { email: string; nome: string });
      return User.findById(created.id, { lean: true }) as Promise<UserLean | null>;
    }

    return null;
  },
};

export { normalizePending, normalizeCombat, EMPTY_AFK_PENDING };
