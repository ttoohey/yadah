import createSchedule, { ScheduleMixin } from "@yadah/subsystem-schedule";
import DataManager, { Domain } from "@yadah/data-manager";
import createKnex from "@yadah/subsystem-knex";
import createLogger, { LoggerMixin } from "@yadah/subsystem-logger";
import { pipe } from "@yadah/mixin";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";

class MyDomain extends pipe(Domain, LoggerMixin, ScheduleMixin) {
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

// create and boot domains
const dataManager = new DataManager({ schedule, logger });
const domains = dataManager.boot({ MyDomain });

// register domains with the schedule subsystem
schedule.register(domains);

// start domains and scheduled tasks
await dataManager.startup();
await schedule.start();

await Promise.race([
  // wait for the tickTock() function to be fired
  once(domains.MyDomain, "tickTock"),
  // or, safety-net timeout after 60s
  setTimeout(60000, undefined, { ref: false }),
]);
// info: schedule: Started "MyDomain.tickTock" {timestamp}
// info: tick tock {timestamp}
// info: schedule: Finished "MyDomain.tickTock" {timestamp}

// shutdown schedule and domains
await schedule.stop();
await dataManager.shutdown();
await knex.destroy();
