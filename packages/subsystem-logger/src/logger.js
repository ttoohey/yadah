import winston from "winston";
import { pretty, json } from "./format.js";

function getLevel(levels, levelList, defaultLevel) {
  for (const level of levelList) {
    if (level in levels) {
      return level;
    }
  }
  return defaultLevel;
}

export default function createLogger(options) {
  const transport = () =>
    new winston.transports.Console({
      format: options.pretty ? pretty() : json(),
      silent: options?.silent,
      [Symbol.for("message")]: "simple",
    });
  const levelList = (options.level || "info").split(",");

  const syslog = winston.createLogger({
    levels: winston.config.syslog.levels,
    level: getLevel(winston.config.syslog.levels, levelList, "info"),
    transports: [transport()],
  });
  const cli = winston.createLogger({
    levels: winston.config.cli.levels,
    level: getLevel(winston.config.cli.levels, levelList, "info"),
    transports: [transport()],
  });
  const npm = winston.createLogger({
    levels: winston.config.npm.levels,
    level: getLevel(winston.config.npm.levels, levelList, "info"),
    transports: [transport()],
  });

  syslog.cli = cli;
  syslog.npm = npm;
  syslog.syslog = syslog;
  cli.cli = cli;
  cli.npm = npm;
  cli.syslog = syslog;
  npm.cli = cli;
  npm.npm = npm;
  npm.syslog = syslog;
  return npm;
}
