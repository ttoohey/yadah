import ScheduleMixin from "./ScheduleMixin.js";
import Scheduler from "./Scheduler.js";

export default (logger) => {
  const schedulers = [];
  const eventHandlers = [];
  const state = {
    running: false,
  };
  const schedule = new Proxy(
    new (class Schedule {
      start(services = []) {
        if (state.running) {
          this.stop();
        }
        for (const service of services) {
          if (!ScheduleMixin.extends(service.constructor)) {
            continue;
          }
          service.registerSchedule();
        }
        schedulers.forEach((s) => s.start());
        state.running = true;
      }
      stop() {
        schedulers.forEach((s) => s.stop());
        state.running = false;
      }
      get status() {
        return { ...state, count: schedulers.length };
      }
      on(eventName, handler) {
        schedulers.forEach((s) => s.on(eventName, handler));
        eventHandlers.push([eventName, handler]);
        return this;
      }
    })(),
    {
      get(target, prop) {
        if (["start", "stop", "status", "on"].includes(prop)) {
          return Reflect.get(...arguments);
        }
        const scheduler = new Scheduler();
        const fn = scheduler[prop];
        if (!(fn instanceof Function)) {
          return undefined;
        }
        schedulers.push(scheduler);
        eventHandlers.forEach(([eventName, handler]) =>
          scheduler.on(eventName, handler)
        );
        return fn.bind(scheduler);
      },
    }
  );
  if (logger) {
    schedule.on("start", (job) =>
      logger.info(`schedule: Started scheduled job "${job}"`)
    );
    schedule.on("finish", (job) =>
      logger.info(`schedule: Finished scheduled job "${job}"`)
    );
    schedule.on("error", (error, job) =>
      logger.error(`schedule: Error executing scheduled job "${job}"`, error)
    );
  }
  return schedule;
};
