import type { Random } from '@christmas-games/platform';
import { sweptCatch } from './CatchGeometry.js';

export interface FallingMemory {
  readonly instanceId: number;
  readonly photoId: string;
  readonly size: 'small' | 'medium' | 'large';
  readonly duration: number;
  readonly phase: number;
  readonly golden: boolean;
  x: number;
  y: number;
}
export type RudolphEvent =
  | { type: 'spawned'; memory: FallingMemory }
  | { type: 'missed'; memory: FallingMemory }
  | { type: 'caught'; memory: FallingMemory; first: boolean };

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

/** IDs and normalized geometry only. The adapter owns clocks, media and presentation. */
export class RudolphRound {
  phase: 'ready' | 'playing' | 'finishing' | 'completed' = 'ready';
  readonly falling: FallingMemory[] = [];
  readonly savedPhotoIds: string[] = [];
  totalRescues = 0;
  noseCharge = 0;
  magicSeconds = 0;
  playerX = 0.5;
  velocityX = 0;
  private targetX = 0.5;
  private untilSpawn = 0.35;
  private sequence = 0;
  private goldenOffered = false;
  private readonly offered = new Map<string, number>();
  private readonly retries = new Map<string, { after: number; attempts: number }>();
  private readonly history: string[] = [];

  constructor(
    readonly photoIds: readonly string[],
    private readonly random: Random,
  ) {
    if (photoIds.length < 3 || photoIds.length > 8 || new Set(photoIds).size !== photoIds.length)
      throw new Error('Invalid Rudolph album.');
  }

  start(): void {
    if (this.phase === 'ready') this.phase = 'playing';
  }
  aim(x: number): void {
    if (this.phase === 'playing' && Number.isFinite(x)) this.targetX = clamp(x, 0.12, 0.88);
  }
  stopMovement(): void {
    this.targetX = this.playerX;
    this.velocityX = 0;
  }
  activateMagic(): boolean {
    if (this.phase !== 'playing' || this.noseCharge < 3 || this.magicSeconds > 0) return false;
    this.noseCharge = 0;
    this.magicSeconds = 3;
    return true;
  }
  finish(): boolean {
    if (this.phase !== 'finishing') return false;
    this.phase = 'completed';
    return true;
  }

