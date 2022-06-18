import concurrently from "concurrently";

concurrently([
  {
    command: "npm start -s -w @phasis/core",
    name: "core",
    prefixColor: "cyan",
  },
  {
    command: "npm start -s -w @phasis/objection-scope",
    name: "objection-scope",
    prefixColor: "blueBright",
  },
  {
    command: "npm start -s -w @phasis/service-listener",
    name: "service-listener",
    prefixColor: "redBright",
  },
  {
    command: "npm start -s -w @phasis/service-model",
    name: "service-model",
    prefixColor: "green",
  },
  {
    command: "npm start -s -w @phasis/service-schedule",
    name: "service-schedule",
    prefixColor: "blue",
  },
]);
