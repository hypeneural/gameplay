import type { Photo, PhotoCatalog, Session } from '../contracts/index.js';

export class InMemoryPhotoCatalog implements PhotoCatalog {
  constructor(private readonly sessions: readonly Session[]) {}

  async list(sessionId: string): Promise<readonly Photo[]> {
    const session = this.sessions.find((candidate) => candidate.id === sessionId);
    if (!session) throw new Error('Session was not found.');
    return session.photos;
  }
}
