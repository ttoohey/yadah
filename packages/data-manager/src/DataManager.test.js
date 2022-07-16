import test from "ava";
import DataManager from "./DataManager.js";
import Domain from "./Domain.js";

test("module exports a function", (t) => {
  t.truthy(
    DataManager instanceof Function,
    "default export should be a function"
  );
});

test("subsystems are properties of Domain class instances", (t) => {
  const subsystems = { example: {} };
  const modules = { A: class A extends Domain {} };
  const data = new DataManager(subsystems);
  const domains = data.boot(modules);
  t.is(domains.A.example, subsystems.example);
});
