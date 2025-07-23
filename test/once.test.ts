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
// Once Listener Tests
// ============================================================================

test("should remove once listeners after first execution", () => {
  const emitter = new TestEmitter();
  let callCount = 0;

  emitter.once("test", () => {
    callCount++;
  });

  emitter.emit("test");
  emitter.emit("test");
  emitter.emit("test");

  assert.is(callCount, 1);
});

test("should handle once listeners with priority", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("regular"), undefined, 100);
  emitter.once("test", () => executionOrder.push("once-high"), undefined, 50);
  emitter.once("test", () => executionOrder.push("once-low"), undefined, 150);

  emitter.emit("test");
  assert.equal(executionOrder, ["once-high", "regular", "once-low"]);

  // Second emission should only have regular listener
  executionOrder.length = 0;
  emitter.emit("test");
  assert.equal(executionOrder, ["regular"]);
});

test("should handle once listeners with context", () => {
  const emitter = new TestEmitter();
  const context = { value: "test" };
  let receivedContext: any = null;
  let callCount = 0;

  emitter.once(
    "test",
    function (this: typeof context) {
      receivedContext = this;
      callCount++;
    },
    context,
  );

  emitter.emit("test");
  emitter.emit("test");

  assert.is(callCount, 1);
  assert.is(receivedContext, context);
});

test("should handle multiple once listeners with same priority", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.once("test", () => results.push("once1"), undefined, 100);
  emitter.once("test", () => results.push("once2"), undefined, 100);
  emitter.once("test", () => results.push("once3"), undefined, 100);

  emitter.emit("test");
  assert.is(results.length, 3);
  assert.ok(results.includes("once1"));
  assert.ok(results.includes("once2"));
  assert.ok(results.includes("once3"));

  // Second emission should have no listeners
  results.length = 0;
  const result = emitter.emit("test");
  assert.is(result, false);
  assert.is(results.length, 0);
});

test("should handle mixed once and regular listeners with same callback", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];
  const callback = (): number => results.push("called");

  emitter.on("test", callback, { type: "regular" });
  emitter.once("test", callback, { type: "once" });

  emitter.emit("test");
  assert.is(results.length, 2);

  results.length = 0;
  emitter.emit("test");
  assert.is(results.length, 1); // Only regular listener should remain
});

test("should clean up once listeners with context properly", () => {
  const emitter = new TestEmitter();
  const context = { id: "test" };
  let callCount = 0;

  const callback = (): number => callCount++;

  emitter.once("test", callback, context);
  emitter.emit("test");
  assert.is(callCount, 1);

  // Should be able to add the same callback with same context again
  assert.not.throws(() => {
    emitter.once("test", callback, context);
  });

  emitter.emit("test");
  assert.is(callCount, 2);
});

test("should handle once listeners with different contexts", () => {
  const emitter = new TestEmitter();
  const context1 = { id: 1 };
  const context2 = { id: 2 };
  const results: number[] = [];

  const callback = function (this: { id: number }): void {
    results.push(this.id);
  };

  emitter.once("test", callback, context1);
  emitter.once("test", callback, context2);

  emitter.emit("test");
  assert.equal(results, [1, 2]);

  results.length = 0;
  emitter.emit("test");
  assert.equal(results, []);
});

test("should handle once listeners with data parameters", () => {
  const emitter = new TestEmitter();
  let receivedData: any[] = [];

  emitter.once("test", (...args: any[]) => {
    receivedData = args;
  });

  emitter.emit("test", "arg1", "arg2", "arg3");
  assert.equal(receivedData, ["arg1", "arg2", "arg3"]);

  receivedData = [];
  emitter.emit("test", "should", "not", "receive");
  assert.equal(receivedData, []);
});

test("should handle once listeners removal before execution", () => {
  const emitter = new TestEmitter();
  let called = false;

  const callback = (): void => {
    called = true;
  };

  emitter.once("test", callback);
  emitter.off("test", callback);
  emitter.emit("test");

  assert.is(called, false);
});

test("should handle once listeners with extreme priorities", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.once(
    "test",
    () => executionOrder.push("max"),
    undefined,
    Number.MAX_SAFE_INTEGER,
  );
  emitter.once(
    "test",
    () => executionOrder.push("min"),
    undefined,
    Number.MIN_SAFE_INTEGER,
  );
  emitter.once("test", () => executionOrder.push("zero"), undefined, 0);

  emitter.emit("test");
  assert.equal(executionOrder, ["min", "zero", "max"]);

  executionOrder.length = 0;
  emitter.emit("test");
  assert.equal(executionOrder, []);
});

test("should handle once listeners with floating point priorities", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.once("test", () => executionOrder.push("1.5"), undefined, 1.5);
  emitter.once("test", () => executionOrder.push("1.1"), undefined, 1.1);
  emitter.once("test", () => executionOrder.push("1.9"), undefined, 1.9);

  emitter.emit("test");
  assert.equal(executionOrder, ["1.1", "1.5", "1.9"]);

  executionOrder.length = 0;
  emitter.emit("test");
  assert.equal(executionOrder, []);
});

test("should handle once listeners in complex scenarios", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  // Add various listeners with different priorities and once settings
  emitter.on("test", () => results.push("persistent-low"), undefined, 200);
  emitter.once("test", () => results.push("once-high"), undefined, 50);
  emitter.on("test", () => results.push("persistent-high"), undefined, 60);
  emitter.once("test", () => results.push("once-medium"), undefined, 100);

  // First emission
  emitter.emit("test");
  assert.equal(results, [
    "once-high",
    "persistent-high",
    "once-medium",
    "persistent-low",
  ]);

  // Second emission - once listeners should be gone
  results.length = 0;
  emitter.emit("test");
  assert.equal(results, ["persistent-high", "persistent-low"]);
});

test("should handle once listeners with method chaining", () => {
  const emitter = new TestEmitter();
  let callCount = 0;

  const result = emitter
    .once("test1", () => callCount++)
    .once("test2", () => callCount++)
    .once("test3", () => callCount++);

  assert.instance(result, TestEmitter);

  emitter.emit("test1");
  emitter.emit("test2");
  emitter.emit("test3");

  assert.is(callCount, 3);

  // Second round should not trigger any listeners
  emitter.emit("test1");
  emitter.emit("test2");
  emitter.emit("test3");

  assert.is(callCount, 3);
});

test("should handle once listeners with undefined and null arguments", () => {
  const emitter = new TestEmitter();
  const receivedArgs: any[] = [];

  emitter.once("test", (...args: any[]) => {
    receivedArgs.push(...args);
  });

  emitter.emit("test", null, undefined, 0, false, "");
  assert.equal(receivedArgs, [null, undefined, 0, false, ""]);

  receivedArgs.length = 0;
  emitter.emit("test", "should", "not", "receive");
  assert.equal(receivedArgs, []);
});

test.run();
