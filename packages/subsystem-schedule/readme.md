# Yadah Schedule subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides Cron/Scheduling functionality.

## Basic usage

```js
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
```

## createSchedule(knex, logger)

Creates a Schedule subsystem.

### Schedule.register(domains)

Calls the `registerSchedule()` function on each Domain singleton to allow domains
to set up their scheduled jobs.

This must be called prior to calling `Schedule.start()`.

### Schedule.start(...scheduleName)

Sets Cron jobs to run. Supply no arguments to start all schedules, otherwise
only schedules defined using `.to(scheduleName)` will be started.

Returns a Promise that resolves when the jobs have been created and started.

### Schedule.stop()

Stops Cron jobs.

Returns a Promise that resolves when jobs have been stopped.

### Schedule.migrate()

Performs a database schema update to the `schedule` schema to create the table
storing schedule runtime data. This function should be called prior to starting
the schedule.

Returns a Promise that resolves when the schema update is complete.

### Schedule.list()

Read current stats of all scheduled jobs.

Returns a then-able and async-iterable object.

```js
// get array of scheduled job stats
const stats = await schedule.list();
// or may be streamed
for await (const stat of schedule.list()) {
  ...
}
```

### Schedule.find(id)

Read current stats of a specific scheduled job.

Returns a promise that resolves to a job 'stat' object.

## ScheduleMixin

The `ScheduleMixin` function will add a `.schedule` property to domain classes
which provides access to the schedule subsystem.

An error will be thrown if no `schedule` subsystem is provided during the `boot`
lifecycle.

The `.schedule` getter is used to register scheduled jobs.

```js
import { pipe } from "@yadah/mixin";

class MyDomain extends pipe(Domain, ScheduleMixin) {
  registerSchedule() {
    super.registerSchedule();
    this.schedule.everyMinute().do(this.frequentJob);
  }
}
```

The `.schedule` getter returns an object that allows defining the job in a
fluent manner. The modifiers are:

### .schedule.do(callback)

Set the callback function to handle the job each time the schedule is fired.

### .schedule.id(id)

Each job should have a unique id to identify it. The default id is determined
by the class name of the domain the scheduler is bound to and the name of
the `.do` callback function (eg. "MyDomain.frequentJob").

The `.id()` modifier allows providing a custom job id. This may be a string
or a callback function with signature `(functionName, className) => string`.

### .schedule.bindTo(thisArg)

Changes the class instance used to determine `className` for the job id. The
`ScheduleMixin` automatically binds schedulers to the Domain class where
it is being registered.

### .schedule.timeZone(timeZone)

Set the time zone to use when interpreting "at" hours of the day.

### .schedule.at(cronTime)

Pass a [cron schedule expression](https://crontab.guru) to specify when the
job should be run.

In addition to `.at()` the scheduler also accepts any of the functions in
[cron-time-generator](https://www.npmjs.com/package/cron-time-generator) as
a modifier.

```js
// some common examples
schedule.everyMinute();
schedule.everyHour();
schedule.everyDay();
schedule.everyDatAt(6);
schedule.every(5).minutes();
```

### .schedule.onInit

Run the job every time the schedule is started. This will cause the job to fire
everytime a service is restarted.

Note: `.onInit` is a getter:

```js
schedule.onInit.everyHour().do(importantJob);
```

### .schedule.to(scheduleName)

Allows grouping jobs to be executed by a specific execution agent.

The `Schedule.start(scheduleName)` method will start only those job with a
matching name.
