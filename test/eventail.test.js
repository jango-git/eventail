import { test } from "uvu";
import * as assert from "uvu/assert";
import { Eventail } from "../dist/index.js";

// Test basic event listener functionality
test("should add and trigger event listeners", () => {
  const emitter = new Eventail();
  let called = false;
  let receivedData = null;

  emitter.on("test", (data) => {
    called = true;
    receivedData = data;
  });

  // Access protected emit method through a subclass
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const testEmitter = new TestEmitter();
  testEmitter.on("test", (data) => {
    called = true;
    receivedData = data;
  });

  const result = testEmitter.triggerEvent("test", "hello");

  assert.is(result, true);
  assert.is(called, true);
  assert.is(receivedData, "hello");
});

// Test method chaining
test("should support method chaining", () => {
  const emitter = new Eventail();
  const callback1 = () => {};
  const callback2 = () => {};

  const result = emitter
    .on("test1", callback1)
    .on("test2", callback2)
    .off("test1", callback1);

  assert.instance(result, Eventail);
});

// Test multiple arguments in emit
test("should pass multiple arguments to listeners", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  let receivedArgs = [];

  emitter.on("test", (...args) => {
    receivedArgs = args;
  });

  emitter.triggerEvent("test", "arg1", "arg2", "arg3");

  assert.equal(receivedArgs, ["arg1", "arg2", "arg3"]);
});

// Test priority ordering
test("should execute listeners in priority order (lower priority = higher precedence)", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const executionOrder = [];

  emitter.on("test", () => executionOrder.push("normal"), undefined, 100);
  emitter.on("test", () => executionOrder.push("high"), undefined, 50);
  emitter.on("test", () => executionOrder.push("low"), undefined, 150);
  emitter.on("test", () => executionOrder.push("highest"), undefined, 10);

  emitter.triggerEvent("test");

  assert.equal(executionOrder, ["highest", "high", "normal", "low"]);
});

// Test context binding
test("should bind context correctly", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const context = { value: "test-context" };
  let receivedContext = null;

  emitter.on(
    "test",
    function () {
      receivedContext = this;
    },
    context,
  );

  emitter.triggerEvent("test");

  assert.is(receivedContext, context);
});

// Test once listeners
test("should remove once listeners after first execution", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  let callCount = 0;

  emitter.once("test", () => {
    callCount++;
  });

  emitter.triggerEvent("test");
  emitter.triggerEvent("test");
  emitter.triggerEvent("test");

  assert.is(callCount, 1);
});

// Test once with priority
test("should handle once listeners with priority correctly", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const executionOrder = [];

  emitter.on("test", () => executionOrder.push("regular"), undefined, 100);
  emitter.once("test", () => executionOrder.push("once-high"), undefined, 50);
  emitter.once("test", () => executionOrder.push("once-low"), undefined, 150);

  emitter.triggerEvent("test");
  emitter.triggerEvent("test");

  assert.equal(executionOrder, ["once-high", "regular", "once-low", "regular"]);
});

// Test removing specific listeners
test("should remove specific listener with off", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  let calls = [];

  const callback1 = () => calls.push("callback1");
  const callback2 = () => calls.push("callback2");

  emitter.on("test", callback1);
  emitter.on("test", callback2);

  emitter.triggerEvent("test");
  assert.equal(calls, ["callback1", "callback2"]);

  calls = [];
  emitter.off("test", callback1);
  emitter.triggerEvent("test");
  assert.equal(calls, ["callback2"]);
});

// Test removing listeners with context
test("should remove listeners with specific context", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const context1 = { id: 1 };
  const context2 = { id: 2 };
  let calls = [];

  const callback = function () {
    calls.push(this.id);
  };

  emitter.on("test", callback, context1);
  emitter.on("test", callback, context2);

  emitter.triggerEvent("test");
  assert.equal(calls, [1, 2]);

  calls = [];
  emitter.off("test", callback, context1);
  emitter.triggerEvent("test");
  assert.equal(calls, [2]);
});

