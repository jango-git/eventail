/**
 * A high-performance index for tracking listener callback and context pairs.
 *
 * Provides fast duplicate detection for event listener registration by maintaining
 * an optimized data structure that maps contexts to their associated callback functions.
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
  /** Maps context objects to their associated callback functions */
  private readonly contextMap = new WeakMap<
    object | Symbol,
    Map<Function, number>
  >();
  /** Stores callbacks that have no associated context */
  private readonly noContextCallbacks = new Map<Function, number>();

  /**
   * Creates a new ListenerIndex instance with an initial callback-context pair.
   *
   * @param callback - The initial callback function to register
   * @param context - Optional context object or Symbol to associate with the callback
   *
   * @internal
   */
  constructor(callback?: Function, context?: object | Symbol, priority = 0) {
    if (callback !== undefined) {
      if (context === undefined) {
        this.noContextCallbacks.set(callback, priority);
      } else {
        this.contextMap.set(
          context,
          new Map<Function, number>([[callback, priority]]),
        );
      }
    }
  }

  /**
   * Inserts a callback-context pair into the index.
   *
   * If the pair already exists, this operation has no effect.
   * Uses WeakMap for context-based storage to enable automatic garbage collection.
   *
   * @param callback - The callback function to register
   * @param context - Optional context object or Symbol to associate with the callback
   *
   * @internal
   */
  public insert(
    callback: Function,
    context?: object | Symbol,
    priority = 0,
  ): void {
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
        new Map<Function, number>([[callback, priority]]),
      );
    } else if (!callbacks.has(callback)) {
      callbacks.set(callback, priority);
    }
  }

  /**
   * Removes a callback-context pair from the index.
   *
   * If the pair doesn't exist, this operation has no effect.
   * Automatically cleans up empty context entries to prevent memory leaks.
   *
   * @param callback - The callback function to remove
   * @param context - Optional context object or Symbol associated with the callback
   *
   * @internal
   */
  public remove(callback: Function, context?: object | Symbol): void {
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
   * This is the primary operation for duplicate detection and is optimized
   * for maximum performance with O(1) average time complexity.
   *
   * @param callback - The callback function to check
   * @param context - Optional context object or Symbol to check association with
   * @returns `true` if the pair exists, `false` otherwise
   *
   * @internal
   */
  public has(callback: Function, context?: object | Symbol): boolean {
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
   * This method allows querying the priority of a registered listener
   * for potential reordering or priority-based operations.
   *
   * @param callback - The callback function to check
   * @param context - Optional context object or Symbol to check association with
   * @returns The priority value if the pair exists, `undefined` otherwise
   *
   * @internal
   */
  public getPriority(
    callback: Function,
    context?: object | Symbol,
  ): number | undefined {
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
