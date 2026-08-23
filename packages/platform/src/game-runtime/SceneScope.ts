type Dispose = () => void;

export interface EventEmitterLike {
  on(event: string | symbol, listener: (...args: never[]) => unknown, context?: unknown): unknown;
  off(event: string | symbol, listener?: (...args: never[]) => unknown, context?: unknown): unknown;
}

export interface Stoppable {
  stop?(): unknown;
  destroy?(): unknown;
  remove?(): unknown;
}

export interface TextureStore {
  exists(key: string): boolean;
  remove(key: string): unknown;
}

/**
 * Owns resources created by one Scene. It uses structural types so the
 * platform remains Phaser-independent, while Phaser scenes receive typed use.
 */
export class SceneScope {
  private readonly cleanups: Dispose[] = [];
  private closed = false;

  on(
    emitter: EventEmitterLike,
    event: string | symbol,
    listener: (...args: never[]) => unknown,
    context?: unknown,
  ): void {
    this.add(() => emitter.off(event, listener, context));
    emitter.on(event, listener, context);
  }

  resource<T extends Stoppable>(resource: T): T {
    this.add(() => {
      resource.stop?.();
      resource.remove?.();
      resource.destroy?.();
    });
    return resource;
  }

  texture(store: TextureStore, key: string): void {
    this.add(() => {
      if (store.exists(key)) store.remove(key);
    });
  }

  add(cleanup: Dispose): void {
    if (this.closed) {
      throw new Error('A closed SceneScope cannot own new resources.');
    }
    this.cleanups.push(cleanup);
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop();
      try {
        cleanup?.();
      } catch {
        // A later cleanup must not be skipped because one Phaser resource failed.
      }
    }
  }
}
