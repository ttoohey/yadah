import test from "ava";
import Scheduler from "./Scheduler.js";

test("module exports a function", (t) => {
  t.truthy(
    Scheduler instanceof Function,
    "default export should be a function"
  );
});
