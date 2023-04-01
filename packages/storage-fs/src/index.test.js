import test from "ava";
import FileStorageAdaptor from "./index.js";

test("it exports a class", (t) => {
  t.assert(FileStorageAdaptor instanceof Function);
});
