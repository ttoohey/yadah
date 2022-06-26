import test from "ava";
import { mixin } from "./index.js";

test("exports mixin function", (t) => {
  t.truthy(mixin instanceof Function, "'mixin' should be function");
});
