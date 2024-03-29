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
      command: "npm start -w @yadah/objection-copy",
      name: "objection-copy",
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
      command: "npm start -w @yadah/storage-fs",
      name: "storage-fs",
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
      command: "npm start -w @yadah/subsystem-storage",
      name: "subsystem-storage",
    },
    {
      command: "npm start -w @yadah/yadah",
      name: "yadah",
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
      "greenBright",
      "yellowBright",
      "blueBright",
      "magentaBright",
      "cyanBright",
      "whiteBright",
      "bgGreen.black",
      "bgYellow.black",
      "bgBlue.black",
      "bgMagenta.black",
      "bgCyan.black",
      "bgWhite.black",
      "bgBlackBright.white",
      "bgRedBright.black",
      "bgYellowBright.black",
      "bgBlueBright.white",
      "bgMagentaBright.black",
      "bgCyanBright.black",
      "bgWhiteBright.black",
      "auto",
    ],
  }
);
