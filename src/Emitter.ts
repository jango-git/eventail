/**
 * Default priority value for event listeners.
 * Lower values indicate higher priority.
 */
export const DEFAULT_PRIORITY = 100;

/**
 * Represents a callback function that can be invoked with any number of arguments.
 */
export type Callback = (...args: any[]) => void;

/**
 * Interface representing an event listener configuration.
 */
export interface Event {
  /** The callback function to be executed when the event is triggered */
  callback: Callback;
  /** Optional context (this value) for the callback execution */
  context?: unknown;
  /** Priority of the event listener. Lower values indicate higher priority */
  priority: number;
  /** Whether the listener should be automatically removed after first execution */
  once?: boolean;
}

/**
 * A priority-based event emitter implementation.
 * The name "Eventail" is a combination of "event" + "tail", reflecting its queue-like nature.
 * 
 * Features:
 * - Priority-based event listeners
 * - Context binding support
 * - One-time event listeners
 * - Type-safe event handling
 * 
 * @example
 * ```typescript
 * const emitter = new Eventail();
 * 
 * // Regular event listener
 * emitter.on('event', (data) => console.log(data));
 * 
 * // One-time event listener with high priority
 * emitter.once('event', callback, context, 50);
 * 
 * // Remove specific listener
 * emitter.off('event', callback);
 * ```
 */
export class Eventail {
  /** Map storing event listeners for each event type */
  private readonly listeners = new Map<string, Event[]>();

  /**
   * Adds an event listener for the specified event type.
   * 
   * @param type - The event type to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
   * 
   * @example
   * ```typescript
   * emitter.on('data', (value) => console.log(value));
   * emitter.on('error', handleError, this, 50);
   * ```
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
   * Adds a one-time event listener that will be removed after first execution.
   * 
   * @param type - The event type to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
   * 
   * @example
   * ```typescript
   * emitter.once('init', () => console.log('Initialized'));
   * ```
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
   * Removes event listener(s) from the specified event type.
   * 
   * @param type - The event type to remove listener(s) from
   * @param callback - Optional callback to remove specific listener
   * @param context - Optional context to match when removing
   * @returns The emitter instance for chaining
   * 
   * @example
   * ```typescript
   * // Remove all listeners for 'data' event
   * emitter.off('data');
   * 
   * // Remove specific listener
   * emitter.off('data', callback);
   * 
   * // Remove listener with specific context
   * emitter.off('data', callback, context);
   * ```
   */
  public off(type: string, callback?: Callback, context?: unknown): this {
    const current = this.listeners.get(type);
    if (!current) {
      return this;
    }

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
   * Emits an event, triggering all registered listeners in priority order.
   * Protected method to allow extension in derived classes.
   * 
   * @param type - The event type to emit
   * @param args - Arguments to pass to the listeners
   * @returns Boolean indicating if the event had listeners
   * 
   * @example
   * ```typescript
   * class MyEmitter extends Eventail {
   *   public trigger(type: string, ...args: unknown[]) {
   *     return this.emit(type, ...args);
   *   }
   * }
   * ```
   */
  protected emit(type: string, ...args: unknown[]): boolean {
    const current = this.listeners.get(type);
    if (!current?.length) {
      return false;
    }

    for (const listener of [...current]) {
      listener.callback.apply(listener.context, args);
      if (listener.once) {
        this.off(type, listener.callback, listener.context);
      }
    }

    return true;
  }

  /**
   * Internal method to add a new event listener with the specified configuration.
   * Maintains priority order and prevents duplicate listeners.
   * 
   * @param type - Event type
   * @param callback - Event callback
   * @param context - Callback context
   * @param priority - Event priority
   * @param once - Whether it's a one-time listener
   * @throws {Error} If the listener already exists
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

    const event: Event = { callback, context, priority, once };
    let i = 0;
    while (i < list.length && list[i].priority <= priority) {
      i++;
    }
    list.splice(i, 0, event);
  }
}