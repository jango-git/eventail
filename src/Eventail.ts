import { ListenerIndex } from "./ListenerIndex";

/**
 * Represents a callback function that can be invoked with any number of arguments.
 *
 * @public
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Using any here for generic condition function arguments */
export type Callback = (...args: any[]) => any;

/**
 * Interface representing an event listener configuration.
 *
 * @internal
 *
 * Note:
 * Underscore-prefixed fields are used intentionally to mark internal runtime properties.
 * This violates the usual naming convention to keep public API clean,
 * but here the underscore hints the bundler/minifier (like Terser) which properties can be mangled safely.
 */
interface Listener {
  /** The callback function to be executed when the event is triggered */
  _callback: Callback;

  /** Optional context object or Symbol for the callback execution */
  _context?: object | Symbol;

  /** Priority of the event listener. Lower values indicate higher priority */
  _priority: number;

  /** Whether the listener should be automatically removed after first execution */
  _once: boolean;

  /** Whether the listener has been called at least once */
  _called: boolean;
}

/**
 * Internal structure that holds the list of listeners for a specific event type,
 * along with metadata used to manage the listeners.
 *
 * @internal
 *
 * Note:
 * Underscore-prefixed fields are used intentionally to mark internal runtime properties.
 * This violates the usual naming convention to keep public API clean,
 * but here the underscore hints the bundler/minifier (like Terser) which properties can be mangled safely.
 */
interface ListenerData {
  /** Array of registered event listeners for the event type */
  _listeners: Listener[];

  /** Flag indicating whether the listener list is locked for safe mutation during emission */
  _isLocked: boolean;

  /** Index to manage quick lookup and priority handling of listeners */
  _index: ListenerIndex;
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
  /** Map storing event listeners for each event type */
  private readonly listeners = new Map<string | number, ListenerData>();

