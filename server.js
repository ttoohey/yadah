import concurrently from "concurrently";

concurrently([
  {
    command: "npm start -w @phasis/core",
    name: "core",
    prefixColor: "cyan",
  },
  {
    command: "npm start -w @phasis/objection-iterator",
    name: "objection-iterator",
    prefixColor: "yellow",
  },
  {
    command: "npm start -w @phasis/objection-scope",
    name: "objection-scope",
    prefixColor: "blueBright",
  },
  {
    command: "npm start -w @phasis/service-listener",
    name: "service-listener",
    prefixColor: "redBright",
  },
  {
    command: "npm start -w @phasis/service-model",
    name: "service-model",
    prefixColor: "green",
  },
  {
    command: "npm start -w @phasis/service-schedule",
    name: "service-schedule",
    prefixColor: "blue",
  },
]);
