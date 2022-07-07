import test from "ava";
import CriticalSectionMixin from "./CriticalSectionMixin.js";

test("it exports a mixin function", (t) => {
  t.assert(CriticalSectionMixin instanceof Function);
});
