import type { CSSProperties, ReactNode } from 'react';

export interface WorkoutSceneTheme {
  accent: string;
  surface: string;
  background: 'player';
}

const DEFAULT_THEME: WorkoutSceneTheme = {
  accent: '#0a9875',
  surface: '#ffffff',
  background: 'player',
};
export function WorkoutCompanionLayer(): null {
  return null;
}

export function WorkoutScene({
  children,
  theme = DEFAULT_THEME,
  companion = null,
}: {
  children: ReactNode;
  theme?: WorkoutSceneTheme;
  companion?: ReactNode;
}) {
  return (
    <div
      className="workout-scene"
      style={
        {
          '--workout-accent': theme.accent,
          '--workout-surface': theme.surface,
        } as CSSProperties
      }
    >
      {children}
      {companion}
    </div>
  );
}
