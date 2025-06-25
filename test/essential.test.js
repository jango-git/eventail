import { test } from "uvu";
import * as assert from "uvu/assert";
import { Eventail } from "../dist/index.js";

// Helper class to access protected emit method
class TestEmitter extends Eventail {
  triggerEvent(type, ...args) {
    return this.emit(type, ...args);
  }
}

// ============================================================================
// Essential Edge Cases and Scenarios Not Covered by Basic Tests
// ============================================================================

test("should handle Unicode event names", () => {
  const emitter = new TestEmitter();
  const results = [];

  emitter.on("🚀", () => results.push("rocket"));
  emitter.on("测试", () => results.push("chinese"));
  emitter.on("العربية", () => results.push("arabic"));

  emitter.triggerEvent("🚀");
  emitter.triggerEvent("测试");
  emitter.triggerEvent("العربية");

  assert.equal(results, ["rocket", "chinese", "arabic"]);
});

test("should handle callbacks that throw errors", () => {
  const emitter = new TestEmitter();
  const results = [];

  emitter.on("test", () => results.push("before"));
  emitter.on("test", () => { throw new Error("test error"); });
  emitter.on("test", () => results.push("after"));

  assert.throws(() => {
    emitter.triggerEvent("test");
  });

  // First callback should have executed
  assert.ok(results.includes("before"));
});

test("should handle circular references in event data", () => {
  const emitter = new TestEmitter();
  let receivedData = null;

  const circularObj = { name: "circular" };
  circularObj.self = circularObj;

  emitter.on("test", (data) => {
    receivedData = data;
  });

  assert.not.throws(() => {
    emitter.triggerEvent("test", circularObj);
  });

  assert.is(receivedData, circularObj);
  assert.is(receivedData.self, circularObj);
});

test("should handle recursive event emissions", () => {
  const emitter = new TestEmitter();
  const results = [];
  let depth = 0;

  emitter.on("recursive", () => {
    results.push(`depth-${depth}`);
    depth++;
    if (depth < 3) {
      emitter.triggerEvent("recursive");
    }
  });

  emitter.triggerEvent("recursive");
  assert.equal(results, ["depth-0", "depth-1", "depth-2"]);
});

test("should handle very high number of arguments", () => {
  const emitter = new TestEmitter();
  let receivedArgs = null;

  const manyArgs = Array.from({ length: 100 }, (_, i) => i);

  emitter.on("test", (...args) => {
    receivedArgs = args;
  });

  emitter.triggerEvent("test", ...manyArgs);
  assert.equal(receivedArgs, manyArgs);
});

test("should handle symbols as contexts", () => {
  const emitter = new TestEmitter();
  const symbol1 = Symbol("context1");
  const symbol2 = Symbol("context2");
  const results = [];

  emitter.on("test", function() {
    results.push(this.toString());
  }, symbol1);

  emitter.on("test", function() {
    results.push(this.toString());
  }, symbol2);

  emitter.triggerEvent("test");

  assert.is(results.length, 2);
  assert.ok(results[0].includes("Symbol(context1)"));
  assert.ok(results[1].includes("Symbol(context2)"));
});

test("should work as a simple pub-sub system", () => {
  const pubsub = new TestEmitter();
  const messages = [];

  // Multiple subscribers
  pubsub.on("news", (article) => {
    messages.push(`Email: ${article.title}`);
  });

  pubsub.on("news", (article) => {
    messages.push(`SMS: ${article.title}`);
  });

  // Publish news
  pubsub.triggerEvent("news", { title: "Breaking News!" });

  assert.equal(messages, [
    "Email: Breaking News!",
    "SMS: Breaking News!"
  ]);
});

test("should work as priority-based middleware system", () => {
  class MiddlewareRunner extends TestEmitter {
    use(middleware, priority = 100) {
      this.on("request", middleware, undefined, priority);
    }

    process(request) {
      return this.emit("request", request);
    }
  }

  const runner = new MiddlewareRunner();
  const log = [];

  // Add middlewares with different priorities
  runner.use((req) => {
    log.push("auth");
    req.authenticated = true;
  }, 10); // High priority

  runner.use((req) => {
    log.push("validation");
    req.validated = true;
  }, 50); // Medium priority

  runner.use((req) => {
    log.push("logging");
    req.logged = true;
  }, 100); // Low priority

  const request = { url: "/test" };
  runner.process(request);

  // Should execute in priority order
  assert.equal(log, ["auth", "validation", "logging"]);
  assert.is(request.authenticated, true);
  assert.is(request.validated, true);
  assert.is(request.logged, true);
});

test("should handle performance stress with many listeners", () => {
  const emitter = new TestEmitter();
  let totalCalls = 0;

  // Add many listeners to different events to avoid duplicate errors
  for (let i = 0; i < 100; i++) {
    emitter.on(`event${i}`, () => totalCalls++);
  }

  // Trigger all events
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    emitter.triggerEvent(`event${i}`);
  }
  const duration = Date.now() - startTime;

  assert.is(totalCalls, 100);
  // Should complete reasonably fast (less than 100ms for 100 events)
  assert.ok(duration < 100);
});

test("should clean up properly after removing all listeners", () => {
  const emitter = new TestEmitter();

  // Add listeners to multiple events
  for (let i = 0; i < 10; i++) {
    emitter.on(`event${i}`, () => {});
  }

  // Remove all listeners
  for (let i = 0; i < 10; i++) {
    emitter.off(`event${i}`);
  }

  // All events should return false (no listeners)
  for (let i = 0; i < 10; i++) {
    assert.is(emitter.triggerEvent(`event${i}`), false);
  }
});

test.run();
