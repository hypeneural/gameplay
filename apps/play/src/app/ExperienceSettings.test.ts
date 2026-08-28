import { describe, expect, it } from 'vitest';
import { experienceSettingsSearch, readExperienceSettings } from './ExperienceSettings.js';

describe('ExperienceSettings', () => {
  it('normalizes the local-only preference query into a safe reproducible state', () => {
    expect(
      readExperienceSettings('?quality=HIGH&motion=reduce&photo=landscape&sound=off&seed=42'),
    ).toEqual({
      quality: 'HIGH',
      motion: 'reduced',
      photo: 'landscape',
      soundEnabled: false,
      seed: '42',
    });
    expect(readExperienceSettings('?quality=bad&seed=9999999999')).toEqual({
      quality: 'NORMAL',
      motion: 'full',
      photo: 'portrait',
      soundEnabled: true,
      seed: '1234',
    });
  });

  it('serializes no session, photo identifier, path or token', () => {
    const search = experienceSettingsSearch({
      quality: 'LOW',
      motion: 'full',
      photo: 'portrait',
      soundEnabled: true,
      seed: '100',
    });
    expect(search).toBe('quality=LOW&motion=full&photo=portrait&sound=on&seed=100');
    expect(search).not.toMatch(/session|token|path|photoId/i);
  });
});
