import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { NivelUsuario, Objetivo, TreinoBase } from '../types/index.js';

const presetExerciseSchema = new Schema(
  {
    slug: { type: String, required: true },
    series: { type: Number, required: true, min: 1, default: 3 },
    modo: { type: String, enum: ['tempo', 'reps'], required: true },
    tempo_seg: { type: Number, min: 5 },
    repeticoes: { type: Number, min: 1 },
    descanso_seg: { type: Number, required: true, min: 5 },
  },
  { _id: false },
);

const workoutPresetSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    nivel: {
      type: String,
      required: true,
      enum: ['iniciante', 'intermediario', 'avancado'] satisfies NivelUsuario[],
    },
    objetivo: {
      type: String,
      required: true,
      enum: ['definicao', 'resistencia', 'forca', 'manutencao'] satisfies Objetivo[],
    },
    ciclo_id: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D', 'E'] satisfies TreinoBase[],
    },
    descricao: { type: String, required: true },
    recomendado: { type: Boolean, default: true },
    exercicios: { type: [presetExerciseSchema], required: true },
  },
  { timestamps: true },
);

workoutPresetSchema.index({ nivel: 1, objetivo: 1, ciclo_id: 1 });

export type WorkoutPresetDocument = InferSchemaType<typeof workoutPresetSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WorkoutPreset = mongoose.model('WorkoutPreset', workoutPresetSchema);
