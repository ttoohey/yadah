import test from "ava";
import logger from "./index.js";

test.fail("it exports a function", (t) => {
  t.assert(logger instanceof Function);
});