// Test removing all listeners for an event
test("should remove all listeners when no callback specified", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  let called = false;

  emitter.on("test", () => {
    called = true;
  });
  emitter.on("test", () => {
    called = true;
  });

  emitter.off("test");
  const result = emitter.triggerEvent("test");

  assert.is(result, false);
  assert.is(called, false);
});

// Test emit returns false for non-existent events
test("should return false when emitting non-existent event", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const result = emitter.triggerEvent("nonexistent");

  assert.is(result, false);
});

// Test duplicate listener detection
test("should throw error for duplicate listeners", () => {
  const emitter = new Eventail();
  const callback = () => {};
  const context = {};

  emitter.on("test", callback, context);

  assert.throws(() => {
    emitter.on("test", callback, context);
  }, /Event listener already exists/);
});

// Test duplicate listener with different contexts is allowed
test("should allow same callback with different contexts", () => {
  const emitter = new Eventail();
  const callback = () => {};
  const context1 = { id: 1 };
  const context2 = { id: 2 };

  assert.not.throws(() => {
    emitter.on("test", callback, context1);
    emitter.on("test", callback, context2);
  });
});

// Test duplicate listener with undefined context
test("should detect duplicate listeners with undefined context", () => {
  const emitter = new Eventail();
  const callback = () => {};

  emitter.on("test", callback);

  assert.throws(() => {
    emitter.on("test", callback);
  }, /Event listener already exists/);
});

// Test default priority value
test("should use default priority when not specified", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const executionOrder = [];

  emitter.on("test", () => executionOrder.push("default"));
  emitter.on("test", () => executionOrder.push("high"), undefined, 50);
  emitter.on("test", () => executionOrder.push("low"), undefined, 150);

  emitter.triggerEvent("test");

  assert.equal(executionOrder, ["high", "default", "low"]);
});

// Test complex scenario with mixed listeners
test("should handle complex scenario with mixed listener types", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const results = [];

  // Add various listeners with different priorities and once settings
  emitter.on("test", () => results.push("persistent-low"), undefined, 200);
  emitter.once("test", () => results.push("once-high"), undefined, 50);
  emitter.on("test", () => results.push("persistent-high"), undefined, 60);
  emitter.once("test", () => results.push("once-medium"), undefined, 100);

  // First trigger
  emitter.triggerEvent("test");
  assert.equal(results, [
    "once-high",
    "persistent-high",
    "once-medium",
    "persistent-low",
  ]);

  // Second trigger - once listeners should be gone
  results.length = 0;
  emitter.triggerEvent("test");
  assert.equal(results, ["persistent-high", "persistent-low"]);
});

// Test listener cleanup on removal
test("should clean up internal data structures when removing listeners", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }

    getListenerCount(type) {
      const listeners = this.listeners.get(type);
      return listeners ? listeners.length : 0;
    }
  }

  const emitter = new TestEmitter();
  const callback = () => {};

  emitter.on("test", callback);
  assert.is(emitter.getListenerCount("test"), 1);

  emitter.off("test", callback);
  assert.is(emitter.getListenerCount("test"), 0);
});

// Test edge case: removing from empty listener list
test("should handle removing from non-existent event gracefully", () => {
  const emitter = new Eventail();

  assert.not.throws(() => {
    emitter.off("nonexistent", () => {});
  });
});

// Test edge case: multiple once listeners with same priority
test("should handle multiple once listeners with same priority", () => {
  class TestEmitter extends Eventail {
    triggerEvent(type, ...args) {
      return this.emit(type, ...args);
    }
  }

  const emitter = new TestEmitter();
  const results = [];

  emitter.once("test", () => results.push("once1"), undefined, 100);
  emitter.once("test", () => results.push("once2"), undefined, 100);
  emitter.once("test", () => results.push("once3"), undefined, 100);

  emitter.triggerEvent("test");
  assert.is(results.length, 3);
  assert.ok(results.includes("once1"));
  assert.ok(results.includes("once2"));
  assert.ok(results.includes("once3"));

  // Second trigger should have no listeners
  results.length = 0;
  const result = emitter.triggerEvent("test");
  assert.is(result, false);
  assert.is(results.length, 0);
});

test.run();
