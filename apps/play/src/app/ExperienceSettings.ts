import { useCallback, useState } from 'react';
import type { MotionPreference, QualityProfile } from '@christmas-games/theme';

export type ExperiencePhotoShape = 'portrait' | 'landscape';

/**
 * Development preferences are intentionally URL-backed, so two local labs can
 * reproduce the same quality, movement, sound and random-seed conditions.
 * They never contain a session, photo identifier, token or a filesystem path.
 */
export interface ExperienceSettings {
  readonly motion: MotionPreference;
  readonly photo: ExperiencePhotoShape;
  readonly quality: QualityProfile;
  readonly seed: string;
  readonly soundEnabled: boolean;
}

export function readExperienceSettings(search: string): ExperienceSettings {
  const values = new URLSearchParams(search);
  return {
    quality: parseQuality(values.get('quality')),
    motion: values.get('motion') === 'reduce' ? 'reduced' : 'full',
    photo: values.get('photo') === 'landscape' ? 'landscape' : 'portrait',
    soundEnabled: values.get('sound') !== 'off',
    seed: normalizeSeed(values.get('seed')),
  };
}

export function experienceSettingsSearch(settings: ExperienceSettings): string {
  return new URLSearchParams({
    quality: settings.quality,
    motion: settings.motion === 'reduced' ? 'reduce' : 'full',
    photo: settings.photo,
    sound: settings.soundEnabled ? 'on' : 'off',
    seed: settings.seed,
  }).toString();
}

/** Reuses one local-only preference contract across visual and performance labs. */
export function useExperienceSettings(): readonly [
  ExperienceSettings,
  <Key extends keyof ExperienceSettings>(key: Key, value: ExperienceSettings[Key]) => void,
] {
  const [settings, setSettings] = useState<ExperienceSettings>(() =>
    readExperienceSettings(window.location.search),
  );
  const update = useCallback(
    <Key extends keyof ExperienceSettings>(key: Key, value: ExperienceSettings[Key]): void => {
      setSettings((current) => {
        const next = { ...current, [key]: value } as ExperienceSettings;
        window.history.replaceState(
          window.history.state,
          '',
          `${window.location.pathname}?${experienceSettingsSearch(next)}`,
        );
        return next;
      });
    },
    [],
  );
  return [settings, update];
}

function parseQuality(value: string | null): QualityProfile {
  return value === 'LOW' || value === 'HIGH' ? value : 'NORMAL';
}

function normalizeSeed(value: string | null): string {
  if (!value || !/^\d{1,10}$/.test(value)) return '1234';
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 0xffffffff ? value : '1234';
}
