import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { NivelUsuario, Objetivo, TreinoBase } from '../types/index.js';

export { sanitizeUser } from '../utils/sanitize-user.js';

const gamificacaoSchema = new Schema(
  {
    nivel_xp: { type: Number, default: 0, min: 0 },
    streak_atual: { type: Number, default: 0, min: 0 },
    streak_maior: { type: Number, default: 0, min: 0 },
    total_minutos: { type: Number, default: 0, min: 0 },
    conquistas: { type: [String], default: [] },
  },
  { _id: false },
);

const cosmeticosSchema = new Schema(
  {
    moedas: { type: Number, default: 0, min: 0 },
    moedas_xp_blocos: { type: Number, default: 0, min: 0 },
    avatar_equipado: { type: String, default: 'avatar_inicial' },
    borda_equipada: { type: String, default: 'borda_basica' },
    titulo_equipado: { type: String, default: null },
    som_equipado: { type: String, default: 'som_classico' },
    efeito_equipado: { type: String, default: 'efeito_padrao' },
    fundo_equipado: { type: String, default: 'fundo_padrao' },
    desbloqueados: {
      type: [String],
      default: () => ['avatar_inicial', 'borda_basica', 'som_classico', 'efeito_padrao', 'fundo_padrao'],
    },
    codigos_resgatados: { type: [String], default: [] },
  },
  { _id: false },
);

const lojaDiariaSlotSchema = new Schema(
  {
    slot: { type: Number, required: true },
    kind: { type: String, enum: ['recompensa_diaria', 'oferta'], required: true },
    recompensa_tipo: { type: String, enum: ['xp', 'abdoria', 'pacote'], required: true },
    valor: { type: Number, required: true },
    raridade: { type: String, enum: ['comum', 'incomum', 'raro', 'epico'], required: true },
    preco_abdoria: { type: Number, default: 0 },
    preco_xp: { type: Number, default: 0 },
    resgatado: { type: Boolean, default: false },
    label: { type: String, required: true },
    oferta_nome: { type: String },
    bonus_xp: { type: Number },
    bonus_abdoria: { type: Number },
    cosmetic_id: { type: String },
  },
  { _id: false },
);

const lojaDiariaSchema = new Schema(
  {
    data_reset: { type: String, default: '' },
    slots: { type: [lojaDiariaSlotSchema], default: [] },
  },
  { _id: false },
);

const simulacaoDefinicaoSchema = new Schema(
  {
    gordura_atual_pct: { type: Number, min: 3, max: 60 },
    gordura_inicio_pct: { type: Number, min: 3, max: 60 },
    gordura_meta_pct: { type: Number, default: 12, min: 3, max: 30 },
    sexo: { type: String, enum: ['masculino', 'feminino'] },
    atualizado_em: { type: Date },
  },
  { _id: false },
);

const workoutQueueItemSchema = new Schema(
  {
    slug: { type: String, required: true },
    nome: { type: String, required: true },
    exercicio_id: { type: String },
    musculo_principal: { type: String, required: true },
    tempo_recomendado: { type: Number, required: true },
    modo: { type: String, enum: ['reps', 'tempo'], required: true },
    series: { type: Number, required: true },
    repeticoes: { type: Number },
    tempo_seg: { type: Number },
    descanso_seg: { type: Number, required: true },
  },
  { _id: false },
);

const savedWorkoutSchema = new Schema(
  {
    id: { type: String, required: true },
    nome: { type: String, required: true },
    queue: { type: [workoutQueueItemSchema], default: [] },
    descanso_padrao_seg: { type: Number, default: 30 },
    savedAt: { type: String, required: true },
  },
  { _id: false },
);

const storedRepSchemeSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    series: { type: Number, required: true },
    repeticoes: { type: Number, required: true },
    descricao: { type: String, required: true },
    isCustom: { type: Boolean, default: true },
  },
  { _id: false },
);

const dadosSalvosSchema = new Schema(
  {
    treino_personalizado: { type: [workoutQueueItemSchema], default: [] },
    treinos_salvos: { type: [savedWorkoutSchema], default: [] },
    esquemas_reps: {
      type: Map,
      of: [storedRepSchemeSchema],
      default: () => new Map(),
    },
    exercicios_desbloqueados: { type: [String], default: [] },
  },
  { _id: false },
);

const preferenciasSchema = new Schema(
  {
    descanso_padrao_seg: { type: Number, default: 30, min: 5, max: 180 },
    som_habilitado: { type: Boolean, default: true },
    sfx_volume: { type: Number, default: 0.7, min: 0, max: 1 },
    ciclo_treinos: {
      type: [String],
      enum: ['A', 'B', 'C', 'D', 'E'] satisfies TreinoBase[],
      default: ['A', 'B', 'C'],
    },
    modo_padrao: { type: String, enum: ['tempo', 'reps'], default: 'tempo' },
    preset_favorito_id: { type: Schema.Types.ObjectId, ref: 'WorkoutPreset', default: null },
    tutorial_visto: { type: Boolean, default: false },
  },
  { _id: false },
);

const xpDiarioSchema = new Schema(
  {
    ganho_hoje: { type: Number, default: 0, min: 0 },
    extra_hoje: { type: Number, default: 0, min: 0 },
    data_reset: { type: String, default: '' },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, select: false },
    nome: { type: String, required: true, trim: true },
    idade: { type: Number, min: 10, max: 120 },
    peso_kg: { type: Number, min: 20, max: 300 },
    altura_cm: { type: Number, min: 100, max: 250 },
    imc: { type: Number, min: 10, max: 60 },
    nivel: {
      type: String,
      required: true,
      enum: ['iniciante', 'intermediario', 'avancado'] satisfies NivelUsuario[],
      default: 'iniciante',
    },
    objetivo: {
      type: String,
      required: true,
      enum: ['definicao', 'resistencia', 'forca', 'manutencao'] satisfies Objetivo[],
      default: 'definicao',
    },
    gamificacao: { type: gamificacaoSchema, default: () => ({}) },
    cosmeticos: { type: cosmeticosSchema, default: () => ({}) },
    loja_diaria: { type: lojaDiariaSchema, default: () => ({ data_reset: '', slots: [] }) },
    simulacao_definicao: {
      type: simulacaoDefinicaoSchema,
      default: () => ({ gordura_meta_pct: 12 }),
    },
    preferencias: { type: preferenciasSchema, default: () => ({}) },
    dados_salvos: { type: dadosSalvosSchema, default: () => ({}) },
    xp_diario: { type: xpDiarioSchema, default: () => ({ ganho_hoje: 0, extra_hoje: 0, data_reset: '' }) },
    onboarding_completed: { type: Boolean, default: false },
    terms_accepted_at: { type: Date, default: null },
    muscle_map_reset_at: { type: Date, default: null },
    is_guest: { type: Boolean, default: false },
    is_demo_npc: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ 'gamificacao.nivel_xp': -1 });
userSchema.index({ 'gamificacao.streak_atual': -1 });
userSchema.index({ 'cosmeticos.moedas': -1 });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User = mongoose.model('User', userSchema);
