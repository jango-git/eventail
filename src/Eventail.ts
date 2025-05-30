/**
 * Default priority value for event listeners.
 * Lower values indicate higher priority.
 */
const DEFAULT_PRIORITY = 100;

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
 * A high-performance, priority-based event emitter implementation.
 * The name "Eventail" is a combination of "event" + "tail", reflecting its queue-like nature.
 *
 * Features:
 * - Priority-based event listeners
 * - Context binding support
 * - One-time event listeners
 * - Type-safe event handling
 * - Optimized for performance
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

  /** WeakMap for storing listener signatures to detect duplicates */
  private readonly signatures = new WeakMap<Callback, Set<unknown>>();

  /**
   * Adds an event listener for the specified event type.
   *
   * @param type - The event type to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
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
   */
  public off(type: string, callback?: Callback, context?: unknown): this {
    const list = this.listeners.get(type);
    if (!list?.length) {
      this.listeners.delete(type);
      return this;
    }

    if (!callback) {
      this.listeners.delete(type);
      for (const listener of list) {
        const contexts = this.signatures.get(listener.callback);
        if (contexts) {
          contexts.delete(listener.context);
          if (contexts.size === 0) {
            this.signatures.delete(listener.callback);
          }
        }
      }
      return this;
    }

    // In-place filtering for better performance
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < list.length; readIndex++) {
      const listener = list[readIndex];
      if (
        listener.callback !== callback ||
        (context !== undefined && listener.context !== context)
      ) {
        if (writeIndex !== readIndex) {
          list[writeIndex] = listener;
        }
        writeIndex++;
      } else {
        const contexts = this.signatures.get(callback);
        if (contexts) {
          contexts.delete(listener.context);
          if (contexts.size === 0) {
            this.signatures.delete(callback);
          }
        }
      }
    }

    if (writeIndex === 0) {
      this.listeners.delete(type);
    } else {
      list.length = writeIndex;
    }

    return this;
  }

  /**
   * Emits an event, triggering all registered listeners in priority order.
   * Protected method to allow extension in derived classes.
   *
   * @param type - The event type to emit
   * @param args - Arguments to pass to the listeners
   * @returns Boolean indicating if the event had listeners
   */
  protected emit(type: string, ...args: unknown[]): boolean {
    const list = this.listeners.get(type);
    if (!list?.length) {
      return false;
    }

    let hasRemovals = false;
    let i = 0;

    // Direct array iteration without copying
    while (i < list.length) {
      const listener = list[i];
      listener.callback.apply(listener.context, args);

      if (listener.once) {
        hasRemovals = true;
        const contexts = this.signatures.get(listener.callback);
        if (contexts) {
          contexts.delete(listener.context);
          if (contexts.size === 0) {
            this.signatures.delete(listener.callback);
          }
        }
        list.splice(i, 1);
      } else {
        i++;
      }
    }

    if (hasRemovals && list.length === 0) {
      this.listeners.delete(type);
    }

    return true;
  }

  /**
   * Internal method to add a new event listener with the specified configuration.
   * Uses binary search for faster priority-based insertion.
   */
  private addListener(
    type: string,
    callback: Callback,
    context: unknown,
    priority: number,
    once: boolean,
  ): void {
    // Check for duplicate listener
    let contexts = this.signatures.get(callback);
    if (contexts) {
      if (contexts.has(context)) {
        throw new Error("Event listener already exists");
      }
    } else {
      contexts = new Set();
      this.signatures.set(callback, contexts);
    }
    contexts.add(context);

    const event: Event = { callback, context, priority, once };
    let list = this.listeners.get(type);

    if (!list) {
      this.listeners.set(type, [event]);
      return;
    }

    // Binary search for insertion point
    let left = 0;
    let right = list.length;

    while (left < right) {
      const mid = (left + right) >>> 1;
      if (list[mid].priority <= priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    list.splice(left, 0, event);
  }
}