  step(seconds: number, presentations = 0, allowSpawn = true, catchRadius = 0.14): RudolphEvent[] {
    if (this.phase !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return [];
    const dt = Math.min(seconds, 0.1);
    const previousPlayer = this.playerX;
    const distance = this.targetX - this.playerX;
    const desired = clamp(distance * 8, -0.8, 0.8);
    this.velocityX += clamp(desired - this.velocityX, -3.5 * dt, 3.5 * dt);
    const nextPlayer = this.playerX + this.velocityX * dt;
    if (distance * (this.targetX - nextPlayer) <= 0) {
      this.playerX = this.targetX;
      this.velocityX = 0;
    } else this.playerX = clamp(nextPlayer, 0.12, 0.88);
    const magic = this.magicSeconds > 0;
    this.magicSeconds = Math.max(0, this.magicSeconds - dt);
    const events: RudolphEvent[] = [];
    const contacts: { memory: FallingMemory; at: number }[] = [];
    for (const memory of this.falling) {
      const previousX = memory.x;
      const previousY = memory.y;
      if (magic && Math.abs(memory.x - this.playerX) < 0.33)
        memory.x += clamp(this.playerX - memory.x, -dt * 0.28, dt * 0.28);
      memory.y += (dt / memory.duration) * (magic ? 0.82 : 1);
      const at = sweptCatch(
        previousX,
        previousY,
        memory.x,
        memory.y,
        previousPlayer,
        this.playerX,
        catchRadius,
      );
      if (at !== undefined) contacts.push({ memory, at });
    }
    contacts.sort((a, b) => a.at - b.at || a.memory.instanceId - b.memory.instanceId);
    for (const { memory } of contacts) {
      this.falling.splice(this.falling.indexOf(memory), 1);
      const first = !this.savedPhotoIds.includes(memory.photoId);
      if (first) this.savedPhotoIds.push(memory.photoId);
      this.totalRescues++;
      this.retries.delete(memory.photoId);
      if (!magic) this.noseCharge = Math.min(3, this.noseCharge + 1);
      events.push({ type: 'caught', memory: { ...memory }, first });
      if (this.savedPhotoIds.length === this.photoIds.length) {
        this.phase = 'finishing';
        this.falling.length = 0;
        this.stopMovement();
        return events;
      }
    }
    for (const memory of [...this.falling]) {
      if (memory.y <= 1.22) continue;
      this.falling.splice(this.falling.indexOf(memory), 1);
      const attempts = (this.retries.get(memory.photoId)?.attempts ?? 0) + 1;
      this.retries.set(memory.photoId, { after: this.sequence + 2, attempts });
      events.push({ type: 'missed', memory: { ...memory } });
    }
    this.untilSpawn = Math.max(0, this.untilSpawn - dt);
    // Vertical spacing prevents frame overlap, even in the small-phone layout.
    if (
      allowSpawn &&
      this.untilSpawn === 0 &&
      this.falling.length < 2 &&
      this.falling.length + presentations + contacts.length < 4 &&
      this.falling.every((memory) => memory.y > 0.68)
    ) {
      if (this.falling.some((memory) => memory.golden)) return events;
      if (
        !this.goldenOffered &&
        this.savedPhotoIds.includes(this.photoIds[0]!) &&
        this.savedPhotoIds.length +
          this.falling.filter((memory) => !this.savedPhotoIds.includes(memory.photoId)).length >=
          Math.ceil(this.photoIds.length / 2) &&
        this.savedPhotoIds.length < Math.ceil(this.photoIds.length / 2)
      )
        return events;
      const golden =
        !this.goldenOffered &&
        this.savedPhotoIds.includes(this.photoIds[0]!) &&
        this.savedPhotoIds.length >= Math.ceil(this.photoIds.length / 2);
      // Give Santa an empty presentation lane. It is a repeat, never a new album requirement.
      if (golden && (this.falling.length > 0 || presentations > 0 || contacts.length > 0))
        return events;
      const photoId = golden ? this.photoIds[0] : this.choosePhoto();
      if (photoId) {
        const attempts = this.retries.get(photoId)?.attempts ?? 0;
        const sample = this.random.next();
        const size = sample < 0.25 ? 'small' : sample > 0.78 ? 'large' : 'medium';
        const memory: FallingMemory = {
          instanceId: ++this.sequence,
          photoId,
          size,
          golden,
          duration: golden
            ? 6
            : this.sequence === 1
              ? 5.6
              : Math.min(7, 4.2 + attempts * 0.65 + (size === 'large' ? 0.6 : 0)),
          phase: this.random.next() * Math.PI * 2,
          x: golden
            ? this.playerX
            : this.sequence === 1
              ? 0.5
              : clamp(
                  attempts > 1
                    ? this.playerX + (this.random.next() - 0.5) * 0.22
                    : 0.26 + this.random.next() * 0.48,
                  0.26,
                  0.74,
                ),
          y: 0,
        };
        this.falling.push(memory);
        if (golden) this.goldenOffered = true;
        this.offered.set(photoId, this.sequence);
        this.history.push(photoId);
        if (this.history.length > 2) this.history.shift();
        this.untilSpawn = 2.1;
        events.push({ type: 'spawned', memory: { ...memory } });
      }
    }
    return events;
  }

  private choosePhoto(): string | undefined {
    const available = this.photoIds.filter(
      (id) => !this.falling.some((memory) => memory.photoId === id),
    );
    const missing = available.filter((id) => !this.savedPhotoIds.includes(id));
    if (this.sequence === 0) return this.photoIds[0];
    if (this.photoIds.length - this.savedPhotoIds.length === 1) return missing[0];
    const due = missing.filter((id) => (this.retries.get(id)?.after ?? Infinity) <= this.sequence);
    if (due.length)
      return due.sort((a, b) => this.retries.get(a)!.after - this.retries.get(b)!.after)[0];
    const repeats = available.filter(
      (id) => this.savedPhotoIds.includes(id) && !this.history.slice(-2).includes(id),
    );
    if (this.sequence % 3 === 2 && repeats.length)
      return repeats[this.random.int(0, repeats.length - 1)];
    const eligible = missing.filter(
      (id) => !this.retries.has(id) || this.retries.get(id)!.after <= this.sequence,
    );
    if (eligible.length)
      return eligible.sort((a, b) => (this.offered.get(a) ?? -1) - (this.offered.get(b) ?? -1))[0];
    // If every missing photo is cooling down, keep the round live without starving it.
    return (
      repeats[0] ??
      missing.sort((a, b) => (this.offered.get(a) ?? -1) - (this.offered.get(b) ?? -1))[0]
    );
  }
}
