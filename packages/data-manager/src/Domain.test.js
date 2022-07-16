import test from "ava";
import Domain from "./Domain.js";

test("module exports a function", (t) => {
  t.truthy(Domain instanceof Function, "default export should be a function");
});
