import test from "ava";
import createContext from "./index.js";

test("it exports a function", (t) => {
  t.assert(createContext instanceof Function);
});
