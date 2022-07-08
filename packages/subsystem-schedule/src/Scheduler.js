import EventEmitter from "node:events";
import { CronJob } from "cron";
import cronTime from "cron-time-generator";

class Scheduler extends EventEmitter {
  #cronTime;
  #cronEvery;
  #runOnInit;
  #timeZone;
  #callbacks;
  #cronJobs;
  #thisArg;
  #id;

  constructor() {
    super(...arguments);
    this.#cronTime = cronTime;
    this.#runOnInit = false;
    this.#timeZone = process.env.TZ;
    this.#callbacks = [];
    this.#cronJobs = [];
  }

  get jobs() {
    return this.#cronJobs;
  }

  start() {
    const self = this;
    for (const callback of this.#callbacks) {
      const id =
        this.#id instanceof Function
          ? this.#id(callback.name, self.#thisArg?.constructor.name)
          : this.#id ||
            (self.#thisArg ? self.#thisArg.constructor.name + "." : "") +
              (callback.name || "[Anonymous]");
      const job = new CronJob({
        start: true,
        cronTime: this.#cronTime,
        runOnInit: this.#runOnInit,
        timeZone: this.#timeZone,
        onTick: async function () {
          try {
            self.emit("start", id);
            await callback.bind(self.#thisArg)(this);
            self.emit("finish", id);
          } catch (error) {
            self.emit("error", error, id);
          }
        },
      });
      this.#cronJobs.push(job);
    }
  }

  stop() {
    for (const cronJob of this.#cronJobs) {
      cronJob.stop();
    }
    this.#cronJobs = [];
  }

  do(callback) {
    this.#callbacks.push(callback);
    return this;
  }

  bindTo(thisArg) {
    this.#thisArg = thisArg;
    return this;
  }

  id(id) {
    this.#id = id;
    return this;
  }

  get onInit() {
    this.#runOnInit = true;
    return this;
  }

  timeZone(timeZone) {
    this.#timeZone = timeZone;
    return this;
  }

  every() {
    this.#cronEvery = this.#cronTime.every(...arguments);
    return this;
  }
  between() {
    this.#cronTime = this.#cronTime.between(...arguments);
    return this;
  }
  everyMinute() {
    this.#cronTime = this.#cronTime.everyMinute(...arguments);
    return this;
  }
  everyHour() {
    this.#cronTime = this.#cronTime.everyHour(...arguments);
    return this;
  }
  everyHourAt() {
    this.#cronTime = this.#cronTime.everyHourAt(...arguments);
    return this;
  }
  everyDay() {
    this.#cronTime = this.#cronTime.everyDay(...arguments);
    return this;
  }
  everyDayAt() {
    this.#cronTime = this.#cronTime.everyDayAt(...arguments);
    return this;
  }
  everySunday() {
    this.#cronTime = this.#cronTime.everySunday(...arguments);
    return this;
  }
  everySundayAt() {
    this.#cronTime = this.#cronTime.everySundayAt(...arguments);
    return this;
  }
  everyMonday() {
    this.#cronTime = this.#cronTime.everyMonday(...arguments);
    return this;
  }
  everyMondayAt() {
    this.#cronTime = this.#cronTime.everyMondayAt(...arguments);
    return this;
  }
  everyTuesday() {
    this.#cronTime = this.#cronTime.everyTuesday(...arguments);
    return this;
  }
  everyTuesdayAt() {
    this.#cronTime = this.#cronTime.everyTuesdayAt(...arguments);
    return this;
  }
  everyWednesday() {
    this.#cronTime = this.#cronTime.everyWednesday(...arguments);
    return this;
  }
  everyWednesdayAt() {
    this.#cronTime = this.#cronTime.everyWednesdayAt(...arguments);
    return this;
  }
  everyThursday() {
    this.#cronTime = this.#cronTime.everyThursday(...arguments);
    return this;
  }
  everyThursdayAt() {
    this.#cronTime = this.#cronTime.everyThursdayAt(...arguments);
    return this;
  }
  everyFriday() {
    this.#cronTime = this.#cronTime.everyFriday(...arguments);
    return this;
  }
  everyFridayAt() {
    this.#cronTime = this.#cronTime.everyFridayAt(...arguments);
    return this;
  }
  everySaturday() {
    this.#cronTime = this.#cronTime.everySaturday(...arguments);
    return this;
  }
  everySaturdayAt() {
    this.#cronTime = this.#cronTime.everySaturdayAt(...arguments);
    return this;
  }
  everyWeek() {
    this.#cronTime = this.#cronTime.everyWeek(...arguments);
    return this;
  }
  everyWeekAt() {
    this.#cronTime = this.#cronTime.everyWeekAt(...arguments);
    return this;
  }
  everyWeekDay() {
    this.#cronTime = this.#cronTime.everyWeekDay(...arguments);
    return this;
  }
  everyWeekDayAt() {
    this.#cronTime = this.#cronTime.everyWeekDayAt(...arguments);
    return this;
  }
  everyWeekend() {
    this.#cronTime = this.#cronTime.everyWeekend(...arguments);
    return this;
  }
  everyWeekendAt() {
    this.#cronTime = this.#cronTime.everyWeekendAt(...arguments);
    return this;
  }
  everyMonth() {
    this.#cronTime = this.#cronTime.everyMonth(...arguments);
    return this;
  }
  everyMonthOn() {
    this.#cronTime = this.#cronTime.everyMonthOn(...arguments);
    return this;
  }
  everyYear() {
    this.#cronTime = this.#cronTime.everyYear(...arguments);
    return this;
  }
  everyYearIn() {
    this.#cronTime = this.#cronTime.everyYearIn(...arguments);
    return this;
  }
  minutes() {
    this.#cronTime = this.#cronEvery.minutes(...arguments);
    return this;
  }
  hours() {
    this.#cronTime = this.#cronEvery.hours(...arguments);
    return this;
  }
  days() {
    this.#cronTime = this.#cronEvery.days(...arguments);
    return this;
  }
}

export default Scheduler;
