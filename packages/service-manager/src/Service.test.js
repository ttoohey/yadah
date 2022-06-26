import test from "ava";
import Service from "./Service.js";

test("module exports a function", (t) => {
  t.truthy(Service instanceof Function, "default export should be a function");
});
