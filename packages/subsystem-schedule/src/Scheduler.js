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
  #proxy;
  #name;
  #abortControllers = new Map();

  constructor() {
    super(...arguments);
    this.#cronTime = null;
    this.#runOnInit = false;
    this.#timeZone = process.env.TZ;
    const proxy = new Proxy(this, {
      get(target, prop) {
        if (prop === "onInit") {
          return target[prop];
        }
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
            return proxy;
          };
        }
        const fn = cronTime[prop];
        if (fn instanceof Function) {
          return (...args) => {
            target.#cronTime = fn.call(cronTime, ...args);
            return proxy;
          };
        }
        return fn;
      },
    });
    this.#proxy = proxy.bind(this);
    return proxy;
  }

  boot() {
    try {
      const self = this;
      const callback = this.#callback;
      const id = this.#getId();
      const controllers = this.#abortControllers;
      const job = new CronJob({
        start: false,
        cronTime: this.#cronTime,
        runOnInit: false,
        timeZone: this.#timeZone,
        onTick: async function () {
          try {
            const ac = new AbortController();
            controllers.set(id, ac);
            self.emit("active", id, this);
            const code = await callback.call(self.#thisArg, {
              signal: ac.signal,
              job: this,
            });
            self.emit("idle", id, code, this);
          } catch (error) {
            self.emit("error", error, id, this);
          } finally {
            controllers.delete(id);
          }
        },
      });
      this.#cronJob = [id, job];
      return this.#cronJob;
    } catch (cause) {
      throw new Error("Unable to initialise CronJob", { cause });
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
    const ac = this.#abortControllers.get(id);
    if (ac) {
      ac.abort();
    }
    this.emit("stopped", id, job);
    this.#cronJob = undefined;
    return [id, job];
  }

  do(callback) {
    this.#callback = callback;
    return this.#proxy;
  }

  bindTo(thisArg) {
    this.#thisArg = thisArg;
    return this.#proxy;
  }

  id(id) {
    this.#id = id;
    return this.#proxy;
  }

  get onInit() {
    this.#runOnInit = true;
    return this.#proxy;
  }

  timeZone(timeZone) {
    this.#timeZone = timeZone;
    return this.#proxy;
  }

  at(cronTime) {
    this.#cronTime = cronTime;
    return this.#proxy;
  }

  to(schedulename) {
    this.#name = schedulename;
    return this.#proxy;
  }

  getName() {
    return this.#name;
  }

  #getId() {
    const self = this;
    const callback = this.#callback;
    const id =
      this.#id instanceof Function
        ? this.#id(callback?.name, self.#thisArg?.constructor.name)
        : this.#id ||
          (self.#thisArg ? self.#thisArg.constructor.name + "." : "") +
            (callback?.name || "[Anonymous]");
    return id;
  }

  stat() {
    return {
      id: this.#getId(),
      cron: this.#cronTime,
      timeZone: this.#timeZone,
      schedule: this.#name,
    };
  }
}

export default Scheduler;
