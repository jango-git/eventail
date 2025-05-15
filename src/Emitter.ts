export const DEFAULT_PRIORITY = 100;

export type Callback = (...args: any[]) => void;

export interface IEvent {
  callback: Callback;
  context?: unknown;
  priority: number;
  once?: boolean;
}

/**
 * Base event emitter class. Meant to be extended.
 * Supports any string event with arbitrary arguments.
 */
export class Emitter {
  private listeners = new Map<string, IEvent[]>();

  /**
   * Registers a listener for the specified event.
   *
   * @param type Name of the event to listen for.
   * @param callback Function to call when the event is emitted.
   * @param context Optional `this` context for the callback.
   * @param priority Execution priority (lower values are called earlier). Defaults to 100.
   * @returns The current instance for chaining.
   */
  public on(
    type: string,
    callback: Callback,
    context?: unknown,
    priority = DEFAULT_PRIORITY,
  ): this {
    this.addListener(type, callback, context, priority, false);
    return this;
  }

  /**
   * Registers a one-time listener for the specified event.
   * The listener is automatically removed after the first call.
   *
   * @param type Name of the event to listen for.
   * @param callback Function to call when the event is emitted.
   * @param context Optional `this` context for the callback.
   * @param priority Execution priority (lower values are called earlier). Defaults to 100.
   * @returns The current instance for chaining.
   */
  public once(
    type: string,
    callback: Callback,
    context?: unknown,
    priority = DEFAULT_PRIORITY,
  ): this {
    this.addListener(type, callback, context, priority, true);
    return this;
  }

  /**
   * Removes a listener from the specified event.
   * If no callback is provided, removes all listeners for that event.
   *
   * @param type Name of the event.
   * @param callback The callback to remove (optional).
   * @param context Context to match if a callback is provided.
   * @returns The current instance for chaining.
   */
  public off(type: string, callback?: Callback, context?: unknown): this {
    const current = this.listeners.get(type);
    if (!current) return this;

    if (!callback) {
      this.listeners.delete(type);
      return this;
    }

    const filtered = current.filter(
      (l) =>
        l.callback !== callback ||
        (context !== undefined && l.context !== context),
    );

    filtered.length
      ? this.listeners.set(type, filtered)
      : this.listeners.delete(type);

    return this;
  }

  /**
   * Emits an event, calling all listeners registered for it with the given arguments.
   *
   * @param type Name of the event to emit.
   * @param args Arguments to pass to the event listeners.
   * @returns `true` if any listeners were called, otherwise `false`.
   */
  protected emit(type: string, ...args: unknown[]): boolean {
    const current = this.listeners.get(type);
    if (!current?.length) return false;

    for (const listener of [...current]) {
      listener.callback.apply(listener.context, args);
      if (listener.once) this.off(type, listener.callback, listener.context);
    }

    return true;
  }

  /**
   * Internal method to register a listener for an event.
   *
   * @param type Name of the event.
   * @param callback Callback function.
   * @param context `this` context for the callback.
   * @param priority Listener execution priority.
   * @param once Whether the listener should be called only once.
   * @throws If the same callback and context are already registered for the event.
   */
  private addListener(
    type: string,
    callback: Callback,
    context: unknown,
    priority: number,
    once: boolean,
  ): void {
    let list = this.listeners.get(type);
    if (!list) {
      list = [];
      this.listeners.set(type, list);
    }

    if (list.some((l) => l.callback === callback && l.context === context)) {
      throw new Error("Event listener already exists");
    }

    const event: IEvent = { callback, context, priority, once };
    let i = 0;
    while (i < list.length && list[i].priority <= priority) i++;
    list.splice(i, 0, event);
  }
}
