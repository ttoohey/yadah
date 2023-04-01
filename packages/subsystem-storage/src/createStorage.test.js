import test from "ava";
import createStorage from "./createStorage.js";

test("it exports a function", (t) => {
  t.assert(createStorage instanceof Function);
});
