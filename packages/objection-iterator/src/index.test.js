import test from "ava";
import Mixin from "./index.js";

test("it exports a mixin function", (t) => {
  t.assert(Mixin instanceof Function);
});
