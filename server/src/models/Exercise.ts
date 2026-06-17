import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { MusculoPrincipal, Prioridade } from '../types/index.js';

const exerciseMediaSchema = new Schema(
  {
    gif: { type: String, required: true },
    video: { type: String },
  },
  { _id: false },
);

const exerciseSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    nome: { type: String, required: true, trim: true },
    nome_pt: { type: String, trim: true },
    nivel: { type: Number, required: true, min: 1, max: 4 },
    musculo_principal: {
      type: String,
      required: true,
      enum: ['superior', 'inferior', 'obliquos', 'core', 'completo'] satisfies MusculoPrincipal[],
    },
    musculos_secundarios: {
      type: [String],
      enum: ['superior', 'inferior', 'obliquos', 'core', 'completo'] satisfies MusculoPrincipal[],
      default: [],
    },
    tempo_recomendado: { type: Number, required: true, min: 5 },
    prioridade: {
      type: String,
      required: true,
      enum: ['S', 'A', 'B', 'C', 'dinamico', 'isometrico'] satisfies Prioridade[],
    },
    modo: { type: String, enum: ['tempo', 'reps', 'ambos'], default: 'reps' },
    repeticoes_iniciante: { type: Number, default: 12, min: 0 },
    repeticoes_intermediario: { type: Number, default: 16, min: 0 },
    repeticoes_avancado: { type: Number, default: 20, min: 0 },
    tempo_seg_iniciante: { type: Number, default: 25, min: 0 },
    tempo_seg_intermediario: { type: Number, default: 35, min: 0 },
    tempo_seg_avancado: { type: Number, default: 45, min: 0 },
    descanso_seg_iniciante: { type: Number, default: 40, min: 5 },
    descanso_seg_intermediario: { type: Number, default: 25, min: 5 },
    descanso_seg_avancado: { type: Number, default: 18, min: 5 },
    descricao: { type: String },
    media: { type: exerciseMediaSchema, required: true },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

exerciseSchema.index({ musculo_principal: 1, nivel: 1 });
exerciseSchema.index({ prioridade: 1 });

export type ExerciseDocument = InferSchemaType<typeof exerciseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Exercise = mongoose.model('Exercise', exerciseSchema);
