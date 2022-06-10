import concurrently from "concurrently";

concurrently([
  {
    command: "npm start -s -w @phasis/core",
    name: "core",
    prefixColor: "cyan",
  },
]);
