export type QualityProfile = 'LOW' | 'NORMAL' | 'HIGH';

export interface QualitySettings {
  snowParticles: number;
  usePostFx: boolean;
}

export const qualityProfiles: Record<QualityProfile, QualitySettings> = {
  LOW: { snowParticles: 0, usePostFx: false },
  NORMAL: { snowParticles: 24, usePostFx: false },
  HIGH: { snowParticles: 48, usePostFx: true },
};
