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
// Event Data Handling Tests
// ============================================================================

test("should pass single argument to listeners", () => {
  const emitter = new TestEmitter();
  let receivedData: string | null = null;

  emitter.on("test", (data: string) => {
    receivedData = data;
  });

  emitter.emit("test", "hello");
  assert.is(receivedData, "hello");
});

test("should pass multiple arguments to listeners", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
    receivedArgs = args;
  });

  emitter.emit("test", "arg1", "arg2", "arg3");
  assert.equal(receivedArgs, ["arg1", "arg2", "arg3"]);
});

test("should handle no arguments", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
    receivedArgs = args;
  });

  emitter.emit("test");
  assert.equal(receivedArgs, []);
});

test("should handle many arguments efficiently", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
    receivedArgs = args;
  });

  const manyArgs = Array.from({ length: 50 }, (unusedValue, i) => {
    void unusedValue;
    return i;
  });
  emitter.emit("test", ...manyArgs);
  assert.equal(receivedArgs, manyArgs);
});

test("should handle very large number of arguments", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
    receivedArgs = args;
  });

  const veryManyArgs = Array.from({ length: 1000 }, (unusedValue, i) => {
    void unusedValue;
    return i;
  });
  emitter.emit("test", ...veryManyArgs);
  assert.equal(receivedArgs, veryManyArgs);
});

test("should handle null and undefined values", () => {
  const emitter = new TestEmitter();
  const results: any[] = [];

  emitter.on("test", (data: any) => {
    results.push(data);
  });

  emitter.emit("test", null);
  emitter.emit("test", undefined);
  emitter.emit("test", 0);
  emitter.emit("test", false);
  emitter.emit("test", "");

  assert.equal(results, [null, undefined, 0, false, ""]);
});

test("should handle mixed primitive types", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
    receivedArgs = args;
  });

  emitter.emit("test", 42, "string", true, null, undefined);
  assert.equal(receivedArgs, [42, "string", true, null, undefined]);
});

test("should handle object arguments", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testObject = { name: "test", value: 42 };
  emitter.emit("test", testObject);
  assert.is(receivedData, testObject);
});

test("should handle array arguments", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testArray = [1, 2, 3, "test"];
  emitter.emit("test", testArray);
  assert.is(receivedData, testArray);
});

test("should handle circular references in data", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const circularObj: any = { name: "circular" };
  circularObj.self = circularObj;

  assert.not.throws(() => {
    emitter.emit("test", circularObj);
  });

  assert.is(receivedData, circularObj);
  assert.is(receivedData.self, circularObj);
});

test("should handle nested objects", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const nestedObj = {
    level1: {
      level2: {
        level3: {
          value: "deep",
        },
      },
    },
  };

  emitter.emit("test", nestedObj);
  assert.is(receivedData, nestedObj);
  assert.is(receivedData.level1.level2.level3.value, "deep");
});

test("should handle function arguments", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testFunction = (): string => "test";
  emitter.emit("test", testFunction);
  assert.is(receivedData, testFunction);
  assert.is(receivedData(), "test");
});

test("should handle Date objects", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testDate = new Date("2023-01-01");
  emitter.emit("test", testDate);
  assert.is(receivedData, testDate);
});

test("should handle RegExp objects", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testRegex = /test/g;
  emitter.emit("test", testRegex);
  assert.is(receivedData, testRegex);
});

test("should handle Map and Set objects", () => {
  const emitter = new TestEmitter();
  const receivedData: any[] = [];

  emitter.on("test", (data: any) => {
    receivedData.push(data);
  });

  const testMap = new Map([["key", "value"]]);
  const testSet = new Set([1, 2, 3]);

  emitter.emit("test", testMap);
  emitter.emit("test", testSet);

  assert.is(receivedData[0], testMap);
  assert.is(receivedData[1], testSet);
});

test("should handle Symbol arguments", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testSymbol = Symbol("test");
  emitter.emit("test", testSymbol);
  assert.is(receivedData, testSymbol);
});

test("should handle BigInt arguments", () => {
  const emitter = new TestEmitter();
  let receivedData: any = null;

  emitter.on("test", (data: any) => {
    receivedData = data;
  });

  const testBigInt = BigInt(123456789012345678901234567890n);
  emitter.emit("test", testBigInt);
  assert.is(receivedData, testBigInt);
});

test("should handle complex mixed argument types", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
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
    (): string => "function",
    new Date(),
    /regex/,
    Symbol("symbol"),
    BigInt(42n),
  ];

  emitter.emit("test", ...testArgs);
  assert.equal(receivedArgs, testArgs);
});

test("should handle data modification by listeners", () => {
  const emitter = new TestEmitter();
  const testObject = { value: 1 };

  emitter.on("test", (data: any) => {
    data.value = 2;
  });

  emitter.on("test", (data: any) => {
    data.value = 3;
  });

  emitter.emit("test", testObject);
  assert.is(testObject.value, 3);
});

test("should handle same data passed to multiple listeners", () => {
  const emitter = new TestEmitter();
  const receivedData: any[] = [];
  const testObject = { shared: "data" };

  emitter.on("test", (data: any) => {
    receivedData.push(data);
  });

  emitter.on("test", (data: any) => {
    receivedData.push(data);
  });

  emitter.emit("test", testObject);

  assert.is(receivedData.length, 2);
  assert.is(receivedData[0], testObject);
  assert.is(receivedData[1], testObject);
  assert.is(receivedData[0], receivedData[1]);
});

test("should handle data with special string characters", () => {
  const emitter = new TestEmitter();
  let receivedData: string | null = null;

  emitter.on("test", (data: string) => {
    receivedData = data;
  });

  const specialString = "Hello\nWorld\t🌍\u0000\u{1F600}";
  emitter.emit("test", specialString);
  assert.is(receivedData, specialString);
});

test("should handle very long strings", () => {
  const emitter = new TestEmitter();
  let receivedData: string | null = null;

  emitter.on("test", (data: string) => {
    receivedData = data;
  });

  const longString = "a".repeat(10000);
  emitter.emit("test", longString);
  assert.is(receivedData, longString);
});

test("should handle empty arrays and objects", () => {
  const emitter = new TestEmitter();
  let receivedArgs: any[] = [];

  emitter.on("test", (...args: any[]) => {
    receivedArgs = args;
  });

  emitter.emit("test", [], {});
  assert.equal(receivedArgs, [[], {}]);
});

test.run();
