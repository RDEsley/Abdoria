import { describe, expect, it } from 'vitest';
import { xpLevelFromTotal, xpRequiredForNextLevel } from '../../shared/types/xp-level.js';

describe('xp-level', () => {
  it.each([
    [1, 100],
    [2, 150],
    [3, 200],
    [9, 500],
    [10, 550],
    [11, 650],
    [12, 750],
  ])('xpRequiredForNextLevel(%i) === %i', (level, expected) => {
    expect(xpRequiredForNextLevel(level)).toBe(expected);
  });

  it('accumulates total xp into the correct level', () => {
    let total = 0;
    for (let level = 1; level < 12; level += 1) total += xpRequiredForNextLevel(level);
    expect(xpLevelFromTotal(total)).toBe(12);
  });
});
