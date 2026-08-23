export type MotionPreference = 'full' | 'reduced';

export function isReducedMotion(preference: MotionPreference): boolean {
  return preference === 'reduced';
}
