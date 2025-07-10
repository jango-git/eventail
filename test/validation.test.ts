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
// Validation and Duplicate Detection Tests
// ============================================================================

test("should throw error for duplicate listeners", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = {};

  emitter.on("test", callback, context);

  assert.throws(() => {
    emitter.on("test", callback, context);
  }, /Event listener already exists/);
});

test("should throw error for duplicate listeners with undefined context", () => {
  const emitter = new TestEmitter();
  const callback = () => {};

  emitter.on("test", callback);

  assert.throws(() => {
    emitter.on("test", callback);
  }, /Event listener already exists/);
});

test("should throw error for duplicate once listeners", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = {};

  emitter.once("test", callback, context);

  assert.throws(() => {
    emitter.once("test", callback, context);
  }, /Event listener already exists/);
});

test("should throw error for duplicate mixed on/once listeners", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = {};

  emitter.on("test", callback, context);

  assert.throws(() => {
    emitter.once("test", callback, context);
  }, /Event listener already exists/);
});

test("should allow same callback with different contexts", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context1 = { id: 1 };
  const context2 = { id: 2 };

  assert.not.throws(() => {
    emitter.on("test", callback, context1);
    emitter.on("test", callback, context2);
  });
});

test("should allow same callback with and without context", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  assert.not.throws(() => {
    emitter.on("test", callback);
    emitter.on("test", callback, context);
  });
});

test("should allow different callbacks with same context", () => {
  const emitter = new TestEmitter();
  const callback1 = () => {};
  const callback2 = () => {};
  const context = { id: 1 };

  assert.not.throws(() => {
    emitter.on("test", callback1, context);
    emitter.on("test", callback2, context);
  });
});

test("should allow different callbacks without context", () => {
  const emitter = new TestEmitter();
  const callback1 = () => {};
  const callback2 = () => {};

  assert.not.throws(() => {
    emitter.on("test", callback1);
    emitter.on("test", callback2);
  });
});

test("should treat object references as different contexts", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context1 = { id: 1 };
  const context2 = { id: 1 }; // Same content, different reference

  assert.not.throws(() => {
    emitter.on("test", callback, context1);
    emitter.on("test", callback, context2);
  });
});

test("should treat function references as different callbacks", () => {
  const emitter = new TestEmitter();
  const context = { id: 1 };

  // Same implementation, different function references
  const callback1 = () => "same";
  const callback2 = () => "same";

  assert.not.throws(() => {
    emitter.on("test", callback1, context);
    emitter.on("test", callback2, context);
  });
});

test("should allow re-adding listener after removal", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  emitter.on("test", callback, context);
  emitter.off("test", callback, context);

  assert.not.throws(() => {
    emitter.on("test", callback, context);
  });
});

test("should allow re-adding once listener after execution", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  emitter.once("test", callback, context);
  emitter.emit("test");

  assert.not.throws(() => {
    emitter.once("test", callback, context);
  });
});

test("should handle validation with complex contexts", () => {
  const emitter = new TestEmitter();
  const callback = () => {};

  const complexContext = {
    nested: { value: "test" },
    method: function () {
      return this.nested.value;
    },
  };

  emitter.on("test", callback, complexContext);

  assert.throws(() => {
    emitter.on("test", callback, complexContext);
  }, /Event listener already exists/);
});

test("should handle validation with symbol contexts", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const symbolContext = Symbol("test");

  emitter.on("test", callback, symbolContext);

  assert.throws(() => {
    emitter.on("test", callback, symbolContext);
  }, /Event listener already exists/);
});

test("should handle validation with circular reference contexts", () => {
  const emitter = new TestEmitter();
  const callback = () => {};

  const circularContext: any = { name: "circular" };
  circularContext.self = circularContext;

  emitter.on("test", callback, circularContext);

  assert.throws(() => {
    emitter.on("test", callback, circularContext);
  }, /Event listener already exists/);
});

test("should handle validation across different event types", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  // Same callback and context but different event types should be allowed
  assert.not.throws(() => {
    emitter.on("event1", callback, context);
    emitter.on("event2", callback, context);
  });
});

test("should handle validation with different priorities", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  emitter.on("test", callback, context, 10);

  // Same callback and context with different priority should still be duplicate
  assert.throws(() => {
    emitter.on("test", callback, context, 20);
  }, /Event listener already exists/);
});

test("should handle validation with priority and once combination", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  emitter.on("test", callback, context, 10);

  // Same callback and context with once should still be duplicate
  assert.throws(() => {
    emitter.once("test", callback, context, 20);
  }, /Event listener already exists/);
});

test("should handle validation during concurrent operations", () => {
  const emitter = new TestEmitter();
  const callback = () => {};
  const context = { id: 1 };

  emitter.on("test", callback, context);

  // Trying to add duplicate while emitting should still throw
  emitter.on("test", () => {
    assert.throws(() => {
      emitter.on("test", callback, context);
    }, /Event listener already exists/);
  });

  emitter.emit("test");
});

test("should distinguish between undefined contexts", () => {
  const emitter = new TestEmitter();
  const callback1 = () => {};
  const callback2 = () => {};
  const callback3 = () => {};

  assert.not.throws(() => {
    emitter.on("test", callback1, undefined);
    emitter.on("test", callback2); // Same as undefined but different callback
    emitter.on("test", callback3, {}); // Different context object
  });
});

test("should handle validation with bound functions", () => {
  const emitter = new TestEmitter();
  const obj = { method: function () {} };
  const context = { id: 1 };

  const boundMethod = obj.method.bind(obj);

  emitter.on("test", boundMethod, context);

  assert.throws(() => {
    emitter.on("test", boundMethod, context);
  }, /Event listener already exists/);
});

test("should handle validation with arrow functions", () => {
  const emitter = new TestEmitter();
  const context = { id: 1 };

  const arrowFunction = () => {};

  emitter.on("test", arrowFunction, context);

  assert.throws(() => {
    emitter.on("test", arrowFunction, context);
  }, /Event listener already exists/);
});

test("should handle validation stress test", () => {
  const emitter = new TestEmitter();
  const callbacks: Array<() => void> = [];
  const contexts: Array<{ id: number }> = [];

  // Create unique callbacks and contexts
  for (let i = 0; i < 100; i++) {
    callbacks.push(() => i);
    contexts.push({ id: i });
  }

  // Add all unique combinations
  for (let i = 0; i < callbacks.length; i++) {
    emitter.on("test", callbacks[i], contexts[i]);
  }

  // Try to add duplicates - all should throw
  for (let i = 0; i < callbacks.length; i++) {
    assert.throws(() => {
      emitter.on("test", callbacks[i], contexts[i]);
    }, /Event listener already exists/);
  }
});

test.run();
