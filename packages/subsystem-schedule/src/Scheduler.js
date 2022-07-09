import EventEmitter from "node:events";
import { CronJob } from "cron";
import cronTime from "cron-time-generator";

class Scheduler extends EventEmitter {
  #cronTime;
  #cronEvery;
  #runOnInit;
  #timeZone;
  #callback;
  #cronJob;
  #thisArg;
  #id;

  constructor() {
    super(...arguments);
    this.#cronTime = null;
    this.#runOnInit = false;
    this.#timeZone = process.env.TZ;
    const self = new Proxy(this, {
      get(target, prop) {
        const reflected = Reflect.get(...arguments);
        if (reflected instanceof Function) {
          return reflected.bind(target);
        }
        if (reflected !== undefined) {
          return reflected;
        }
        const ch = target.#cronTime?.[prop];
        if (ch instanceof Function) {
          return (...args) => {
            target.#cronTime = ch.call(target.#cronTime, ...args);
            return self;
          };
        }
        const fn = cronTime[prop];
        if (fn instanceof Function) {
          return (...args) => {
            target.#cronTime = fn.call(cronTime, ...args);
            return self;
          };
        }
        return fn;
      },
    });
    return self;
  }

  then(resolve, reject) {
    try {
      const self = this;
      const callback = this.#callback;
      const id =
        this.#id instanceof Function
          ? this.#id(callback.name, self.#thisArg?.constructor.name)
          : this.#id ||
            (self.#thisArg ? self.#thisArg.constructor.name + "." : "") +
              (callback.name || "[Anonymous]");
      const job = new CronJob({
        start: false,
        cronTime: this.#cronTime,
        runOnInit: false,
        timeZone: this.#timeZone,
        onTick: async function () {
          try {
            self.emit("active", id, this);
            const code = await callback.bind(self.#thisArg)(this);
            self.emit("idle", id, code, job);
          } catch (error) {
            self.emit("error", error, id, this);
          }
        },
      });
      this.#cronJob = [id, job];
      return resolve(this.#cronJob);
    } catch (err) {
      reject(err);
    }
  }

  start(skipped) {
    const [id, job] = this.#cronJob;
    job.start();
    this.emit("started", id, job);
    if (this.#runOnInit || skipped) {
      job.lastExecution = new Date();
      job.fireOnTick();
    }
  }

  stop() {
    const [id, job] = this.#cronJob;
    job.stop();
    this.emit("stopped", id, job);
    this.#cronJob = undefined;
    return [id, job];
  }

  do(callback) {
    this.#callback = callback;
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

  at(cronTime) {
    this.#cronTime = cronTime;
    return this;
  }
}

export default Scheduler;