  /**
   * Adds an event listener for the specified event type.
   *
   * Listeners are executed in priority order (lower values first).
   * The execution order of listeners with the same priority is undefined.
   *
   * @param type - The event type (string or number) to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context object or Symbol for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
   *
   * @public
   */
  public on(
    type: string | number,
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
   * @param type - The event type (string or number) to listen for
   * @param callback - The function to be called when the event is emitted
   * @param context - Optional this context object or Symbol for the callback
   * @param priority - Optional priority value (lower = higher priority)
   * @returns The emitter instance for chaining
   *
   * @public
   */
  public once(
    type: string | number,
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
   * @param type - The event type (string or number) to remove listener(s) from
   * @param callback - Optional callback to remove specific listener
   * @param context - Optional context object or Symbol to match when removing
   * @returns The emitter instance for chaining
   *
   * @public
   */
  public off(
    type: string | number,
    callback?: Callback,
    context?: object | Symbol,
  ): Eventail {
    const listenerData = this.listeners.get(type);
    if (listenerData === undefined) {
      return this;
    }

    // If the list is locked during emit, create a copy to avoid mutation during iteration
    if (listenerData._isLocked) {
      listenerData._isLocked = false;
      listenerData._listeners = listenerData._listeners.slice();
    }

    const list = listenerData._listeners;
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
        listenerData._index.remove(listener._callback, listener._context);
      }
      return this;
    }

    // Remove specific listener matching callback and optional context
    {
      const listLength = list.length;
      if (list[0]._callback === callback && list[0]._context === context) {
        listLength === 1 ? this.listeners.delete(type) : list.shift();
        return this;
      }

      const lastIndex = listLength - 1;
      if (
        list[lastIndex]._callback === callback &&
        list[lastIndex]._context === context
      ) {
        list.pop();
        return this;
      }

      const smallLength = 10;
      if (
        listLength < smallLength ||
        list[0]._priority === list[lastIndex]._priority
      ) {
        for (let i = 1; i < lastIndex; i++) {
          const listener = list[i];
          if (
            listener._callback === callback &&
            listener._context === context
          ) {
            list.splice(i, 1);
            return this;
          }
        }
      } else {
        const priority = listenerData._index.getPriority(callback, context);
        if (priority === undefined) {
          return this;
        }

        let l = 0;
        let r = list.length - 1;

        while (l <= r) {
          const m = (l + r) >>> 1;
          list[m]._priority < priority ? (l = m + 1) : (r = m - 1);
        }
        const start = l;

        r = list.length - 1;
        while (l <= r) {
          const m = (l + r) >>> 1;
          list[m]._priority <= priority ? (l = m + 1) : (r = m - 1);
        }
        const end = r;

        for (let i = start; i <= end; i++) {
          if (list[i]._callback === callback && list[i]._context === context) {
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
   * @param type - The event type (string or number) to emit
   * @param args - Arguments to pass to the listeners
   * @returns Boolean indicating if the event had listeners
   *
   * @protected
   */
  protected emit(type: string | number, ...args: unknown[]): boolean {
    const listenerData = this.listeners.get(type);
    if (listenerData === undefined) {
      return false;
    }

    if (listenerData._listeners.length === 0) {
      return false;
    }

    // Create a snapshot of listeners to iterate safely
    // This prevents issues if listeners are added/removed during emission
    if (listenerData._isLocked) {
      // Already locked, create a new copy
      listenerData._listeners = listenerData._listeners.slice();
    } else {
      // Lock the current array to prevent mutations
      listenerData._isLocked = true;
    }

    const snapshot = listenerData._listeners;

    // Execute all listeners in the snapshot
    let hasItemsToDelete = false;
    for (let i = 0; i < snapshot.length; i++) {
      const listener = snapshot[i];
      listener._callback.apply(listener._context, args);

      // Mark one-time listeners for removal
      if (listener._once) {
        hasItemsToDelete = true;
        listener._called = true;
      }
    }

    // Check if the event type still exists (could be removed by a listener)
    const actualListenerData = this.listeners.get(type);
    if (actualListenerData === undefined) {
      return true;
    }

    // Release the lock if we're working with the original array
    if (actualListenerData._listeners === snapshot) {
      actualListenerData._isLocked = false;
    }

    const list = actualListenerData._listeners;

    // Remove one-time listeners that were called
    if (hasItemsToDelete) {
      let w = 0; // Write index for in-place array compaction
      for (let r = 0; r < list.length; r++) {
        const listener = list[r];
        if (!listener._called) {
          // Keep this listener - copy to write position
          list[w++] = listener;
        } else {
          // Remove called once-listener from index
          actualListenerData._index.remove(
            listener._callback,
            listener._context,
          );
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
   * @param type - The event type (string or number) to listen for
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
    type: string | number,
    once: boolean,
    priority: number,
    callback: Callback,
    context?: object | Symbol,
  ): void {
    let listenerData = this.listeners.get(type);

    // First listener for this event type
    if (listenerData === undefined) {
      this.listeners.set(type, {
        _listeners: [
          {
            _callback: callback,
            _context: context,
            _priority: priority,
            _once: once,
            _called: false,
          },
        ],
        _isLocked: false,
        _index: new ListenerIndex(callback, context, priority),
      });
      return;
    }

    // Check for duplicate listeners
    if (listenerData._index.has(callback, context)) {
      throw new Error("Event listener already exists");
    }
    listenerData._index.insert(callback, context, priority);

    const listener: Listener = {
      _callback: callback,
      _context: context,
      _priority: priority,
      _once: once,
      _called: false,
    };

    // If the list is locked during emit, create a copy to avoid mutation during iteration
    if (listenerData._isLocked) {
      listenerData._isLocked = false;
      listenerData._listeners = listenerData._listeners.slice();
    }

    // Insert listener in priority order using optimized insertion
    {
      const list = listenerData._listeners;
      const priority = listener._priority;

      // Fast path: append if priority is lowest (most common case)
      if (list.length === 0 || list[list.length - 1]._priority <= priority) {
        list.push(listener);
        return;
      }

      // Fast path: prepend if priority is highest
      if (list[0]._priority >= priority) {
        list.unshift(listener);
        return;
      }

      {
        // Binary search to find insertion point
        let l = 0;
        let r = list.length;

        while (l < r) {
          const m = (l + r) >>> 1; // Unsigned right shift for fast division by 2
          list[m]._priority < priority ? (l = m + 1) : (r = m);
        }

        // Insert at the found position
        list.splice(l, 0, listener);
      }
    }
  }
}
