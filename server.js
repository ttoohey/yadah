import concurrently from "concurrently";

concurrently([
  {
    command: "npm start -w @yadah/service-manager",
    name: "core",
    prefixColor: "cyan",
  },
  {
    command: "npm start -w @yadah/objection-iterator",
    name: "objection-iterator",
    prefixColor: "yellow",
  },
  {
    command: "npm start -w @yadah/objection-scope",
    name: "objection-scope",
    prefixColor: "blueBright",
  },
  {
    command: "npm start -w @yadah/service-listener",
    name: "service-listener",
    prefixColor: "redBright",
  },
  {
    command: "npm start -w @yadah/service-model",
    name: "service-model",
    prefixColor: "green",
  },
  {
    command: "npm start -w @yadah/service-schedule",
    name: "service-schedule",
    prefixColor: "blue",
  },
]);
