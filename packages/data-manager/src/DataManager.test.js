import test from "ava";
import DataManager from "./DataManager.js";
import Service from "./Service.js";

test("module exports a function", (t) => {
  t.truthy(
    DataManager instanceof Function,
    "default export should be a function"
  );
});

test("subsystems are properties of Service class instances", (t) => {
  const subsystems = { example: {} };
  const modules = { A: class A extends Service {} };
  const data = new DataManager(subsystems);
  const services = data.boot(modules);
  t.is(services.A.example, subsystems.example);
});
