import test from "ava";
import ServiceManager from "./ServiceManager.js";
import Service from "./Service.js";

test("module exports a function", (t) => {
  t.truthy(
    ServiceManager instanceof Function,
    "default export should be a function"
  );
});

test("subsystems are properties of Service class instances", (t) => {
  const subsystems = { example: {} };
  const modules = { A: class A extends Service {} };
  const manager = new ServiceManager(subsystems);
  const services = manager.boot(modules);
  t.is(services.A.example, subsystems.example);
});
