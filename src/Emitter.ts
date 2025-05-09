export type Callback = (...args: unknown[]) => void;

export interface IEvent {
  callback: Callback;
  context?: unknown;
  priority: number;
  once?: boolean;
}

export const DEFAULT_PRIORITY = 100;

export class Emitter {
  private listeners = new Map<string, IEvent[]>();

  public on(
    type: string,
    callback: Callback,
    context?: unknown,
    priority = DEFAULT_PRIORITY,
  ): this {
    this.addListener(type, callback, context, priority, false);
    return this;
  }

  public once(
    type: string,
    callback: Callback,
    context?: unknown,
    priority = DEFAULT_PRIORITY,
  ): this {
    this.addListener(type, callback, context, priority, true);
    return this;
  }

  public off(type: string, callback?: Callback, context?: unknown): this {
    if (!this.listeners.has(type)) return this;

    const filtered = callback
      ? this.listeners
          .get(type)!
          .filter(
            (l) =>
              l.callback !== callback || (context && l.context !== context),
          )
      : [];

    filtered.length
      ? this.listeners.set(type, filtered)
      : this.listeners.delete(type);
    return this;
  }

  protected emit(type: string, ...args: unknown[]): boolean {
    const listeners = this.listeners.get(type);
    if (!listeners) return false;

    for (const listener of [...listeners]) {
      listener.callback.call(listener.context, ...args);
      if (listener.once) this.off(type, listener.callback, listener.context);
    }

    return true;
  }

  private addListener(
    type: string,
    callback: Callback,
    context?: unknown,
    priority = DEFAULT_PRIORITY,
    once = false,
  ): void {
    const listeners = this.listeners.get(type) || [];

    if (
      listeners.some((l) => l.callback === callback && l.context === context)
    ) {
      throw new Error("Event listener already exists");
    }

    listeners.push({ callback, context, priority, once });
    listeners.sort((a, b) => a.priority - b.priority);
    this.listeners.set(type, listeners);
  }
}
