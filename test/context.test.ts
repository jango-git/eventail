import { test } from "uvu";
import * as assert from "uvu/assert";
import { Eventail } from "../src/Eventail.js";

// Helper class to access protected emit method
class TestEmitter extends Eventail {
  public emit(type: string, ...args: unknown[]): boolean {
    return super.emit(type, ...args);
  }
}

// ============================================================================
// Context Handling Tests
// ============================================================================

test("should bind simple context correctly", () => {
  const emitter = new TestEmitter();
  const context = { value: "test-context" };
  let receivedContext: any = null;

  emitter.on(
    "test",
    function (this: typeof context) {
      receivedContext = this;
    },
    context,
  );

  emitter.emit("test");

  assert.is(receivedContext, context);
});

test("should handle undefined context", () => {
  const emitter = new TestEmitter();
  let receivedContext: any = null;

  emitter.on(
    "test",
    function (this: any) {
      receivedContext = this;
    },
    undefined,
  );

  emitter.emit("test");

  // In non-strict mode, undefined context becomes global object
  assert.is(typeof receivedContext, "object");
  assert.ok(receivedContext !== null);
});

test("should handle complex nested context objects", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

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
    function (this: typeof context1) {
      results.push(this.method());
    },
    context1,
  );

  emitter.on(
    "test",
    function (this: typeof context2) {
      results.push(this.method());
    },
    context2,
  );

  emitter.emit("test");

  assert.equal(results, ["test1", "test2"]);
});

test("should handle symbols as contexts", () => {
  const emitter = new TestEmitter();
  const symbol1 = Symbol("context1");
  const symbol2 = Symbol("context2");
  const results: string[] = [];

  emitter.on(
    "test",
    function (this: Symbol) {
      results.push(this.toString());
    },
    symbol1,
  );

  emitter.on(
    "test",
    function (this: Symbol) {
      results.push(this.toString());
    },
    symbol2,
  );

  emitter.emit("test");

  assert.is(results.length, 2);
  assert.ok(results[0].includes("Symbol(context1)"));
  assert.ok(results[1].includes("Symbol(context2)"));
});

test("should handle same callback with different contexts", () => {
  const emitter = new TestEmitter();
  const context1 = { id: 1 };
  const context2 = { id: 2 };
  const results: number[] = [];

  const callback = function (this: { id: number }) {
    results.push(this.id);
  };

  emitter.on("test", callback, context1);
  emitter.on("test", callback, context2);

  emitter.emit("test");

  assert.equal(results, [1, 2]);
});

test("should handle different callbacks with same context", () => {
  const emitter = new TestEmitter();
  const context = { value: "shared" };
  const results: string[] = [];

  const callback1 = function (this: typeof context) {
    results.push(`callback1-${this.value}`);
  };

  const callback2 = function (this: typeof context) {
    results.push(`callback2-${this.value}`);
  };

  emitter.on("test", callback1, context);
  emitter.on("test", callback2, context);

  emitter.emit("test");

  assert.equal(results, ["callback1-shared", "callback2-shared"]);
});

test("should handle arrow functions with context (context binding won't work)", () => {
  const emitter = new TestEmitter();
  const context = { value: "test" };
  const results: string[] = [];

  // Arrow function - context binding won't work
  emitter.on(
    "test",
    () => {
      results.push("arrow");
    },
    context,
  );

  // Regular function - context binding will work
  emitter.on(
    "test",
    function (this: typeof context) {
      results.push(this ? this.value : "no-context");
    },
    context,
  );

  emitter.emit("test");

  assert.equal(results, ["arrow", "test"]);
});

test("should remove listeners with specific context", () => {
  const emitter = new TestEmitter();
  const context1 = { id: 1 };
  const context2 = { id: 2 };
  const results: number[] = [];

  const callback = function (this: { id: number }) {
    results.push(this.id);
  };

  emitter.on("test", callback, context1);
  emitter.on("test", callback, context2);

  emitter.emit("test");
  assert.equal(results, [1, 2]);

  results.length = 0;
  emitter.off("test", callback, context1);
  emitter.emit("test");
  assert.equal(results, [2]);
});

test("should handle object references as different contexts", () => {
  const emitter = new TestEmitter();
  const callback = () => {};

  const context1 = { id: 1 };
  const context2 = { id: 1 }; // Same content, different reference

  emitter.on("test", callback, context1);
  emitter.on("test", callback, context2);

  // Both should be registered as different listeners
  emitter.off("test", callback, context1);
  const result = emitter.emit("test");
  assert.is(result, true); // context2 listener should remain
});

test("should handle context with circular references", () => {
  const emitter = new TestEmitter();
  let receivedContext: any = null;

  const circularContext: any = { name: "circular" };
  circularContext.self = circularContext;

  emitter.on(
    "test",
    function (this: any) {
      receivedContext = this;
    },
    circularContext,
  );

  assert.not.throws(() => {
    emitter.emit("test");
  });

  assert.is(receivedContext, circularContext);
  assert.is(receivedContext.self, circularContext);
});

test("should handle context with methods that reference each other", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  const context = {
    value: "test",
    getValue: function () {
      return this.value;
    },
    getFormattedValue: function () {
      return `formatted-${this.getValue()}`;
    },
  };

  emitter.on(
    "test",
    function (this: typeof context) {
      results.push(this.getFormattedValue());
    },
    context,
  );

  emitter.emit("test");

  assert.equal(results, ["formatted-test"]);
});

test("should handle context with getters and setters", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  const context = {
    _value: "initial",
    get value() {
      return this._value;
    },
    set value(val: string) {
      this._value = val;
    },
  };

  emitter.on(
    "test",
    function (this: typeof context) {
      results.push(this.value);
      this.value = "changed";
      results.push(this.value);
    },
    context,
  );

  emitter.emit("test");

  assert.equal(results, ["initial", "changed"]);
});

test("should handle context with prototype methods", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  class TestClass {
    public value: string;

    constructor(value: string) {
      this.value = value;
    }

    getValue() {
      return this.value;
    }
  }

  const context = new TestClass("test-class");

  emitter.on(
    "test",
    function (this: TestClass) {
      results.push(this.getValue());
    },
    context,
  );

  emitter.emit("test");

  assert.equal(results, ["test-class"]);
});

test("should handle context cleanup when listeners are removed", () => {
  const emitter = new TestEmitter();
  const context = { id: "test" };
  const callback = () => {};

  emitter.on("test", callback, context);
  emitter.off("test", callback, context);

  // Should be able to add the same callback with same context again
  assert.not.throws(() => {
    emitter.on("test", callback, context);
  });
});

test.run();
