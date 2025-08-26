import { test } from "uvu";
import * as assert from "uvu/assert";
import { ListenerIndex } from "../src/ListenerIndex.js";

// ============================================================================
// Basic Functionality Tests
// ============================================================================

test("should create empty index", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};
  const context = { id: 1 };

  assert.is(index.has(callback), false);
  assert.is(index.has(callback, context), false);
});

test("should insert and find callback without context", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};

  index.insert(callback);
  assert.is(index.has(callback), true);
  assert.is(index.has(callback, { id: 1 }), false);
});

test("should insert and find callback with context", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};
  const context = { id: 1 };

  index.insert(callback, context);
  assert.is(index.has(callback, context), true);
  assert.is(index.has(callback), false);
});

test("should handle multiple callbacks with same context", () => {
  const index = new ListenerIndex();
  const callback1 = (): void => {};
  const callback2 = (): void => {};
  const context = { id: 1 };

  index.insert(callback1, context);
  index.insert(callback2, context);

  assert.is(index.has(callback1, context), true);
  assert.is(index.has(callback2, context), true);
});

test("should handle same callback with different contexts", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};
  const context1 = { id: 1 };
  const context2 = { id: 2 };

  index.insert(callback, context1);
  index.insert(callback, context2);

  assert.is(index.has(callback, context1), true);
  assert.is(index.has(callback, context2), true);
  assert.is(index.has(callback), false);
});

// ============================================================================
// Duplicate Detection Tests
// ============================================================================

test("should handle duplicate insertion gracefully", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};
  const context = { id: 1 };

  index.insert(callback, context);
  // Should not throw on duplicate
  assert.not.throws(() => {
    index.insert(callback, context);
  });

  assert.is(index.has(callback, context), true);
});

// ============================================================================
// Removal Tests
// ============================================================================

test("should remove callback without context", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};

  index.insert(callback);
  index.remove(callback);
  assert.is(index.has(callback), false);
});

test("should remove callback with context", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};
  const context = { id: 1 };

  index.insert(callback, context);
  index.remove(callback, context);
  assert.is(index.has(callback, context), false);
});

test("should handle removal of non-existent callback", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};

  assert.not.throws(() => {
    index.remove(callback);
    index.remove(callback, { id: 1 });
  });
});

test("should clean up context when all callbacks removed", () => {
  const index = new ListenerIndex();
  const callback1 = (): void => {};
  const callback2 = (): void => {};
  const context = { id: 1 };

  index.insert(callback1, context);
  index.insert(callback2, context);

  index.remove(callback1, context);
  assert.is(index.has(callback2, context), true);

  index.remove(callback2, context);
  assert.is(index.has(callback1, context), false);
  assert.is(index.has(callback2, context), false);
});

// ============================================================================
// Edge Cases
// ============================================================================

test("should handle different object references as different contexts", () => {
  const index = new ListenerIndex();
  const callback = (): void => {};

  const context1 = { id: 1 };
  const context2 = { id: 1 }; // Same content, different reference

  index.insert(callback, context1);
  index.insert(callback, context2);

  assert.is(index.has(callback, context1), true);
  assert.is(index.has(callback, context2), true);

  index.remove(callback, context1);
  assert.is(index.has(callback, context1), false);
  assert.is(index.has(callback, context2), true);
});

test("should handle functions with same implementation as different callbacks", () => {
  const index = new ListenerIndex();
  const context = { id: 1 };

  const callback1 = (): string => {
    return "same";
  };
  const callback2 = (): string => {
    return "same";
  };

  index.insert(callback1, context);
  index.insert(callback2, context);

  assert.is(index.has(callback1, context), true);
  assert.is(index.has(callback2, context), true);

  index.remove(callback1, context);
  assert.is(index.has(callback1, context), false);
  assert.is(index.has(callback2, context), true);
});
// ============================================================================
// Constructor Edge Cases
// ============================================================================

test("should create index with only callback in constructor", () => {
  const callback = (): void => {};

  const index = new ListenerIndex(callback);
  assert.is(index.has(callback), true);
  assert.is(index.has(callback, { test: true }), false);
});

test("should handle constructor with undefined callback", () => {
  const index = new ListenerIndex(undefined, { test: true });

  // Should not crash and should be empty
  const testCallback = (): void => {};
  assert.is(index.has(testCallback), false);
  assert.is(index.has(testCallback, { test: true }), false);
});

test("should handle constructor with undefined context", () => {
  const callback = (): void => {};

  const index = new ListenerIndex(callback, undefined);
  assert.is(index.has(callback), true);
  assert.is(index.has(callback, undefined), true);
});

// ============================================================================
// Performance Test
// ============================================================================

test("should handle large number of operations efficiently", () => {
  const index = new ListenerIndex();
  const numCallbacks = 1000;
  const callbacks: (() => number)[] = [];
  const contexts: { id: number }[] = [];

  // Create callbacks and contexts
  for (let i = 0; i < numCallbacks; i++) {
    callbacks.push(() => i);
    contexts.push({ id: i });
  }

  const startTime = Date.now();

  // Insert all callbacks
  for (let i = 0; i < numCallbacks; i++) {
    index.insert(callbacks[i], contexts[i]);
  }

  // Check all callbacks exist
  for (let i = 0; i < numCallbacks; i++) {
    assert.is(index.has(callbacks[i], contexts[i]), true);
  }

  // Remove half
  for (let i = 0; i < numCallbacks / 2; i++) {
    index.remove(callbacks[i], contexts[i]);
  }

  // Check remaining
  for (let i = 0; i < numCallbacks / 2; i++) {
    assert.is(index.has(callbacks[i], contexts[i]), false);
  }
  for (let i = numCallbacks / 2; i < numCallbacks; i++) {
    assert.is(index.has(callbacks[i], contexts[i]), true);
  }

  const duration = Date.now() - startTime;
  // Should complete reasonably fast (less than 100ms)
  assert.ok(duration < 100);
});

// ============================================================================
// Mixed Operations Test
// ============================================================================

test("should handle mixed operations sequence", () => {
  const index = new ListenerIndex();
  const callback1 = (): number => 1;
  const callback2 = (): number => 2;
  const context1 = { id: 1 };
  const context2 = { id: 2 };

  // Complex sequence of operations
  index.insert(callback1);
  index.insert(callback1, context1);
  index.insert(callback2, context1);
  index.insert(callback2, context2);

  assert.is(index.has(callback1), true);
  assert.is(index.has(callback1, context1), true);
  assert.is(index.has(callback2, context1), true);
  assert.is(index.has(callback2, context2), true);

  index.remove(callback1, context1);
  assert.is(index.has(callback1), true);
  assert.is(index.has(callback1, context1), false);
  assert.is(index.has(callback2, context1), true);

  index.remove(callback2, context1);
  assert.is(index.has(callback2, context1), false);
  assert.is(index.has(callback2, context2), true);
});

test.run();
