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
// Priority System Tests
// ============================================================================

test("should execute listeners in priority order (lower = higher priority)", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("normal"), undefined, 100);
  emitter.on("test", () => executionOrder.push("high"), undefined, 50);
  emitter.on("test", () => executionOrder.push("low"), undefined, 150);
  emitter.on("test", () => executionOrder.push("highest"), undefined, 10);

  emitter.emit("test");

  assert.equal(executionOrder, ["highest", "high", "normal", "low"]);
});

test("should use default priority when not specified", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("default"));
  emitter.on("test", () => executionOrder.push("high"), undefined, -50);
  emitter.on("test", () => executionOrder.push("low"), undefined, 50);

  emitter.emit("test");

  assert.equal(executionOrder, ["high", "default", "low"]);
});

test("should handle extreme priority values", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

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

  emitter.emit("test");

  assert.equal(executionOrder, ["min", "negative", "zero", "max"]);
});

test("should handle floating point priorities", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("1.5"), undefined, 1.5);
  emitter.on("test", () => executionOrder.push("1.1"), undefined, 1.1);
  emitter.on("test", () => executionOrder.push("1.9"), undefined, 1.9);
  emitter.on("test", () => executionOrder.push("1.0"), undefined, 1.0);

  emitter.emit("test");

  assert.equal(executionOrder, ["1.0", "1.1", "1.5", "1.9"]);
});

test("should handle negative priorities", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("-1"), undefined, -1);
  emitter.on("test", () => executionOrder.push("-10"), undefined, -10);
  emitter.on("test", () => executionOrder.push("-5"), undefined, -5);
  emitter.on("test", () => executionOrder.push("0"), undefined, 0);

  emitter.emit("test");

  assert.equal(executionOrder, ["-10", "-5", "-1", "0"]);
});

test("should handle mixed positive and negative priorities", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("positive"), undefined, 100);
  emitter.on("test", () => executionOrder.push("negative"), undefined, -100);
  emitter.on("test", () => executionOrder.push("zero"), undefined, 0);

  emitter.emit("test");

  assert.equal(executionOrder, ["negative", "zero", "positive"]);
});

test("should maintain undefined execution order for same priority", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  // Add multiple listeners with same priority
  emitter.on("test", () => executionOrder.push("same1"), undefined, 100);
  emitter.on("test", () => executionOrder.push("same2"), undefined, 100);
  emitter.on("test", () => executionOrder.push("same3"), undefined, 100);

  emitter.emit("test");

  // All should be executed, but order is undefined
  assert.is(executionOrder.length, 3);
  assert.ok(executionOrder.includes("same1"));
  assert.ok(executionOrder.includes("same2"));
  assert.ok(executionOrder.includes("same3"));
});

test("should handle priority with once listeners", () => {
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

test("should handle large priority ranges", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  emitter.on("test", () => executionOrder.push("million"), undefined, 1000000);
  emitter.on("test", () => executionOrder.push("zero"), undefined, 0);
  emitter.on(
    "test",
    () => executionOrder.push("negative-million"),
    undefined,
    -1000000,
  );

  emitter.emit("test");

  assert.equal(executionOrder, ["negative-million", "zero", "million"]);
});

test("should handle priority insertion optimization", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  // Test various insertion patterns to verify binary search works
  emitter.on("test", () => executionOrder.push("50"), undefined, 50);
  emitter.on("test", () => executionOrder.push("10"), undefined, 10);
  emitter.on("test", () => executionOrder.push("100"), undefined, 100);
  emitter.on("test", () => executionOrder.push("25"), undefined, 25);
  emitter.on("test", () => executionOrder.push("75"), undefined, 75);

  emitter.emit("test");

  assert.equal(executionOrder, ["10", "25", "50", "75", "100"]);
});

test("should handle priority with multiple event types", () => {
  const emitter = new TestEmitter();
  const results: { event: string; priority: string }[] = [];

  emitter.on(
    "event1",
    () => results.push({ event: "event1", priority: "high" }),
    undefined,
    10,
  );
  emitter.on(
    "event1",
    () => results.push({ event: "event1", priority: "low" }),
    undefined,
    90,
  );
  emitter.on(
    "event2",
    () => results.push({ event: "event2", priority: "high" }),
    undefined,
    10,
  );
  emitter.on(
    "event2",
    () => results.push({ event: "event2", priority: "low" }),
    undefined,
    90,
  );

  emitter.emit("event1");
  emitter.emit("event2");

  assert.equal(results, [
    { event: "event1", priority: "high" },
    { event: "event1", priority: "low" },
    { event: "event2", priority: "high" },
    { event: "event2", priority: "low" },
  ]);
});

test("should maintain priority order after listener removal", () => {
  const emitter = new TestEmitter();
  const executionOrder: string[] = [];

  const callback1 = (): number => executionOrder.push("first");

  const callback2 = (): number => executionOrder.push("second");
  const callback3 = (): number => executionOrder.push("third");

  emitter.on("test", callback1, undefined, 10);
  emitter.on("test", callback2, undefined, 20);
  emitter.on("test", callback3, undefined, 30);

  emitter.off("test", callback2);
  emitter.emit("test");

  assert.equal(executionOrder, ["first", "third"]);
});

test.run();
