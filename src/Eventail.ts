import { ListenerIndex } from "./ListenerIndex";

/**
 * Represents a callback function that can be invoked with any number of arguments.
 *
 * @public
 */
export type Callback = (...args: any[]) => void;

/**
 * Interface representing an event listener configuration.
 *
 * @internal
 */
interface Listener {
  /** The callback function to be executed when the event is triggered */
  callback: Callback;
  /** Optional context object or Symbol for the callback execution */
  context?: object | Symbol;
  /** Priority of the event listener. Lower values indicate higher priority */
  priority: number;
  /** Whether the listener should be automatically removed after first execution */
  once: boolean;
  /** Whether the listener has been called at least once */
  called: boolean;
}

/**
 * Abstract base class for high-performance, priority-based event emitters.
 *
 * The name "Eventail" is a combination of "event" + "tail", reflecting its queue-like nature.
 * Features priority-based event listeners, context binding support, one-time event listeners,
 * type-safe event handling, and is optimized for performance.
 *
 * This class is designed to be extended by concrete implementations that can
 * emit events internally using the protected `emit` method.
 *
 * @example
 * ```typescript
 * class GameObject extends Eventail {
 *   private health = 100;
 *
 *   public takeDamage(amount: number) {
 *     this.health = Math.max(0, this.health - amount);
 *     // Emit internal state change event
 *     this.emit('healthChanged', this.health);
 *
 *     if (this.health <= 0) {
 *       this.emit('died');
 *     }
 *   }
 * }
 *
 * const gameObject = new GameObject();
 *
 * // Listen to internal state changes
 * gameObject.on('healthChanged', (health) => console.log('Health:', health));
 * gameObject.on('died', () => console.log('Game Over'));
 *
 * // Internal state change triggers events
 * gameObject.takeDamage(50); // Health: 50
 * gameObject.takeDamage(60); // Health: 0, Game Over
 * ```
 *
 * @public
 */
export abstract class Eventail {
  /**
   * Map storing event listeners for each event type.
   *
   * Each entry contains: [listeners array, emit lock flag, listener index]
   */
  private readonly listeners = new Map<
    string,
    [Listener[], boolean, ListenerIndex]
  >();

  /**
   * Adds an event listener for the specified event type.
   *
   * Listeners are executed in priority order (lower values first).
   * The execution order of listeners with the same priority is undefined.
   *
   * @param type - The event type to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context object or Symbol for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
   *
   * @public
   */
  public on(
    type: string,
    callback: Callback,
    context?: object | Symbol,
    priority = 0,
  ): Eventail {
    this.addListener(type, false, priority, callback, context);
    return this;
  }

  /**
   * Adds a one-time event listener that will be removed after first execution.
   *
   * Listeners are executed in priority order (lower values first).
   * The execution order of listeners with the same priority is undefined.
   *
   * @param type - The event type to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context object or Symbol for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
   *
   * @public
   */
  public once(
    type: string,
    callback: Callback,
    context?: object | Symbol,
    priority = 0,
  ): this {
    this.addListener(type, true, priority, callback, context);
    return this;
  }

  /**
   * Removes event listener(s) from the specified event type.
   *
   * If no callback is provided, removes all listeners for the event type.
   * If callback is provided, removes only matching listeners.
   * If context is also provided, removes only listeners with matching callback and context.
   *
   * @param type - The event type to remove listener(s) from
   * @param callback - Optional callback to remove specific listener
   * @param context - Optional context object or Symbol to match when removing
   * @returns The emitter instance for chaining
   *
   * @public
   */
  public off(
    type: string,
    callback?: Callback,
    context?: object | Symbol,
  ): Eventail {
    const listenerData = this.listeners.get(type);
    if (listenerData === undefined) {
      return this;
    }

    // If the list is locked during emit, create a copy to avoid mutation during iteration
    if (listenerData[1]) {
      listenerData[1] = false;
      listenerData[0] = listenerData[0].slice();
    }

    const list = listenerData[0];
    if (list.length === 0) {
      this.listeners.delete(type);
      return this;
    }

    // Remove all listeners for this event type
    if (callback === undefined) {
      this.listeners.delete(type);
      // Clean up listener index for all removed listeners
      for (let i = 0; i < list.length; i++) {
        const listener = list[i];
        listenerData[2].remove(listener.callback, listener.context);
      }
      return this;
    }

    // Remove specific listener matching callback and optional context
    {
      const listLength = list.length;
      if (listLength === 1) {
        this.listeners.delete(type);
      }

      if (list[0].callback === callback && list[0].context === context) {
        list.shift();
        return this;
      }

      let lastIndex = listLength - 1;
      if (
        list[lastIndex].callback === callback &&
        list[lastIndex].context === context
      ) {
        list.pop();
        return this;
      }

      const smallLength = 10;
      if (
        listLength < smallLength ||
        list[0].priority === list[lastIndex].priority
      ) {
        for (let i = 1; i < lastIndex; i++) {
          const listener = list[i];
          if (listener.callback === callback && listener.context === context) {
            const priority = listenerData[2].getPriority(callback, context);
            if (priority !== listener.priority) {
              throw new Error(
                `Priority mismatch, ${priority}, ${listener.priority}`,
              );
            }
            list.splice(i, 1);
            return this;
          }
        }
      } else {
        const priority = listenerData[2].getPriority(callback, context);
        if (priority === undefined) {
          return this;
        }

        let l = 0;
        let r = list.length - 1;

        while (l <= r) {
          const m = (l + r) >>> 1;
          list[m].priority < priority ? (l = m + 1) : (r = m - 1);
        }
        const start = l;

        r = list.length - 1;
        while (l <= r) {
          const m = (l + r) >>> 1;
          list[m].priority <= priority ? (l = m + 1) : (r = m - 1);
        }
        const end = r;

        for (let i = start; i <= end; i++) {
          if (list[i].callback === callback && list[i].context === context) {
            list.splice(i, 1);
            return this;
          }
        }
      }
    }

    return this;
  }

