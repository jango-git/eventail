import { test } from "uvu";
import * as assert from "uvu/assert";
import { Eventail } from "../src/Eventail.js";

// Helper class to access protected emit method
class TestEmitter extends Eventail {
  public emit(type: string | number, ...args: unknown[]): boolean {
    return super.emit(type, ...args);
  }
}

// ============================================================================
// Performance and Stress Tests
// ============================================================================

test("should handle large number of listeners efficiently", () => {
  const emitter = new TestEmitter();
  const numListeners = 10000;
  let callCount = 0;

  // Add many listeners with different contexts to avoid duplicates
  for (let i = 0; i < numListeners; i++) {
    emitter.on(
      "test",
      () => {
        callCount++;
      },
      { id: i },
    );
  }

  const startTime = Date.now();
  emitter.emit("test");
  const duration = Date.now() - startTime;

  assert.is(callCount, numListeners);
  const requiredDuration = 50;
  assert.ok(
    duration < requiredDuration,
    `Duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Large number of listeners test completed in ${duration}ms`);
});

test("should handle many different events efficiently", () => {
  const emitter = new TestEmitter();
  const numEvents = 10000;
  let totalCalls = 0;

  // Add listeners to many different events
  for (let i = 0; i < numEvents; i++) {
    emitter.on(`event${i}`, () => totalCalls++);
  }

  const startTime = Date.now();
  for (let i = 0; i < numEvents; i++) {
    emitter.emit(`event${i}`);
  }
  const duration = Date.now() - startTime;

  assert.is(totalCalls, numEvents);
  const requiredDuration = 100;
  assert.ok(
    duration < requiredDuration,
    `Duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Many different events test completed in ${duration}ms`);
});

test("should handle priority insertion performance", () => {
  const emitter = new TestEmitter();
  const numListeners = 10000;

  const startTime = Date.now();

  // Add listeners in random priority order to test binary search performance
  for (let i = 0; i < numListeners; i++) {
    const priority = Math.floor(Math.random() * 1000);
    emitter.on("test", () => {}, { id: i }, priority);
  }

  const duration = Date.now() - startTime;

  const requiredDuration = 100;
  assert.ok(
    duration < requiredDuration,
    `Duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Priority insertion test completed in ${duration}ms`);
});

test("should handle mixed operations performance", () => {
  const emitter = new TestEmitter();
  const numOperations = 10000;
  let callCount = 0;

  const startTime = Date.now();

  for (let i = 0; i < numOperations; i++) {
    const callback = () => callCount++;
    const context = { id: i };

    // Add listener
    emitter.on("test", callback, context);

    // Emit occasionally
    if (i % 10 === 0) {
      emitter.emit("test");
    }

    // Remove some listeners
    if (i % 20 === 0 && i > 0) {
      emitter.off("test", () => {}, { id: i - 10 });
    }
  }

  const duration = Date.now() - startTime;

  // Should complete reasonably fast
  const requiredDuration = 200;
  assert.ok(
    duration < requiredDuration,
    `Duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  assert.ok(callCount > 0);
  console.log(`Mixed operations test completed in ${duration}ms`);
});

test("should handle high-frequency emissions", () => {
  const emitter = new TestEmitter();
  const numEmissions = 10000;
  let callCount = 0;

  emitter.on("test", () => callCount++);

  const startTime = Date.now();
  for (let i = 0; i < numEmissions; i++) {
    emitter.emit("test");
  }
  const duration = Date.now() - startTime;

  assert.is(callCount, numEmissions);
  const requiredDuration = 100;
  assert.ok(
    duration < requiredDuration,
    `Duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`High-frequency emissions test completed in ${duration}ms`);
});

test("should handle memory efficiency with large arguments", () => {
  const emitter = new TestEmitter();
  let receivedSize = 0;

  emitter.on("test", (...args: any[]) => {
    receivedSize = args.length;
  });

  const largeArgs = Array.from({ length: 10000 }, (_, i) => i);

  const startTime = Date.now();
  emitter.emit("test", ...largeArgs);
  const duration = Date.now() - startTime;

  assert.is(receivedSize, 10000);
  // Should handle large arguments efficiently
  const requiredDuration = 50;
  assert.ok(
    duration < requiredDuration,
    `Duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Memory efficiency test completed in ${duration}ms`);
});

test("should handle once listeners performance", () => {
  const emitter = new TestEmitter();
  const numListeners = 10000;
  let callCount = 0;

  // Add many once listeners
  const startTime = Date.now();
  for (let i = 0; i < numListeners; i++) {
    emitter.once("test", () => callCount++, { id: i });
  }
  const addDuration = Date.now() - startTime;

  // Emit and measure cleanup performance
  const emitStartTime = Date.now();
  emitter.emit("test");
  const emitDuration = Date.now() - emitStartTime;

  assert.is(callCount, numListeners);
  assert.ok(
    addDuration < 100,
    `Add duration: ${addDuration}ms, but expected less than 100ms`,
  );
  assert.ok(
    emitDuration < 100,
    `Emit duration: ${emitDuration}ms, but expected less than 100ms`,
  );

  // Second emission should be fast (no listeners)
  const secondEmitStart = Date.now();
  const result = emitter.emit("test");
  const secondEmitDuration = Date.now() - secondEmitStart;

  assert.is(result, false);
  assert.ok(
    secondEmitDuration < 10,
    `Second emit duration: ${secondEmitDuration}ms, but expected less than 10ms`,
  );
  console.log(
    `Once listeners performance test completed in ${emitDuration}ms, No listeners performance test completed in ${secondEmitDuration}ms`,
  );
});

