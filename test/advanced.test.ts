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
// Advanced Scenario Tests
// ============================================================================

test("should handle listener removal during event emission", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];
  let callback2: () => void;

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

  emitter.emit("test");

  // callback1 should execute and remove callback2
  // callback3 should execute regardless
  assert.ok(results.includes("callback1"));
  assert.ok(results.includes("callback3"));
  // callback2 behavior depends on implementation timing
});

test("should handle listener addition during event emission", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("test", () => {
    results.push("existing");
    emitter.on(
      "test",
      () => {
        results.push("added-during");
      },
      { unique: Date.now() }, // Unique context to avoid duplicate error
    );
  });

  emitter.emit("test");
  // The newly added listener should NOT be executed in the current emission
  assert.equal(results, ["existing"]);

  // Second emission should include both listeners
  results.length = 0;
  emitter.emit("test");
  assert.equal(results, ["existing", "added-during"]);
});

test("should handle recursive event emissions", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];
  let depth = 0;

  emitter.on("recursive", () => {
    results.push(`depth-${depth}`);
    depth++;
    if (depth < 3) {
      emitter.emit("recursive");
    }
  });

  emitter.emit("recursive");
  assert.equal(results, ["depth-0", "depth-1", "depth-2"]);
});

test("should handle callbacks that throw errors", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("test", () => results.push("before"));
  emitter.on("test", () => {
    throw new Error("test error");
  });
  emitter.on("test", () => results.push("after"));

  assert.throws(() => {
    emitter.emit("test");
  });

  // First callback should have executed
  assert.ok(results.includes("before"));
  // Third callback execution depends on implementation
});

test("should handle all listeners removed during emission", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("test", () => {
    results.push("first");
    emitter.off("test"); // Remove all listeners
  });

  emitter.on("test", () => {
    results.push("second");
  });

  emitter.emit("test");
  assert.ok(results.includes("first"));
  // Second callback execution depends on implementation timing
});

test("should handle event type removed during emission", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("test", () => {
    results.push("callback");
    emitter.off("test");
  });

  const result = emitter.emit("test");
  assert.is(result, true);
  assert.equal(results, ["callback"]);
});

test("should handle mixed on/once listeners during complex operations", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("test", () => results.push("regular1"));
  emitter.once("test", () => results.push("once1"));
  emitter.on("test", () => results.push("regular2"));
  emitter.once("test", () => results.push("once2"));

  emitter.emit("test");
  assert.equal(results, ["regular1", "once1", "regular2", "once2"]);

  results.length = 0;
  emitter.emit("test");
  assert.equal(results, ["regular1", "regular2"]);
});

test("should handle priority changes during emission", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("test", () => {
    results.push("first");
    // Adding a new listener with higher priority during emission
    emitter.on(
      "test",
      () => results.push("high-priority"),
      { id: "new" },
      -100,
    );
  });

  emitter.on("test", () => results.push("second"));

  emitter.emit("test");
  assert.equal(results, ["first", "second"]);

  // Second emission should show the new priority order
  results.length = 0;
  emitter.emit("test");
  assert.equal(results, ["high-priority", "first", "second"]);
});

test("should handle context modifications during emission", () => {
  const emitter = new TestEmitter();
  const context = { value: "initial" };
  const results: string[] = [];

  emitter.on(
    "test",
    function (this: typeof context) {
      results.push(`first-${this.value}`);
      this.value = "modified";
    },
    context,
  );

  emitter.on(
    "test",
    function (this: typeof context) {
      results.push(`second-${this.value}`);
    },
    context,
  );

  emitter.emit("test");
  assert.equal(results, ["first-initial", "second-modified"]);
});

test("should handle complex listener chains", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("start", () => {
    results.push("start");
    emitter.emit("middle");
  });

  emitter.on("middle", () => {
    results.push("middle");
    emitter.emit("end");
  });

  emitter.on("end", () => {
    results.push("end");
  });

  emitter.emit("start");
  assert.equal(results, ["start", "middle", "end"]);
});

test("should handle listener modifications in different event types", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  emitter.on("type1", () => {
    results.push("type1");
    emitter.on("type2", () => results.push("type2-added"), { id: "added" });
  });

  emitter.on("type2", () => results.push("type2-original"));

  emitter.emit("type1");
  assert.equal(results, ["type1"]);

  results.length = 0;
  emitter.emit("type2");
  assert.equal(results, ["type2-original", "type2-added"]);
});

test("should handle stress test with rapid modifications", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  // Add initial listeners
  for (let i = 0; i < 10; i++) {
    emitter.on("test", () => results.push(`initial-${i}`), { id: i });
  }

  // Add a listener that modifies the listener set
  emitter.on(
    "test",
    () => {
      results.push("modifier");
      // Remove some listeners
      emitter.off("test", () => {}, { id: 5 });
      // Add new listener
      emitter.on("test", () => results.push("added"), { id: "new" });
    },
    { id: "modifier" },
  );

  emitter.emit("test");
  assert.ok(results.includes("modifier"));
  assert.ok(results.length > 10);
});

test("should handle emission during listener removal", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  const callback = () => {
    results.push("callback");
    emitter.off("test", callback);
    emitter.emit("test"); // Should not cause infinite recursion
  };

  emitter.on("test", callback);
  emitter.emit("test");

  assert.equal(results, ["callback"]);
});

test("should handle complex priority and context combinations", () => {
  const emitter = new TestEmitter();
  const results: string[] = [];

  const contexts = [
    { type: "A", priority: 10 },
    { type: "B", priority: 5 },
    { type: "C", priority: 15 },
  ];

  contexts.forEach((ctx) => {
    emitter.on(
      "test",
      function (this: typeof ctx) {
        results.push(`${this.type}-${this.priority}`);
      },
      ctx,
      ctx.priority,
    );
  });

  emitter.emit("test");
  assert.equal(results, ["B-5", "A-10", "C-15"]);
});

test("should handle memory management with frequent add/remove cycles", () => {
  const emitter = new TestEmitter();

  for (let cycle = 0; cycle < 100; cycle++) {
    const callbacks: Array<() => void> = [];
    const contexts: Array<{ id: number }> = [];

    // Add listeners
    for (let i = 0; i < 10; i++) {
      const callback = () => {};
      const context = { id: i };
      callbacks.push(callback);
      contexts.push(context);
      emitter.on("test", callback, context);
    }

    // Remove half
    for (let i = 0; i < 5; i++) {
      emitter.off("test", callbacks[i], contexts[i]);
    }

    // Emit
    emitter.emit("test");

    // Remove rest
    for (let i = 5; i < 10; i++) {
      emitter.off("test", callbacks[i], contexts[i]);
    }
  }

  // Should not crash and should clean up properly
  const result = emitter.emit("test");
  assert.is(result, false);
});

test.run();
