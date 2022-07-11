import createSchedule, { ScheduleMixin } from "@yadah/subsystem-schedule";
import DataManager, { Service } from "@yadah/data-manager";
import createKnex from "@yadah/subsystem-knex";
import createLogger, { LoggerMixin } from "@yadah/subsystem-logger";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";

class MyService extends (Service |> LoggerMixin(%) |> ScheduleMixin(%)) {
  registerSchedule() {
    // ensure all superclass schedules are registered
    super.registerSchedule();

    // run the `tickTock` function every minute
    this.schedule.everyMinute().do(this.tickTock);
  }

  tickTock() {
    this.logger.info("tick tock");
    this.emit("tickTock");
  }
}

// create subsystems
const knex = createKnex({
  client: "postgresql",
  connection: process.env.DATABASE_URL,
});
const logger = createLogger({ pretty: true });
const schedule = createSchedule(knex, logger);

// create and boot services
const dataManager = new DataManager({ schedule, logger });
const services = dataManager.boot({ MyService });

// register services with the schedule subsystem
schedule.register(services);

// start services and scheduled tasks
await dataManager.startup();
await schedule.start();

await Promise.race([
  // wait for the tickTock() function to be fired
  once(services.MyService, "tickTock"),
  // or, safety-net timeout after 60s
  setTimeout(60000, undefined, { ref: false }),
]);
// info: schedule: Started "MyService.tickTock" {timestamp}
// info: tick tock {timestamp}
// info: schedule: Finished "MyService.tickTock" {timestamp}

// shutdown schedule and services
await schedule.stop();
await dataManager.shutdown();
await knex.destroy();
