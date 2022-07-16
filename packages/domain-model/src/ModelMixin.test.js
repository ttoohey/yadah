import test from "ava";
import modelMixin from "./ModelMixin.js";

test("module exports a function", (t) => {
  t.truthy(
    modelMixin instanceof Function,
    "default export should be a function"
  );
});
