import { getSupabase } from '../db.js';
import {
  DEFAULT_COSMETICOS,
  DEFAULT_USER_DADOS_SALVOS,
  DEFAULT_PREFERENCIAS,
  DEFAULT_XP_DIARIO,
  DEFAULT_AFK_COMBAT,
  AFK_ENEMIES,
  AFK_REGIONS,
  FROZEN_STREAK_ITEM_ID,
  type AfkCombatState,
  type AfkEnemyId,
  type AfkPendingReward,
  type AfkState,
  getEnemyMaxHp,
  getAfkRegionById,
  getAfkRegionProgress,
  afkHeroMaxHp,
  isSlimeMaterialItemId,
  type SlimeMaterialItemId,
} from '../types/index.js';

/** Todo jogador novo começa com 3 Frozen Streak — colchão inicial contra falhar a streak. */
const DEFAULT_NEW_USER_INVENTARIO = { itens: [{ item_id: FROZEN_STREAK_ITEM_ID, quantidade: 3 }] };
import type { UserRecord, UserLean } from '../types/user-record.js';

const EMPTY_AFK_PENDING: AfkPendingReward = {
  xp: 0,
  abdoria: 0,
  frozen_streaks: 0,
  route_drinks: 0,
  cosmetic_ids: [],
  weapon_ids: [],
  exp_instant: 0,
  doria_bags: 0,
  material_items: {},
  titulo_secreto: false,
  drop_count: 0,
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
  avatar_url?: string | null;
  tag?: string | null;
  descricao?: string | null;
  nome_trocas?: number | null;
  role?: string | null;
  gems?: number | null;
  banimento?: Record<string, unknown> | null;
  perfil_treino?: Record<string, unknown> | null;
  plano_treino?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AfkRow = {
  user_id: string;
  last_seen_at?: string | null;
  /** Presente só depois da migration `afk_paused_at`. */
  paused_at?: string | null;
  minutos_acumulados: number;
  pending: Record<string, unknown>;
  combat?: Record<string, unknown>;
};

const VALID_ENEMY_IDS = new Set<string>(Object.keys(AFK_ENEMIES));

function normalizeCombat(raw: unknown): AfkCombatState {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<AfkCombatState>;
  const legacyRegion = getAfkRegionProgress(Number(c.kills_total ?? 0)).region;
  const region = getAfkRegionById(c.region_id ?? legacyRegion.id);
  const skillNodes = Array.isArray(c.skill_nodes) ? c.skill_nodes.filter(Boolean) : [];
  const heroMaxHp = afkHeroMaxHp(skillNodes);
  const enemy_id = VALID_ENEMY_IDS.has(String(c.enemy_id ?? ''))
    ? (c.enemy_id as AfkEnemyId)
    : DEFAULT_AFK_COMBAT.enemy_id;
  const maxHp = getEnemyMaxHp(enemy_id, region.chapter);
  const savedEnemyHp = Number(c.enemy_hp ?? maxHp);
  // HP zero nunca é um estado persistente válido: a derrota já deveria ter
  // gerado o próximo encontro. Recupera com 1 HP para o próximo golpe concluir
  // a vitória, sem ressuscitar um chefe quase derrotado com vida cheia.
  const enemy_hp = savedEnemyHp > 0 ? Math.min(maxHp, savedEnemyHp) : 1;
  const rawProgress = c.region_progress ?? {};
  const region_progress = Object.fromEntries(
    AFK_REGIONS.map((entry) => {
      const saved = rawProgress[entry.id];
      const legacyKills = entry.id === region.id ? Number(c.kills_until_boss ?? 0) : 0;
      return [
        entry.id,
        {
          kills_until_boss: Math.max(
            0,
            Math.min(entry.killsToBoss, Number(saved?.kills_until_boss ?? legacyKills)),
          ),
          boss_defeated: Boolean(saved?.boss_defeated),
          boss_kills: Math.max(0, Number(saved?.boss_kills ?? 0)),
          orbs_earned: Math.max(0, Number(saved?.orbs_earned ?? 0)),
        },
      ];
    }),
  ) as NonNullable<AfkCombatState['region_progress']>;
  const defaultUnlocked = AFK_REGIONS.filter((entry) => entry.chapter <= region.chapter).map(
    (entry) => entry.id,
  );
  const unlocked = new Set(
    (Array.isArray(c.unlocked_regions) ? c.unlocked_regions : defaultUnlocked).filter((id) =>
      AFK_REGIONS.some((entry) => entry.id === id),
    ),
  );
  unlocked.add('verdant-trail');
  return {
    kills_total: Math.max(0, Number(c.kills_total ?? 0)),
    kills_until_boss: region_progress[region.id]?.kills_until_boss ?? 0,
    enemy_id,
    enemy_hp,
    is_boss: Boolean(c.is_boss),
    elite: Boolean(c.elite),
    region_id: region.id,
    region_progress,
    unlocked_regions: AFK_REGIONS.filter((entry) => unlocked.has(entry.id)).map(
      (entry) => entry.id,
    ),
    hero_hp: Math.max(0, Math.min(heroMaxHp, Number(c.hero_hp ?? heroMaxHp))),
    hero_defeated_until: c.hero_defeated_until ?? null,
    combat_last_at: c.combat_last_at ?? null,
    search_remaining_ms: Math.max(0, Number(c.search_remaining_ms ?? 0)),
    hero_attack_remaining_ms: Math.max(0, Number(c.hero_attack_remaining_ms ?? 0)),
    enemy_attack_remaining_ms: Math.max(0, Number(c.enemy_attack_remaining_ms ?? 0)),
    defeated_remaining_ms: Math.max(0, Number(c.defeated_remaining_ms ?? 0)),
    orbs: Math.max(0, Number(c.orbs ?? 0)),
    skill_nodes: skillNodes,
    skill_tree_free_reset_used: Boolean(c.skill_tree_free_reset_used),
    adventure_started: Boolean(c.adventure_started),
    intro_seen: Boolean(c.intro_seen),
    slime_language_unlocked: Boolean(c.slime_language_unlocked),
    story_flags: Array.isArray(c.story_flags) ? c.story_flags.filter(Boolean) : [],
  };
}

function normalizePending(raw: unknown): AfkPendingReward {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<AfkPendingReward>;
  const material_items = Object.fromEntries(
    Object.entries(p.material_items ?? {})
      .filter(([itemId, amount]) => isSlimeMaterialItemId(itemId) && Number(amount) > 0)
      .map(([itemId, amount]) => [itemId, Math.max(0, Math.floor(Number(amount)))]),
  ) as Partial<Record<SlimeMaterialItemId, number>>;
  return {
    xp: Number(p.xp ?? 0),
    abdoria: Number(p.abdoria ?? 0),
    frozen_streaks: Math.max(
      0,
      Number(p.frozen_streaks ?? (p as { energy_drinks?: number }).energy_drinks ?? 0),
    ),
    route_drinks: Number(p.route_drinks ?? 0),
    cosmetic_ids: Array.isArray(p.cosmetic_ids) ? [...p.cosmetic_ids] : [],
    weapon_ids: Array.isArray(p.weapon_ids) ? [...p.weapon_ids] : [],
    exp_instant: Math.max(0, Number(p.exp_instant ?? 0)),
    doria_bags: Math.max(0, Number(p.doria_bags ?? 0)),
    material_items,
    titulo_secreto: Boolean(p.titulo_secreto),
    drop_count: Math.max(0, Number(p.drop_count ?? 0)),
  };
}

/** Lê `moldura_loja_equipada`/`banner_equipado` com fallback pros nomes antigos (`borda_equipada`/`fundo_equipado`) já persistidos em contas existentes. */
function resolveLegacyCosmeticFields(raw: Record<string, unknown>): UserRecord['cosmeticos'] {
  const legacy = raw as { borda_equipada?: string; fundo_equipado?: string };
  const merged = {
    ...DEFAULT_COSMETICOS,
    ...(raw as unknown as UserRecord['cosmeticos']),
  };
  if (
    merged.moldura_loja_equipada === DEFAULT_COSMETICOS.moldura_loja_equipada &&
    legacy.borda_equipada
  ) {
    merged.moldura_loja_equipada = legacy.borda_equipada;
  }
  if (merged.banner_equipado === DEFAULT_COSMETICOS.banner_equipado && legacy.fundo_equipado) {
    merged.banner_equipado = legacy.fundo_equipado;
  }
  return merged;
}

function rowToUser(profile: ProfileRow, afk?: AfkRow | null, includePassword = false): UserRecord {
  const pending = normalizePending(afk?.pending);
  const afkState: AfkState & { pending: AfkPendingReward } = {
    last_seen_at: afk?.last_seen_at ?? null,
    paused_at: afk?.paused_at ?? null,
    minutos_acumulados: afk?.minutos_acumulados ?? 0,
    pending,
    combat: normalizeCombat(afk?.combat),
  };

  const user: UserRecord = {
    id: profile.id,
    email: profile.email,
    nome: profile.nome,
    idade: profile.idade ?? undefined,
    peso_kg: profile.peso_kg != null ? Number(profile.peso_kg) : undefined,
    altura_cm: profile.altura_cm != null ? Number(profile.altura_cm) : undefined,
    imc: profile.imc != null ? Number(profile.imc) : undefined,
    nivel: profile.nivel as UserRecord['nivel'],
    objetivo: profile.objetivo as UserRecord['objetivo'],
    gamificacao: profile.gamificacao as unknown as UserRecord['gamificacao'],
    cosmeticos: resolveLegacyCosmeticFields(profile.cosmeticos),
    loja_diaria: profile.loja_diaria as unknown as UserRecord['loja_diaria'],
    simulacao_definicao:
      profile.simulacao_definicao as unknown as UserRecord['simulacao_definicao'],
    preferencias: {
      ...DEFAULT_PREFERENCIAS,
      ...(profile.preferencias as unknown as UserRecord['preferencias']),
      exercicios_fixos:
        (profile.preferencias as unknown as UserRecord['preferencias'])?.exercicios_fixos ?? [],
      exercicios_nao_recomendar:
        (profile.preferencias as unknown as UserRecord['preferencias'])
          ?.exercicios_nao_recomendar ?? [],
      treinos_fixos:
        (profile.preferencias as unknown as UserRecord['preferencias'])?.treinos_fixos ?? [],
      treinos_nao_recomendar:
        (profile.preferencias as unknown as UserRecord['preferencias'])?.treinos_nao_recomendar ??
        [],
      ciclos_completados_rodada:
        (profile.preferencias as unknown as UserRecord['preferencias'])
          ?.ciclos_completados_rodada ?? {},
    },
    dados_salvos: {
      ...DEFAULT_USER_DADOS_SALVOS,
      ...(profile.dados_salvos as unknown as UserRecord['dados_salvos']),
    },
    xp_diario: profile.xp_diario as unknown as UserRecord['xp_diario'],
    inventario: profile.inventario as unknown as UserRecord['inventario'],
    afk: afkState,
    onboarding_completed: profile.onboarding_completed,
    terms_accepted_at: profile.terms_accepted_at ?? null,
    muscle_map_reset_at: profile.muscle_map_reset_at ?? null,
    is_guest: profile.is_guest,
    is_demo_npc: profile.is_demo_npc,
    // Presentes só depois da migration profile_identity — undefined mantém o
    // save omitindo as colunas (não quebra antes de ela ser aplicada).
    avatar_url: 'avatar_url' in profile ? (profile.avatar_url ?? null) : undefined,
    tag: 'tag' in profile ? (profile.tag ?? null) : undefined,
    descricao: 'descricao' in profile ? (profile.descricao ?? null) : undefined,
    nome_trocas: 'nome_trocas' in profile ? (profile.nome_trocas ?? 0) : undefined,
    role: 'role' in profile ? ((profile.role as UserRecord['role']) ?? 'user') : undefined,
    gems: 'gems' in profile ? (profile.gems ?? 0) : undefined,
    banimento:
      'banimento' in profile
        ? ((profile.banimento as unknown as UserRecord['banimento']) ?? null)
        : undefined,
    perfil_treino:
      'perfil_treino' in profile
        ? ((profile.perfil_treino as unknown as UserRecord['perfil_treino']) ?? null)
        : undefined,
    plano_treino:
      'plano_treino' in profile
        ? ((profile.plano_treino as unknown as UserRecord['plano_treino']) ?? null)
        : undefined,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };

  if (includePassword && profile.password_hash) {
    user.passwordHash = profile.password_hash;
  }

  return user;
}

function userToProfileRow(user: UserRecord): Record<string, unknown> {
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
    ...(user.avatar_url !== undefined ? { avatar_url: user.avatar_url } : {}),
    ...(user.tag !== undefined ? { tag: user.tag } : {}),
    ...(user.descricao !== undefined ? { descricao: user.descricao } : {}),
    ...(user.nome_trocas !== undefined ? { nome_trocas: user.nome_trocas } : {}),
    ...(user.role !== undefined ? { role: user.role } : {}),
    ...(user.gems !== undefined ? { gems: user.gems } : {}),
    ...(user.banimento !== undefined
      ? { banimento: user.banimento as unknown as Record<string, unknown> | null }
      : {}),
    ...(user.perfil_treino !== undefined ? { perfil_treino: user.perfil_treino } : {}),
    ...(user.plano_treino !== undefined ? { plano_treino: user.plano_treino } : {}),
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
  const { data } = await sb
    .from('user_afk_state')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
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

export class UserMutable implements UserRecord {
  id!: string;
  email!: string;
  passwordHash?: string;
  nome!: string;
  idade?: number;
  peso_kg?: number;
  altura_cm?: number;
  imc?: number;
  nivel!: UserRecord['nivel'];
  objetivo!: UserRecord['objetivo'];
  gamificacao!: UserRecord['gamificacao'];
  cosmeticos!: UserRecord['cosmeticos'];
  loja_diaria!: UserRecord['loja_diaria'];
  simulacao_definicao!: UserRecord['simulacao_definicao'];
  preferencias!: UserRecord['preferencias'];
  dados_salvos!: UserRecord['dados_salvos'];
  xp_diario!: UserRecord['xp_diario'];
  inventario!: UserRecord['inventario'];
  afk!: UserRecord['afk'];
  onboarding_completed!: boolean;
  terms_accepted_at?: Date | string | null;
  muscle_map_reset_at?: Date | string | null;
  is_guest!: boolean;
  is_demo_npc!: boolean;
  avatar_url?: string | null;
  tag?: string | null;
  descricao?: string | null;
  nome_trocas?: number;
  role?: UserRecord['role'];
  gems?: number | null;
  banimento?: UserRecord['banimento'];
  perfil_treino?: UserRecord['perfil_treino'];
  plano_treino?: UserRecord['plano_treino'];
  createdAt?: Date | string;
  updatedAt?: Date | string;

  constructor(data: UserRecord) {
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

  /**
   * Grava SÓ as colunas de `profiles` pedidas, sem tocar no estado de AFK.
   * Atalho para `save({ profileColumns, skipAfk: true })` — ver o porquê lá.
   */
  async saveColumns(columns: readonly (keyof ProfileRow)[]): Promise<UserMutable> {
    return this.save({ profileColumns: columns, skipAfk: true });
  }

  /**
   * Persiste o usuário.
   *
   * Por padrão reescreve a linha INTEIRA de `profiles` a partir do estado que
   * a request leu no início. Isso só é seguro para rotas donas do perfil
   * inteiro: se o cliente disparou em paralelo outra escrita (ex.: `PATCH /me`
   * salvando `preferencias`), a que terminar por último apaga a outra, sem
   * erro nenhum.
   *
   * `profileColumns` limita a escrita ao que a rota realmente alterou, então
   * escritas concorrentes em colunas diferentes deixam de se atropelar.
   * `skipAfk` pula o UPDATE em `user_afk_state` — mesma ideia: quem não mexeu
   * no AFK não deve reescrevê-lo com um snapshot potencialmente velho.
   */
  async save(options?: {
    profileColumns?: readonly (keyof ProfileRow)[];
    skipAfk?: boolean;
  }): Promise<UserMutable> {
    const sb = getSupabase();
    const full = userToProfileRow(this);
    delete full.email;

    let profileUpdate: Record<string, unknown> = full;
    if (options?.profileColumns) {
      profileUpdate = {};
      for (const column of options.profileColumns) {
        if (column === 'email' || column === 'id') continue;
        if (column in full) profileUpdate[column] = full[column];
      }
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await sb
        .from('profiles')
        .update(profileUpdate)
        .eq('id', this.id);

      if (profileError) throw profileError;
    }

    if (options?.skipAfk) return this;

    await ensureAfkRow(this.id);
    const afkPayload: Record<string, unknown> = {
      last_seen_at: this.afk.last_seen_at,
      // Sem isto a pausa da vila só valia dentro da request que a criou: a
      // seguinte lia `paused_at` como nulo e creditava como exploração todo o
      // tempo parado na vila.
      paused_at: this.afk.paused_at ?? null,
      minutos_acumulados: this.afk.minutos_acumulados ?? 0,
      pending: normalizePending(this.afk.pending),
      combat: normalizeCombat(this.afk.combat),
    };

    let { error: afkError } = await sb
      .from('user_afk_state')
      .update(afkPayload)
      .eq('user_id', this.id);

    // Ambiente sem as migrations `afk_combat`/`afk_paused_at` aplicadas:
    // reenvia sem a(s) coluna(s) que faltam em vez de falhar a escrita toda.
    if (afkError?.code === 'PGRST204') {
      const message = String(afkError.message ?? '');
      const legacyPayload = { ...afkPayload };
      if (message.includes('combat')) delete legacyPayload.combat;
      if (message.includes('paused_at')) delete legacyPayload.paused_at;

      if (Object.keys(legacyPayload).length !== Object.keys(afkPayload).length) {
        ({ error: afkError } = await sb
          .from('user_afk_state')
          .update(legacyPayload)
          .eq('user_id', this.id));
      }
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
    const selectPassword =
      options?.select?.includes('passwordHash') || options?.select?.includes('+passwordHash');

    const { data: profile, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
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
    const selectPassword =
      options?.select?.includes('passwordHash') || options?.select?.includes('+passwordHash');
    let query = sb.from('profiles').select('*');
    if (filter.email) query = query.eq('email', filter.email);
    const { data: profile, error } = await query.maybeSingle();
    if (error || !profile) return null;

    const afk = await fetchAfk(profile.id);
    return new UserMutable(rowToUser(profile as ProfileRow, afk, selectPassword));
  },

  async find(
    filter: Record<string, unknown>,
    options?: {
      sort?: Record<string, 1 | -1>;
      limit?: number;
      select?: string;
      /** true = pula o fetch em lote de user_afk_state — economiza uma
          segunda ida ao banco pra quem só precisa de gamificacao/cosmeticos
          (ex.: ranking, que nunca lê `.afk` do resultado). */
      skipAfk?: boolean;
    },
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
      } else if (field === 'gamificacao.streak_maior') {
        query = query.order('gamificacao->streak_maior', { ascending: dir === 1 });
      } else if (field === 'cosmeticos.moedas') {
        query = query.order('cosmeticos->moedas', { ascending: dir === 1 });
      } else if (field === 'cosmeticos.moedas_total_ganhas') {
        query = query.order('cosmeticos->moedas_total_ganhas', { ascending: dir === 1 });
      }
      query = query.order('nome', { ascending: true });
    }

    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];

    const profiles = data as ProfileRow[];
    if (options?.skipAfk) return profiles.map((p) => rowToUser(p, null));
    const afkMap = await fetchAfkBatch(profiles.map((p) => p.id));
    return profiles.map((p) => rowToUser(p, afkMap.get(p.id) ?? null));
  },

  /** Update direto, sem reler o registro depois (ao contrário de
      `findByIdAndUpdate`) — pra chamadas em lote onde o valor de retorno
      não importa e o custo de uma leitura extra por item é desperdício. */
  async updateFieldsById(id: string, patch: Record<string, unknown>): Promise<void> {
    const sb = getSupabase();
    await sb.from('profiles').update(mapPatchToRow(patch)).eq('id', id);
  },

  /** Busca por nome (case-insensitive, parcial) — contas reais e onboarded. */
  async searchByName(query: string, excludeId: string, limit = 10): Promise<UserLean[]> {
    const sanitized = query.replace(/[%_\\]/g, '').trim();
    if (!sanitized) return [];

    const sb = getSupabase();
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .ilike('nome', `%${sanitized}%`)
      .eq('onboarding_completed', true)
      .eq('is_guest', false)
      .neq('id', excludeId)
      .limit(limit);
    if (error || !data) return [];

    const profiles = data as ProfileRow[];
    const afkMap = await fetchAfkBatch(profiles.map((p) => p.id));
    return profiles.map((p) => rowToUser(p, afkMap.get(p.id) ?? null));
  },

  async countLeaderboardRank(
    user: {
      id: string;
      nome: string;
      gamificacao: { nivel_xp: number; streak_atual: number; streak_maior: number };
      cosmeticos?: { moedas?: number | null } | null;
    },
    metric: 'xp' | 'streak' | 'moedas',
    period: 'semanal' | 'global' = 'semanal',
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
      // Semanal = sequência em andamento; Global = recorde (streak_maior).
      const field = period === 'global' ? 'streak_maior' : 'streak_atual';
      const value =
        period === 'global' ? user.gamificacao.streak_maior : user.gamificacao.streak_atual;
      const [{ count: higher }, { count: tiedName }] = await Promise.all([
        base().gt(`gamificacao->${field}`, value),
        base().eq(`gamificacao->${field}`, value).lt('nome', user.nome),
      ]);
      return (higher ?? 0) + (tiedName ?? 0) + 1;
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

  /**
   * Quantos jogadores reais (não-convidado, não-NPC, onboarded) têm cada conquista, mais o
   * total elegível — base pro percentual real de `pct_jogadores`. Conta em JS em vez de SQL
   * agregado: sem stored procedure, sem migração, e a base de usuários ainda é pequena o
   * suficiente pra isso ser barato.
   */
  async achievementUnlockCounts(): Promise<{ total: number; counts: Record<string, number> }> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('profiles')
      .select('gamificacao')
      .eq('is_guest', false)
      .eq('is_demo_npc', false)
      .eq('onboarding_completed', true);

    if (error || !data) return { total: 0, counts: {} };

    const counts: Record<string, number> = {};
    for (const row of data as { gamificacao: { conquistas?: string[] } | null }[]) {
      for (const id of row.gamificacao?.conquistas ?? []) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    return { total: data.length, counts };
  },

  async create(data: Partial<UserRecord> & { email: string; nome: string }): Promise<UserMutable> {
    const sb = getSupabase();
    const row = {
      email: data.email,
      password_hash: data.passwordHash,
      nome: data.nome,
      nivel: data.nivel ?? 'iniciante',
      objetivo: data.objetivo ?? 'definicao',
      gamificacao: data.gamificacao ?? {
        nivel_xp: 0,
        streak_atual: 0,
        streak_maior: 0,
        total_minutos: 0,
        conquistas: [],
      },
      cosmeticos: data.cosmeticos ?? DEFAULT_COSMETICOS,
      loja_diaria: data.loja_diaria ?? { data_reset: '', slots: [] },
      simulacao_definicao: data.simulacao_definicao ?? { gordura_meta_pct: 12 },
      preferencias: { ...DEFAULT_PREFERENCIAS, ...(data.preferencias ?? {}) },
      dados_salvos: data.dados_salvos ?? DEFAULT_USER_DADOS_SALVOS,
      xp_diario: data.xp_diario ?? DEFAULT_XP_DIARIO,
      inventario: data.inventario ?? DEFAULT_NEW_USER_INVENTARIO,
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
      } as Partial<UserRecord> & { email: string; nome: string });
      return User.findById(created.id, { lean: true }) as Promise<UserLean | null>;
    }

    return null;
  },

  /** Apaga a conta. Todas as tabelas relacionadas usam ON DELETE CASCADE
      (workout_history, user_afk_state, notifications, follows,
      profile_likes, leaderboard_podium_history etc.) — um delete aqui
      limpa tudo. Não remove a foto do Storage (não é coberto por cascade
      de banco); ver `removeAvatar` na rota antes de chamar isto. */
  async deleteById(id: string): Promise<void> {
    const sb = getSupabase();
    await sb.from('profiles').delete().eq('id', id);
  },
};

export { normalizePending, normalizeCombat, EMPTY_AFK_PENDING };
