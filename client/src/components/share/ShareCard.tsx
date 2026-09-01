import { Flame, Medal, Trophy, Zap } from 'lucide-react';
import { CosmeticAvatar } from '@/components/cosmetics/CosmeticAvatar';
import type { IUserDocument } from '@/types';

interface WorkoutShareData {
  kind: 'workout';
  workoutName: string;
  dateLabel: string;
  xpGained: number;
  streakAtual?: number;
}

interface RecordShareData {
  kind: 'record';
  exerciseName: string;
  previousValue: number;
  newValue: number;
  unidade: 'reps' | 'segundos';
  dateLabel: string;
}

interface StreakShareData {
  kind: 'streak';
  streakAtual: number;
  streakMaior?: number;
  dateLabel: string;
}

export type ShareCardData = WorkoutShareData | RecordShareData | StreakShareData;

interface Props {
  data: ShareCardData;
  user: IUserDocument | null;
}

/** Card exportável (9:16) — capturado off-screen via html-to-image, linguagem de celebração. */
export function ShareCard({ data, user }: Props) {
  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';

  return (
    <div className="share-card">
      <div className="share-card__glow" aria-hidden />

      <p className="share-card__brand">Evolyn · Plantando a sua evolução.</p>

      <div className="share-card__avatar">
        <CosmeticAvatar user={user} size="lg" />
      </div>

      {data.kind === 'streak' ? (
        <>
          <div className="share-card__badge-icon share-card__badge-icon--flame" aria-hidden>
            <Flame size={26} />
          </div>
          <div>
            <h2 className="share-card__title">Ofensiva em chamas</h2>
            <p className="share-card__name">Treinos sem falhar</p>
          </div>
          <div className="share-card__value-row">
            <span className="share-card__value">{data.streakAtual} dias</span>
          </div>
          <div className="share-card__stats">
            <div className="share-card__stat">
              <span className="share-card__stat-value">{firstName}</span>
              <span className="share-card__stat-label">Atleta</span>
            </div>
            {typeof data.streakMaior === 'number' && data.streakMaior > data.streakAtual && (
              <div className="share-card__stat">
                <span className="share-card__stat-value">{data.streakMaior}d</span>
                <span className="share-card__stat-label">Recorde</span>
              </div>
            )}
          </div>
        </>
      ) : data.kind === 'workout' ? (
        <>
          <div className="share-card__badge-icon" aria-hidden>
            <Zap size={26} />
          </div>
          <div>
            <h2 className="share-card__title">Treino concluído</h2>
            <p className="share-card__name">{data.workoutName}</p>
          </div>
          <div className="share-card__value-row">
            <span className="share-card__value">+{data.xpGained} XP</span>
          </div>
          <div className="share-card__stats">
            <div className="share-card__stat">
              <span className="share-card__stat-value">{firstName}</span>
              <span className="share-card__stat-label">Atleta</span>
            </div>
            {typeof data.streakAtual === 'number' && data.streakAtual > 0 && (
              <div className="share-card__stat">
                <span className="share-card__stat-value">{data.streakAtual}d</span>
                <span className="share-card__stat-label">Streak</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="share-card__badge-icon" aria-hidden>
            <Medal size={26} />
          </div>
          <div>
            <h2 className="share-card__title">Novo recorde</h2>
            <p className="share-card__name">{data.exerciseName}</p>
          </div>
          <div className="share-card__value-row">
            <span className="share-card__value">{data.previousValue}</span>
            <span className="share-card__value-arrow" aria-hidden>
              →
            </span>
            <span className="share-card__value">{data.newValue}</span>
          </div>
          <div className="share-card__stats">
            <div className="share-card__stat">
              <span className="share-card__stat-value">
                <Trophy size={18} aria-hidden />
              </span>
              <span className="share-card__stat-label">
                {data.unidade === 'segundos' ? 'Segundos' : 'Repetições'}
              </span>
            </div>
          </div>
        </>
      )}

      <p className="share-card__footer">
        <span>{firstName}</span>
        <span>{data.dateLabel}</span>
      </p>
    </div>
  );
}
