import { describe, expect, it } from 'vitest';
import {
  completeWorkingPhase,
  continueAfterSideTransition,
  goBackWorkoutStep,
  INITIAL_WORKOUT_PLAYER_STATE,
} from '../../shared/workout-player.js';

describe('progressão bilateral do Player', () => {
  const queue = [
    { sets: 2, laterality: 'per_side' as const },
    { sets: 1, laterality: 'none' as const },
  ];
  it('conclui esquerda, troca de lado e só então avança a série', () => {
    const transition = completeWorkingPhase(INITIAL_WORKOUT_PLAYER_STATE, queue);
    expect(transition).toMatchObject({ setIndex: 0, sideIndex: 0, phase: 'side_transition' });
    const rightReady = continueAfterSideTransition(transition);
    expect(rightReady).toMatchObject({ setIndex: 0, sideIndex: 1, phase: 'ready' });
    expect(completeWorkingPhase({ ...rightReady, phase: 'working' }, queue)).toMatchObject({
      setIndex: 1,
      sideIndex: 0,
      phase: 'resting',
    });
  });
  it('volta por lado, série e exercício sem misturar índices', () => {
    expect(
      goBackWorkoutStep({ exerciseIndex: 0, setIndex: 1, sideIndex: 0, phase: 'working' }, queue),
    ).toMatchObject({ exerciseIndex: 0, setIndex: 0 });
    expect(
      goBackWorkoutStep({ exerciseIndex: 1, setIndex: 0, sideIndex: 0, phase: 'ready' }, queue),
    ).toMatchObject({ exerciseIndex: 0, setIndex: 1, sideIndex: 1 });
  });
});
