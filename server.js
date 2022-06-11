import concurrently from "concurrently";

concurrently([
  {
    command: "npm start -s -w @phasis/core",
    name: "core",
    prefixColor: "cyan",
  },
  {
    command: "npm start -s -w @phasis/service-model",
    name: "service-model",
    prefixColor: "green",
  },
]);
