import type { Session, SessionRepository } from '../contracts/index.js';

export class InMemorySessionRepository implements SessionRepository {
  constructor(private readonly sessions: readonly Session[]) {}

  async getByToken(token: string): Promise<Session> {
    const session = this.sessions.find((candidate) => candidate.publicToken === token);
    if (!session) throw new Error('Session was not found.');
    return session;
  }
}
