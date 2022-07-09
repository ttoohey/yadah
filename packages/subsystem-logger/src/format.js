import { inspect } from "node:util";
import winston from "winston";
import { SPLAT, MESSAGE } from "triple-beam";
import chalk from "chalk";
import stringify from "safe-stable-stringify";
import ErrorStackParser from "error-stack-parser";

export function pretty(...args) {
  return winston.format.combine(
    winston.format.colorize(),
    winston.format((info) => {
      const timestamp = chalk.dim(new Date().toISOString());
      info[MESSAGE] = `${info.level}: ${info.message}`;
      const splats = info[SPLAT] || [];
      const splatMessages = splats
        .filter((s) => s !== null && typeof s === "object" && s.message)
        .map((s) => s.message);
      const len = splatMessages.reduce((len, msg) => len + msg.length + 1, 0);
      info[MESSAGE] = info[MESSAGE].slice(0, info[MESSAGE].length - len);
      info[MESSAGE] += " " + timestamp;
      for (const splat of splats) {
        info[MESSAGE] +=
          "\n" + inspect(splat, { colors: true, breakLength: 80 });
      }
      return info;
    })(...args)
  );
}

export function json(...args) {
  return winston.format((info) => {
    const splats = info[SPLAT] || [];
    const splatMessages = splats
      .filter((s) => s !== null && typeof s === "object" && s.message)
      .map((s) => s.message);
    const len = splatMessages.reduce((len, msg) => len + msg.length + 1, 0);
    const message = info.message.slice(0, info.message.length - len);
    info[MESSAGE] = stringify({
      timestamp: new Date().toISOString(),
      level: info.level,
      message: message,
      ...(info[SPLAT]?.length > 0
        ? {
            metadata: info[SPLAT].map((val) =>
              val instanceof Error
                ? {
                    error: val.toString(),
                    stack: ErrorStackParser.parse(val),
                  }
                : val
            ),
          }
        : {}),
    });
    return info;
  })(...args);
}
