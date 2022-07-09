import winston from "winston";
import { pretty, json } from "./format.js";

export default function createLogger(options) {
  const logger = winston.createLogger({
    level: options?.level || "info",
    transports: [],
  });
  logger.add(
    new winston.transports.Console({
      format: options.pretty ? pretty() : json(),
      silent: options?.silent,
    })
  );
  return logger;
}
