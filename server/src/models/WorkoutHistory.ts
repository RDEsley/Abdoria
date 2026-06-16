import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { MusculoPrincipal, TreinoTipo } from '../types/index.js';

const workoutExerciseEntrySchema = new Schema(
  {
    exercicio_id: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
    slug: { type: String, required: true },
    nome: { type: String, required: true },
    duracao_segundos: { type: Number, required: true, min: 1 },
    musculo_principal: {
      type: String,
      required: true,
      enum: ['superior', 'inferior', 'obliquos', 'core', 'completo'] satisfies MusculoPrincipal[],
    },
    series: { type: Number, min: 1, default: 1 },
    repeticoes_realizadas: { type: Number, min: 0 },
    modo: { type: String, enum: ['tempo', 'reps'] },
    descanso_seg: { type: Number, min: 0 },
  },
  { _id: false },
);

const workoutHistorySchema = new Schema(
  {
    usuario_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    treino_nome: { type: String, required: true, trim: true },
    treino_tipo: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E', 'custom'] satisfies TreinoTipo[],
    },
    exercicios: { type: [workoutExerciseEntrySchema], required: true, default: [] },
    duracao_total_segundos: { type: Number, required: true, min: 0 },
    musculos_estimulados: {
      type: [String],
      enum: ['superior', 'inferior', 'obliquos', 'core', 'completo'] satisfies MusculoPrincipal[],
      default: [],
    },
    xp_ganho: { type: Number, default: 0, min: 0 },
    concluido_em: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

workoutHistorySchema.index({ usuario_id: 1, concluido_em: -1 });

export type WorkoutHistoryDocument = InferSchemaType<typeof workoutHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WorkoutHistory = mongoose.model('WorkoutHistory', workoutHistorySchema);