test("should handle priority ordering performance", () => {
  const emitter = new TestEmitter();
  const numListeners = 10000;
  const executionOrder: number[] = [];

  // Add listeners with random priorities
  const priorities: number[] = [];
  for (let i = 0; i < numListeners; i++) {
    const priority = Math.floor(Math.random() * 1000);
    priorities.push(priority);
    emitter.on(
      "test",
      () => executionOrder.push(priority),
      { id: i },
      priority,
    );
  }

  const startTime = Date.now();
  emitter.emit("test");
  const duration = Date.now() - startTime;

  // Verify correct ordering
  const sortedPriorities = [...priorities].sort((a, b) => a - b);
  assert.equal(executionOrder, sortedPriorities);
  const requiredDuration = 100;
  assert.ok(
    duration < requiredDuration,
    `Priority ordering duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Priority ordering performance test completed in ${duration}ms`);
});

test("should handle context lookup performance", () => {
  const emitter = new TestEmitter();
  const numContexts = 10000;
  const contexts: Array<{ id: number }> = [];
  const callbacks: Array<() => void> = [];

  // Create many contexts and callbacks
  for (let i = 0; i < numContexts; i++) {
    contexts.push({ id: i });
    callbacks.push(() => {});
    emitter.on("test", callbacks[i], contexts[i]);
  }

  // Test lookup performance
  const startTime = Date.now();
  for (let i = 0; i < numContexts; i++) {
    emitter.off("test", callbacks[i], contexts[i]);
  }
  const duration = Date.now() - startTime;

  const requiredDuration = 100;
  assert.ok(
    duration < requiredDuration,
    `Context lookup duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Context lookup performance test completed in ${duration}ms`);

  // Verify all removed
  const result = emitter.emit("test");
  assert.is(result, false);
});

test("should handle context lookup performance with random priority", () => {
  const emitter = new TestEmitter();
  const numContexts = 10000;
  const contexts: Array<{ id: number }> = [];
  const callbacks: Array<() => void> = [];

  // Create many contexts and callbacks
  for (let i = 0; i < numContexts; i++) {
    contexts.push({ id: i });
    callbacks.push(() => {});
    emitter.on(
      "test",
      callbacks[i],
      contexts[i],
      Math.floor(Math.random() * 10),
    );
  }

  // Test lookup performance
  const startTime = Date.now();
  for (let i = 0; i < numContexts; i++) {
    emitter.off("test", callbacks[i], contexts[i]);
  }
  const duration = Date.now() - startTime;

  const requiredDuration = 100;
  assert.ok(
    duration < requiredDuration,
    `Context lookup with random priority duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(
    `Context lookup with random priority performance test completed in ${duration}ms`,
  );

  // Verify all removed
  const result = emitter.emit("test");
  assert.is(result, false);
});

test("should handle stress test with all operations", () => {
  const emitter = new TestEmitter();
  const numCycles = 10000;
  let totalCallCount = 0;

  const startTime = Date.now();

  for (let cycle = 0; cycle < numCycles; cycle++) {
    const callbacks: Array<() => void> = [];
    const contexts: Array<{ id: number }> = [];

    // Add listeners
    for (let i = 0; i < 10; i++) {
      const callback = () => totalCallCount++;
      const context = { id: cycle * 10 + i };
      callbacks.push(callback);
      contexts.push(context);

      if (i % 2 === 0) {
        emitter.on("test", callback, context, i);
      } else {
        emitter.once("test", callback, context, i);
      }
    }

    // Emit multiple times
    for (let emit = 0; emit < 3; emit++) {
      emitter.emit("test");
    }

    // Remove remaining listeners
    for (let i = 0; i < callbacks.length; i += 2) {
      emitter.off("test", callbacks[i], contexts[i]);
    }
  }

  const duration = Date.now() - startTime;

  assert.ok(totalCallCount > 0);
  const requiredDuration = 1000;
  assert.ok(
    duration < requiredDuration,
    `Stress test duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Stress test performance test completed in ${duration}ms`);
});

test("should handle memory cleanup performance", () => {
  const emitter = new TestEmitter();
  const numCycles = 10000;

  const startTime = Date.now();

  for (let i = 0; i < numCycles; i++) {
    const callback = () => {};
    const context = { id: i };

    emitter.on("test", callback, context);
    emitter.emit("test");
    emitter.off("test", callback, context);
  }

  const duration = Date.now() - startTime;

  // Should handle rapid add/emit/remove cycles efficiently
  const requiredDuration = 200;
  assert.ok(
    duration < requiredDuration,
    `Memory cleanup duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(`Memory cleanup performance test completed in ${duration}ms`);

  // Should have no listeners remaining
  const result = emitter.emit("test");
  assert.is(result, false);
});

test("should handle concurrent-like operations performance", () => {
  const emitter = new TestEmitter();
  const numOperations = 10000;
  let callCount = 0;

  // Simulate concurrent-like operations by interleaving them
  const callbacks: Array<() => void> = [];
  const contexts: Array<{ id: number }> = [];

  const startTime = Date.now();

  for (let i = 0; i < numOperations; i++) {
    const callback = () => callCount++;
    const context = { id: i };
    callbacks.push(callback);
    contexts.push(context);

    // Add listener
    emitter.on("test", callback, context);

    // Occasionally emit and modify listeners during "emission"
    if (i % 100 === 0) {
      emitter.on("test", () => {
        // Add more listeners during emission
        emitter.on("test", () => callCount++, { tempId: Date.now() });
      });
      emitter.emit("test");
    }
  }

  const duration = Date.now() - startTime;

  assert.ok(callCount > 0);
  const requiredDuration = 300;
  assert.ok(
    duration < requiredDuration,
    `Concurrent operations duration: ${duration}ms, but expected less than ${requiredDuration}ms`,
  );
  console.log(
    `Concurrent operations performance test completed in ${duration}ms`,
  );
});

test.run();
