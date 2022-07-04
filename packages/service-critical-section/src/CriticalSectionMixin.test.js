import test from "ava";
import ServiceCriticalSection from "./ServiceCriticalSection.js";

test("it exports a mixin function", (t) => {
  t.assert(ServiceCriticalSection instanceof Function);
});
