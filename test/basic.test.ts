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
// Basic Functionality Tests
// ============================================================================

test("should add event listeners with on()", () => {
  const emitter = new TestEmitter();
  let called = false;
  let receivedData: string | null = null;

  emitter.on("test", (data: string) => {
    called = true;
    receivedData = data;
  });

  const result = emitter.emit("test", "hello");

  assert.is(result, true);
  assert.is(called, true);
  assert.is(receivedData, "hello");
});

test("should add one-time event listeners with once()", () => {
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

test("should remove event listeners with off()", () => {
  const emitter = new TestEmitter();
  let called = false;

  const callback = () => {
    called = true;
  };

  emitter.on("test", callback);
  emitter.off("test", callback);
  emitter.emit("test");

  assert.is(called, false);
});

test("should remove all listeners for an event when no callback specified", () => {
  const emitter = new TestEmitter();
  let called = false;

  emitter.on("test", () => {
    called = true;
  });
  emitter.on("test", () => {
    called = true;
  });

  emitter.off("test");
  const result = emitter.emit("test");

  assert.is(result, false);
  assert.is(called, false);
});

test("should support method chaining", () => {
  const emitter = new TestEmitter();
  const callback1 = () => {};
  const callback2 = () => {};

  const result = emitter
    .on("test1", callback1)
    .on("test2", callback2)
    .off("test1", callback1);

  assert.instance(result, TestEmitter);
});

test("should return true when event has listeners", () => {
  const emitter = new TestEmitter();

  emitter.on("test", () => {});
  const result = emitter.emit("test");

  assert.is(result, true);
});

test("should return false when event has no listeners", () => {
  const emitter = new TestEmitter();
  const result = emitter.emit("nonexistent");

  assert.is(result, false);
});

test("should handle multiple listeners for same event", () => {
  const emitter = new TestEmitter();
  const calls: string[] = [];

  emitter.on("test", () => calls.push("first"));
  emitter.on("test", () => calls.push("second"));
  emitter.on("test", () => calls.push("third"));

  emitter.emit("test");

  assert.is(calls.length, 3);
  assert.ok(calls.includes("first"));
  assert.ok(calls.includes("second"));
  assert.ok(calls.includes("third"));
});

test("should handle removing non-existent listeners gracefully", () => {
  const emitter = new TestEmitter();
  const callback = () => {};

  // Should not throw when removing non-existent listener
  assert.not.throws(() => {
    emitter.off("nonexistent", callback);
  });

  // Should not throw when removing from empty event
  assert.not.throws(() => {
    emitter.off("test", callback);
  });
});

test("should handle empty event names", () => {
  const emitter = new TestEmitter();
  let called = false;

  emitter.on("", () => {
    called = true;
  });

  emitter.emit("");
  assert.is(called, true);
});

test("should handle numeric-like event names", () => {
  const emitter = new TestEmitter();
  let called = false;

  emitter.on("123", () => {
    called = true;
  });

  emitter.emit("123");
  assert.is(called, true);
});

test("should handle Unicode event names", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("🚀", () => results.push("rocket"));
  emitter.on("测试", () => results.push("chinese"));
  emitter.on("العربية", () => results.push("arabic"));

  emitter.emit("🚀");
  emitter.emit("测试");
  emitter.emit("العربية");

  assert.equal(results, ["rocket", "chinese", "arabic"]);
});

test("should maintain listener order during removal", () => {
  const emitter = new TestEmitter();
  const calls: string[] = [];

  const callback1 = () => calls.push("callback1");
  const callback2 = () => calls.push("callback2");
  const callback3 = () => calls.push("callback3");

  emitter.on("test", callback1);
  emitter.on("test", callback2);
  emitter.on("test", callback3);

  emitter.off("test", callback2);
  emitter.emit("test");

  assert.equal(calls, ["callback1", "callback3"]);
});

test("should clean up internal data structures when all listeners removed", () => {
  const emitter = new TestEmitter();
  const callback = () => {};

  emitter.on("test", callback);
  emitter.off("test", callback);

  // Event should return false after all listeners removed
  const result = emitter.emit("test");
  assert.is(result, false);
});

test("should not remove real listeners when removing with fake callback/context", () => {
  const emitter = new TestEmitter();
  let realCallbackCalled = false;

  const realCallback = () => {
    realCallbackCalled = true;
  };
  const realContext = { id: "real" };

  // Add real listener
  emitter.on("test", realCallback, realContext);

  // Try to remove with fake callback but same context
  const fakeCallback = () => {};
  emitter.off("test", fakeCallback, realContext);

  // Try to remove with same callback but fake context
  const fakeContext = { id: "fake" };
  emitter.off("test", realCallback, fakeContext);

  // Try to remove with both fake callback and context
  emitter.off("test", fakeCallback, fakeContext);

  // Real listener should still exist and work
  emitter.emit("test");
  assert.is(realCallbackCalled, true);

  // Verify listener is still there by checking return value
  realCallbackCalled = false;
  const result = emitter.emit("test");
  assert.is(result, true);
  assert.is(realCallbackCalled, true);
});

test("should handle numeric event types", () => {
  const emitter = new TestEmitter();
  let called = false;
  let receivedData: number | null = null;

  emitter.on(42, (data: number) => {
    called = true;
    receivedData = data;
  });

  const result = emitter.emit(42, 123);

  assert.is(result, true);
  assert.is(called, true);
  assert.is(receivedData, 123);
});

test("should handle mixed string and numeric events", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("string-event", () => results.push("string"));
  emitter.on(100, () => results.push("number"));
  emitter.on(0, () => results.push("zero"));
  emitter.on(-5, () => results.push("negative"));

  emitter.emit("string-event");
  emitter.emit(100);
  emitter.emit(0);
  emitter.emit(-5);

  assert.equal(results, ["string", "number", "zero", "negative"]);
});

test("should remove numeric event listeners correctly", () => {
  const emitter = new TestEmitter();
  let called = false;

  const callback = () => {
    called = true;
  };

  emitter.on(999, callback);
  emitter.off(999, callback);
  emitter.emit(999);

  assert.is(called, false);
});

test.run();
