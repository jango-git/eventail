import { test } from "uvu";
import * as assert from "uvu/assert";
import { Eventail } from "../dist/index.js";

// Helper class to access protected emit method
class TestEmitter extends Eventail {
  triggerEvent(type, ...args) {
    return this.emit(type, ...args);
  }
}

// Test error handling with invalid arguments
test("should handle invalid event types gracefully", () => {
  const emitter = new TestEmitter();
  const callback1 = () => {};
  const callback2 = () => {};

  // Test with empty string
  assert.not.throws(() => {
    emitter.on("", callback1);
    emitter.triggerEvent("");
  });

  // Test with numeric-like strings
  assert.not.throws(() => {
    emitter.on("123", callback2);
    emitter.triggerEvent("123");
  });
});

// Test performance with many listeners
test("should handle large number of listeners efficiently", () => {
  const emitter = new TestEmitter();
  const numListeners = 1000;
  let callCount = 0;

  // Add many listeners
  for (let i = 0; i < numListeners; i++) {
    emitter.on(
      "test",
      () => {
        callCount++;
      },
      { id: i },
    ); // Different context for each
  }

  emitter.triggerEvent("test");
  assert.is(callCount, numListeners);
});

// Test priority edge cases
test("should handle extreme priority values", () => {
  const emitter = new TestEmitter();
  const executionOrder = [];

  emitter.on(
    "test",
    () => executionOrder.push("max"),
    undefined,
    Number.MAX_SAFE_INTEGER,
  );
  emitter.on(
    "test",
    () => executionOrder.push("min"),
    undefined,
    Number.MIN_SAFE_INTEGER,
  );
  emitter.on("test", () => executionOrder.push("zero"), undefined, 0);
  emitter.on("test", () => executionOrder.push("negative"), undefined, -100);

  emitter.triggerEvent("test");

  assert.equal(executionOrder, ["min", "negative", "zero", "max"]);
});

// Test with complex context objects
test("should handle complex context objects", () => {
  const emitter = new TestEmitter();
  const results = [];

  const context1 = {
    nested: { value: "test1" },
    method: function () {
      return this.nested.value;
    },
  };
  const context2 = {
    nested: { value: "test2" },
    method: function () {
      return this.nested.value;
    },
  };

  emitter.on(
    "test",
    function () {
      results.push(this.method());
    },
    context1,
  );

  emitter.on(
    "test",
    function () {
      results.push(this.method());
    },
    context2,
  );

  emitter.triggerEvent("test");

  assert.equal(results, ["test1", "test2"]);
});

// Test listener removal during execution
test("should handle listener removal during event emission", () => {
  const emitter = new TestEmitter();
  const results = [];
  let callback2;

  const callback1 = () => {
    results.push("callback1");
    emitter.off("test", callback2);
  };

  callback2 = () => {
    results.push("callback2");
  };

  const callback3 = () => {
    results.push("callback3");
  };

  emitter.on("test", callback1, undefined, 10);
  emitter.on("test", callback2, undefined, 20);
  emitter.on("test", callback3, undefined, 30);

  emitter.triggerEvent("test");

  // callback1 should execute and remove callback2
  // callback2 might or might not execute depending on implementation
  // callback3 should execute
  assert.ok(results.includes("callback1"));
  assert.ok(results.includes("callback3"));
});

// Test with arrow functions vs regular functions
test("should handle both arrow and regular functions", () => {
  const emitter = new TestEmitter();
  const context = { value: "test" };
  const results = [];

  // Arrow function (context binding won't work)
  emitter.on(
    "test",
    () => {
      results.push("arrow");
    },
    context,
  );

  // Regular function (context binding will work)
  emitter.on(
    "test",
    function () {
      results.push(this ? this.value : "no-context");
    },
    context,
  );

  emitter.triggerEvent("test");

  assert.equal(results, ["arrow", "test"]);
});

// Test priority with floating point numbers
test("should handle floating point priorities", () => {
  const emitter = new TestEmitter();
  const executionOrder = [];

  emitter.on("test", () => executionOrder.push("1.5"), undefined, 1.5);
  emitter.on("test", () => executionOrder.push("1.1"), undefined, 1.1);
  emitter.on("test", () => executionOrder.push("1.9"), undefined, 1.9);

  emitter.triggerEvent("test");

  assert.equal(executionOrder, ["1.1", "1.5", "1.9"]);
});

// Test with null and undefined values as event data
test("should handle null and undefined event data", () => {
  const emitter = new TestEmitter();
  const results = [];

  emitter.on("test", (data) => {
    results.push(data);
  });

  emitter.triggerEvent("test", null);
  emitter.triggerEvent("test", undefined);
  emitter.triggerEvent("test", 0);
  emitter.triggerEvent("test", false);
  emitter.triggerEvent("test", "");

  assert.equal(results, [null, undefined, 0, false, ""]);
});

// Test once listeners with context removal
test("should properly clean up once listeners with context", () => {
  const emitter = new TestEmitter();
  const context = { id: "test" };
  let callCount = 0;

  const callback = () => {
    callCount++;
  };

  emitter.once("test", callback, context);

  // First call should work
  emitter.triggerEvent("test");
  assert.is(callCount, 1);

  // Should be able to add the same callback with same context again
  assert.not.throws(() => {
    emitter.once("test", callback, context);
  });

  emitter.triggerEvent("test");
  assert.is(callCount, 2);
});

// Test mixed once and regular listeners with same callback
test("should handle mixed once and regular listeners with same callback", () => {
  const emitter = new TestEmitter();
  const results = [];
  const callback = () => results.push("called");

  emitter.on("test", callback, { type: "regular" });
  emitter.once("test", callback, { type: "once" });

  emitter.triggerEvent("test");
  assert.is(results.length, 2);

  results.length = 0;
  emitter.triggerEvent("test");
  assert.is(results.length, 1); // Only regular listener should remain
});

// Test event emission with many arguments
test("should handle events with many arguments", () => {
  const emitter = new TestEmitter();
  let receivedArgs = [];

  emitter.on("test", (...args) => {
    receivedArgs = args;
  });

  const testArgs = [
    1,
    "two",
    { three: 3 },
    [4, 5],
    null,
    undefined,
    true,
    false,
  ];
  emitter.triggerEvent("test", ...testArgs);

  assert.equal(receivedArgs, testArgs);
});

// Test listener addition during event emission
test("should handle listener addition during event emission", () => {
  const emitter = new TestEmitter();
  const results = [];

  emitter.on("test", () => {
    results.push("existing");
    emitter.on(
      "test",
      () => {
        results.push("added-during");
      },
      { unique: Date.now() },
    ); // Unique context to avoid duplicate error
  });

  emitter.triggerEvent("test");
  // The newly added listener should NOT be executed in the current emission
  assert.equal(results, ["existing"]);

  // Second emission should include both listeners
  results.length = 0;
  emitter.triggerEvent("test");
  assert.equal(results, ["existing", "added-during"]);
});

test.run();
