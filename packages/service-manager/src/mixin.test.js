import test from "ava";
import mixin from "./mixin.js";

test("module exports a function", (t) => {
  t.truthy(mixin instanceof Function, "default export should be a function");
});

test("mixin extends a class", (t) => {
  const A = class {
    static a = true;
  };
  const B = (S) =>
    class extends S {
      static b = true;
    };
  const C = mixin(A, B);
  t.truthy(C.a, "'a' property should be truthy");
  t.truthy(C.b, "'b' property should be truthy");
});
