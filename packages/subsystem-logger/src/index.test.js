import test from "ava";
import logger from "./index.js";

test("it exports a function", (t) => {
  t.assert(logger instanceof Function);
});
