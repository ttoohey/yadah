import test from "ava";
import { dedupe, pipe } from "./index.js";

test("it exports a dedupe function", (t) => {
  t.assert(dedupe instanceof Function);
});

test("it exports a pipe function", (t) => {
  t.assert(pipe instanceof Function);
});
