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
      if (
        splats[0]?.message !== undefined &&
        info[MESSAGE].endsWith(splats[0].message)
      ) {
        info[MESSAGE] = info[MESSAGE].slice(
          0,
          info[MESSAGE].length - String(splats[0].message).length - 1
        );
      }
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
    info[MESSAGE] = info.message;
    const splats = info[SPLAT] || [];
    if (
      splats[0]?.message !== undefined &&
      info[MESSAGE].endsWith(splats[0].message)
    ) {
      info[MESSAGE] = info[MESSAGE].slice(
        0,
        info[MESSAGE].length - String(splats[0].message).length - 1
      );
    }
    const message = info[MESSAGE];
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
