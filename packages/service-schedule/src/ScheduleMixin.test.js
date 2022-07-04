import test from "ava";
import ScheduleMixin from "./ScheduleMixin.js";

test("module exports a function", (t) => {
  t.truthy(
    ScheduleMixin instanceof Function,
    "default export should be a function"
  );
});
