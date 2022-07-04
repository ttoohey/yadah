import test from "ava";
import TransactionMixin from "./TransactionMixin.js";

test("module exports a function", (t) => {
  t.truthy(
    TransactionMixin instanceof Function,
    "default export should be a function"
  );
});
