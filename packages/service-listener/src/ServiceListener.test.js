import test from "ava";
import ServiceListener from "./ServiceListener.js";

test("it exports a mixin function", (t) => {
  t.assert(ServiceListener instanceof Function);
});
