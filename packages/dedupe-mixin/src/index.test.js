import test from "ava";
import dedupeMixin from "./index.js";

test("it exports a function", (t) => {
  t.assert(dedupeMixin instanceof Function);
});
