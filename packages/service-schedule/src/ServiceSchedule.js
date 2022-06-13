import Scheduler from "./Scheduler.js";

export default function (Service) {
  return class ServiceSchedule extends Service {
    #schedules = [];

    /**
     * hook for derived classes to register scheduled jobs
     *
     * a background process should call this before starting schedules
     */
    registerSchedule() {}

    /**
     * schedule builder for use in registerSchedule() hook
     */
    get schedule() {
      const s = new Scheduler();
      this.#schedules.push(s);
      return s;
    }

    startSchedule() {
      const logger = this.logger;
      const name = this.constructor.name;
      for (const schedule of this.#schedules) {
        schedule.start(
          this,
          function (job) {
            logger.info(`start: ${name}.${job}`);
          },
          function (job, [err, result] = []) {
            if (!job) {
              return;
            }
            if (err) {
              logger.error(`failed: ${name}.${job}`);
              logger.error(undefined, err);
            } else {
              logger.info(`finish: ${name}.${job}`);
              if (result) {
                logger.info(result);
              }
            }
          }
        );
      }
    }

    stopSchedule() {
      for (const schedule of this.#schedules) {
        schedule.stop();
      }
    }
  };
}
