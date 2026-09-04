import { describe, expect, it } from 'vitest';
import {
  compareSemver,
  hasVisibleReleaseUpdate,
  isBelowMinimumSupported,
  resolveUpdateStrategy,
  shortBuildId,
} from '../../shared/app-release.js';

describe('app-release', () => {
  it('compares semver', () => {
    expect(compareSemver('0.2.0', '0.1.0')).toBe(1);
    expect(compareSemver('0.1.0', '0.1.0')).toBe(0);
    expect(compareSemver('0.1.0', '0.2.0')).toBe(-1);
    expect(compareSemver('1.0.0', '0.9.9')).toBe(1);
  });

  it('shows update only when release version is newer (build alone is ignored)', () => {
    expect(
      hasVisibleReleaseUpdate(
        { version: '0.1.0' },
        { version: '0.1.0' },
      ),
    ).toBe(false);
    expect(
      hasVisibleReleaseUpdate(
        { version: '0.1.0' },
        { version: '0.1.1' },
      ),
    ).toBe(true);
    expect(
      hasVisibleReleaseUpdate(
        { version: '0.2.0' },
        { version: '0.1.9' },
      ),
    ).toBe(false);
  });

  it('treats missing minimum_supported as not mandatory', () => {
    expect(isBelowMinimumSupported('0.1.0', null)).toBe(false);
    expect(isBelowMinimumSupported('0.1.0', '0.2.0')).toBe(true);
    expect(isBelowMinimumSupported('0.2.0', '0.2.0')).toBe(false);
  });

  it('maps channels to strategies', () => {
    expect(resolveUpdateStrategy('web')).toBe('web_reload');
    expect(resolveUpdateStrategy('android')).toBe('store');
    expect(resolveUpdateStrategy('ios')).toBe('store');
  });

  it('shortens build ids', () => {
    expect(shortBuildId('abcdef1234567890')).toBe('abcdef1');
    expect(shortBuildId('local-abc123xyz')).toBe('local-abc123');
  });
});
