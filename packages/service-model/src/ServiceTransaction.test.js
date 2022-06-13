import test from "ava";
import ServiceTransaction from "./ServiceTransaction.js";

test("module exports a function", (t) => {
  t.truthy(
    ServiceTransaction instanceof Function,
    "default export should be a function"
  );
});
