import test from "ava";
import ServiceManager from "./index.js";

test("exports ServiceManager class", (t) => {
  t.truthy(
    ServiceManager.constructor instanceof Function,
    "'ServiceManager' should be a class"
  );
});
