import concurrently from "concurrently";

concurrently(
  [
    {
      command: "npm start -w @yadah/data-manager",
      name: "data-manager",
    },
    {
      command: "npm start -w @yadah/dedupe-mixin",
      name: "dedupe-mixin",
    },
    {
      command: "npm start -w @yadah/objection-iterator",
      name: "objection-iterator",
    },
    {
      command: "npm start -w @yadah/objection-scope",
      name: "objection-scope",
    },
    {
      command: "npm start -w @yadah/domain-critical-section",
      name: "domain-critical-section",
    },
    {
      command: "npm start -w @yadah/domain-listener",
      name: "domain-listener",
    },
    {
      command: "npm start -w @yadah/domain-model",
      name: "domain-model",
    },
    {
      command: "npm start -w @yadah/subsystem-context",
      name: "subsystem-context",
    },
    {
      command: "npm start -w @yadah/subsystem-knex",
      name: "subsystem-knex",
    },
    {
      command: "npm start -w @yadah/subsystem-logger",
      name: "subsystem-logger",
    },
    {
      command: "npm start -w @yadah/subsystem-message-queue",
      name: "subsystem-message-queue",
    },
    {
      command: "npm start -w @yadah/subsystem-pubsub",
      name: "subsystem-pubsub",
    },
    {
      command: "npm start -w @yadah/subsystem-schedule",
      name: "subsystem-schedule",
    },
    {
      command: "npm start -w @yadah/yadah",
      name: "yadah",
      prefixColor: "greenBright",
    },
  ],
  {
    prefixColors: [
      "red",
      "green",
      "yellow",
      "blue",
      "magenta",
      "cyan",
      "white",
      "blackBright",
      "redBright",
      "yellowBright",
      "blueBright",
      "magentaBright",
      "cyanBright",
      "whiteBright",
      "bgRed",
      "bgGreen",
      "bgYellow",
      "bgBlue",
      "bgMagenta",
      "bgCyan",
      "bgWhite",
      "bgBlackBright",
      "bgRedBright",
      "bgYellowBright",
      "bgBlueBright",
      "bgMagentaBright",
      "bgCyanBright",
      "bgWhiteBright",
    ],
  }
);