  /**
   * Emits an event, triggering all registered listeners in priority order.
   *
   * Listeners are called in priority order (lower priority values first).
   * One-time listeners are automatically removed after execution.
   *
   * This method is protected to allow the inheriting class to emit events
   * internally when its state changes, maintaining encapsulation by preventing
   * external entities from directly triggering events.
   *
   * @param type - The event type to emit
   * @param args - Arguments to pass to the listeners
   * @returns Boolean indicating if the event had listeners
   *
   * @protected
   */
  protected emit(type: string, ...args: unknown[]): boolean {
    const listenerData = this.listeners.get(type);
    if (listenerData === undefined) {
      return false;
    }

    if (listenerData[0].length === 0) {
      return false;
    }

    // Create a snapshot of listeners to iterate safely
    // This prevents issues if listeners are added/removed during emission
    if (listenerData[1]) {
      // Already locked, create a new copy
      listenerData[0] = listenerData[0].slice();
    } else {
      // Lock the current array to prevent mutations
      listenerData[1] = true;
    }

    const snapshot = listenerData[0];

    // Execute all listeners in the snapshot
    let hasItemsToDelete = false;
    for (let i = 0; i < snapshot.length; i++) {
      const listener = snapshot[i];
      listener.callback.apply(listener.context, args);

      // Mark one-time listeners for removal
      if (listener.once) {
        hasItemsToDelete = true;
        listener.called = true;
      }
    }

    // Check if the event type still exists (could be removed by a listener)
    const actualListenerData = this.listeners.get(type);
    if (actualListenerData === undefined) {
      return true;
    }

    // Release the lock if we're working with the original array
    if (actualListenerData[0] === snapshot) {
      actualListenerData[1] = false;
    }

    const list = actualListenerData[0];

    // Remove one-time listeners that were called
    if (hasItemsToDelete) {
      let w = 0; // Write index for in-place array compaction
      for (let r = 0; r < list.length; r++) {
        const listener = list[r];
        if (!listener.called) {
          // Keep this listener - copy to write position
          list[w++] = listener;
        } else {
          // Remove called once-listener from index
          actualListenerData[2].remove(listener.callback, listener.context);
        }
      }

      // Clean up the map entry if no listeners remain
      if (w === 0) {
        this.listeners.delete(type);
      } else {
        // Trim array to new size
        list.length = w;
      }
    }

    return true;
  }

  /**
   * Internal method to add a new event listener with the specified configuration.
   *
   * Uses binary search for optimal priority-based insertion.
   * Prevents duplicate listeners by checking the listener index.
   *
   * @param type - The event type to listen for
   * @param once - Whether the listener should be removed after first execution
   * @param priority - Priority value for the listener (lower = higher priority)
   * @param callback - The callback function
   * @param context - Optional context object or Symbol for the callback
   *
   * @throws Error when attempting to add a duplicate listener
   *
   * @private
   */
  private addListener(
    type: string,
    once: boolean,
    priority: number,
    callback: Callback,
    context?: object | Symbol,
  ): void {
    let listenerData = this.listeners.get(type);

    // First listener for this event type
    if (listenerData === undefined) {
      this.listeners.set(type, [
        [{ callback, context, priority, once, called: false }],
        false,
        new ListenerIndex(callback, context, priority),
      ]);
      return;
    }

    // Check for duplicate listeners
    const listenerIndex = listenerData[2];
    if (listenerIndex.has(callback, context)) {
      throw new Error("Event listener already exists");
    }
    listenerIndex.insert(callback, context, priority);

    const listener = { callback, context, priority, once, called: false };

    // If the list is locked during emit, create a copy to avoid mutation during iteration
    if (listenerData[1]) {
      listenerData[1] = false;
      listenerData[0] = listenerData[0].slice();
    }

    // Insert listener in priority order using optimized insertion
    {
      const list = listenerData[0];
      const priority = listener.priority;

      // Fast path: append if priority is lowest (most common case)
      if (list.length === 0 || list[list.length - 1].priority <= priority) {
        list.push(listener);
        return;
      }

      // Fast path: prepend if priority is highest
      if (list[0].priority >= priority) {
        list.unshift(listener);
        return;
      }

      {
        // Binary search to find insertion point
        let l = 0;
        let r = list.length;

        while (l < r) {
          const m = (l + r) >>> 1; // Unsigned right shift for fast division by 2
          list[m].priority < priority ? (l = m + 1) : (r = m);
        }

        // Insert at the found position
        list.splice(l, 0, listener);
      }
    }
  }
}
