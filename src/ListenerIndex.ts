import type { Callback } from "./Eventail";

/**
 * Index for tracking listener callback and context pairs.
 * Uses WeakMap for automatic garbage collection of context objects.
 *
 * @example
 * ```ts
 * const callback = () => console.log('hello');
 * const context = { name: 'component' };
 * const index = new ListenerIndex(callback, context);
 *
 * console.log(index.has(callback, context)); // true
 * index.remove(callback, context);
 * console.log(index.has(callback, context)); // false
 * ```
 *
 * @internal
 */
export class ListenerIndex {
  /** Maps context objects to their callback functions */
  private readonly contextMap = new WeakMap<object, Map<Callback, number>>();
  /** Stores callbacks with no context */
  private readonly noContextCallbacks = new Map<Callback, number>();

  /**
   * Creates a new ListenerIndex instance with an initial callback-context pair.
   *
   * @param callback - The initial callback function to register
   * @param context - Optional context object to associate with the callback
   * @param priority - Priority value for the callback
   *
   * @internal
   */
  constructor(callback?: Callback, context?: object, priority = 0) {
    if (callback !== undefined) {
      if (context === undefined) {
        this.noContextCallbacks.set(callback, priority);
      } else {
        this.contextMap.set(
          context,
          new Map<Callback, number>([[callback, priority]]),
        );
      }
    }
  }

  /**
   * Inserts a callback-context pair into the index.
   *
   * @param callback - The callback function to register
   * @param context - Optional context object to associate with the callback
   * @param priority - Priority value for the callback
   *
   * @internal
   */
  public insert(callback: Callback, context?: object, priority = 0): void {
    if (context === undefined) {
      if (this.noContextCallbacks.has(callback)) {
        return;
      }

      this.noContextCallbacks.set(callback, priority);
      return;
    }

    const callbacks = this.contextMap.get(context);
    if (callbacks === undefined) {
      this.contextMap.set(
        context,
        new Map<Callback, number>([[callback, priority]]),
      );
    } else if (!callbacks.has(callback)) {
      callbacks.set(callback, priority);
    }
  }

  /**
   * Removes a callback-context pair from the index.
   * Cleans up empty context entries.
   *
   * @param callback - The callback function to remove
   * @param context - Optional context object associated with the callback
   *
   * @internal
   */
  public remove(callback: Callback, context?: object): void {
    if (context === undefined) {
      this.noContextCallbacks.delete(callback);
      return;
    }

    const callbacks = this.contextMap.get(context);
    if (callbacks === undefined) {
      return;
    }

    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.contextMap.delete(context);
    }
    return;
  }

  /**
   * Checks if a callback-context pair exists in the index.
   *
   * @param callback - The callback function to check
   * @param context - Optional context object to check association with
   * @returns `true` if the pair exists, `false` otherwise
   *
   * @internal
   */
  public has(callback: Callback, context?: object): boolean {
    if (context === undefined) {
      return this.noContextCallbacks.has(callback);
    }
    const callbacks = this.contextMap.get(context);
    if (callbacks === undefined) {
      return false;
    }
    return callbacks.has(callback);
  }

  /**
   * Retrieves the priority value for a callback-context pair.
   *
   * @param callback - The callback function to check
   * @param context - Optional context object to check association with
   * @returns The priority value if the pair exists, `undefined` otherwise
   *
   * @internal
   */
  public getPriority(callback: Callback, context?: object): number | undefined {
    if (context === undefined) {
      return this.noContextCallbacks.get(callback);
    }
    const callbacks = this.contextMap.get(context);
    if (callbacks === undefined) {
      return undefined;
    }
    return callbacks.get(callback);
  }
}
