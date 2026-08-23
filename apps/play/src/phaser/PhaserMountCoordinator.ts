/**
 * Phaser owns global canvas and input state. A lease makes a new mount wait
 * until the previous instance has emitted its real destroy completion.
 */
export class PhaserMountCoordinator {
  private tail: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let released = false;
    let resolveLease: (() => void) | undefined;
    const lease = new Promise<void>((resolve) => {
      resolveLease = resolve;
    });
    const previous = this.tail;
    this.tail = previous.catch(() => undefined).then(() => lease);
    await previous.catch(() => undefined);

    return () => {
      if (released) return;
      released = true;
      resolveLease?.();
    };
  }
}
