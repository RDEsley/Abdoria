import type { ExerciseLaterality } from './types/index.js';

export type WorkoutPlayerPhase = 'ready' | 'working' | 'side_transition' | 'resting' | 'done';
export type WorkoutSideIndex = 0 | 1;

export interface WorkoutPlayerState {
  exerciseIndex: number;
  setIndex: number;
  sideIndex: WorkoutSideIndex;
  phase: WorkoutPlayerPhase;
}

export interface WorkoutProgressItem {
  sets: number;
  laterality?: ExerciseLaterality;
}

export const INITIAL_WORKOUT_PLAYER_STATE: WorkoutPlayerState = {
  exerciseIndex: 0,
  setIndex: 0,
  sideIndex: 0,
  phase: 'ready',
};

export function completeWorkingPhase(
  state: WorkoutPlayerState,
  queue: WorkoutProgressItem[],
): WorkoutPlayerState {
  const current = queue[state.exerciseIndex];
  if (!current) return { ...state, phase: 'done' };
  if (current.laterality === 'per_side' && state.sideIndex === 0) {
    return { ...state, phase: 'side_transition' };
  }
  const nextSet = state.setIndex + 1;
  if (nextSet < current.sets)
    return { ...state, setIndex: nextSet, sideIndex: 0, phase: 'resting' };
  if (state.exerciseIndex + 1 < queue.length)
    return { exerciseIndex: state.exerciseIndex + 1, setIndex: 0, sideIndex: 0, phase: 'resting' };
  return { ...state, phase: 'done' };
}

export function continueAfterSideTransition(state: WorkoutPlayerState): WorkoutPlayerState {
  if (state.phase !== 'side_transition') return state;
  return { ...state, sideIndex: 1, phase: 'ready' };
}

export function goBackWorkoutStep(
  state: WorkoutPlayerState,
  queue: WorkoutProgressItem[],
): WorkoutPlayerState {
  if (state.sideIndex === 1) return { ...state, sideIndex: 0, phase: 'ready' };
  if (state.setIndex > 0)
    return { ...state, setIndex: state.setIndex - 1, sideIndex: 0, phase: 'ready' };
  if (state.exerciseIndex === 0) return INITIAL_WORKOUT_PLAYER_STATE;
  const previousExercise = state.exerciseIndex - 1;
  const previous = queue[previousExercise];
  return {
    exerciseIndex: previousExercise,
    setIndex: Math.max((previous?.sets ?? 1) - 1, 0),
    sideIndex: previous?.laterality === 'per_side' ? 1 : 0,
    phase: 'ready',
  };
}
