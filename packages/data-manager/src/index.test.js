import test from "ava";
import DataManager from "./index.js";

test("exports DataManager class", (t) => {
  t.truthy(
    DataManager.constructor instanceof Function,
    "'DataManager' should be a class"
  );
});
