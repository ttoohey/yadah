import Schedule from "./Schedule.js";

export default (knex, logger, options) => {
  const schedule = new Schedule(knex, options);
  if (logger) {
    schedule.on("active", (id) =>
      logger.syslog.info(`schedule: Started "${id}"`)
    );
    schedule.on("idle", (id, exitCode) =>
      logger.syslog.info(
        `schedule: Finished "${id}"`,
        ...(typeof exitCode === "number" ? [{ exitCode }] : [])
      )
    );
    schedule.on("error", (error, id) =>
      logger.syslog.error(`schedule: Error executing "${id}"`, error)
    );
  }
  return schedule;
};
