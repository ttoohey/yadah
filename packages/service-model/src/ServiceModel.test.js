import test from "ava";
import ServiceModel from "./ServiceModel.js";

test("module exports a function", (t) => {
  t.truthy(
    ServiceModel instanceof Function,
    "default export should be a function"
  );
});
