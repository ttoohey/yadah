import test from "ava";
import ListenerMixin from "./ListenerMixin.js";

test("it exports a mixin function", (t) => {
  t.assert(ListenerMixin instanceof Function);
});
