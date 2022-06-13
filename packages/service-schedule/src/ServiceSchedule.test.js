import test from "ava";
import ServiceSchedule from "./ServiceSchedule.js";

test("module exports a function", (t) => {
  t.truthy(
    ServiceSchedule instanceof Function,
    "default export should be a function"
  );
});
