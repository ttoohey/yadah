import test from "ava";
import Scope from "./index.js";

test("it exports a mixin function", (t) => {
  t.assert(Scope instanceof Function);
});
