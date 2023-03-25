import minimatch from "minimatch";
import Scheduler from "./Scheduler.js";
import ScheduleMixin from "./ScheduleMixin.js";

const thenable = (it) => ({
  async then(resolve, reject) {
    try {
      const result = [];
      for await (const data of it()) {
        result.push(data);
      }
      resolve(result);
    } catch (err) {
      reject(err);
    }
  },
  [Symbol.asyncIterator]: it,
});

export default class Schedule {
  schedulers = new Set();
  jobs = new Set();
  eventHandlers = [];
  running = false;

  constructor(knex, { schema = "schedule" } = {}) {
    this.knex = knex;
    this.schema = schema;
    return new Proxy(this, {
      get(target, prop) {
        const reflected = Reflect.get(...arguments);
        if (reflected !== undefined) {
          return reflected;
        }
        const scheduler = new Scheduler();
        const schedulerProp = scheduler[prop];
        if (schedulerProp === undefined) {
          return undefined;
        }
        target.schedulers.add(scheduler);
        target.eventHandlers.forEach(([eventName, handler]) =>
          scheduler.on(eventName, handler)
        );
        scheduler.on("active", (id, job) =>
          target.updateJob(id, job, "active")
        );
        scheduler.on("idle", (id, code, job) =>
          target.updateJob(id, job, "idle", { code })
        );
        scheduler.on("error", (err, id, job) =>
          target.updateJob(id, job, "error", err)
        );
        if (schedulerProp instanceof Function) {
          return schedulerProp.bind(scheduler);
        }
        return schedulerProp;
      },
    });
  }

  register(services) {
    for (const service of services) {
      if (!ScheduleMixin.extends(service.constructor)) {
        continue;
      }
      service.registerSchedule();
    }
  }

  async start(...args) {
    if (this.running) {
      await this.stop();
    }
    const hasArgs = args.length > 0;
    const patterns = hasArgs ? [args].flat() : undefined;
    const shouldStart = hasArgs
      ? (value) =>
          patterns.some(
            (pattern) =>
              (typeof value === "string" &&
                typeof pattern === "string" &&
                minimatch(value, pattern)) ||
              value === pattern
          )
      : (value) => value === undefined;
    for (const scheduler of this.schedulers) {
      if (!shouldStart(scheduler.getName())) {
        continue;
      }
      const [id, job] = scheduler.boot();
      const skipped = await this.createJob(id, job);
      scheduler.start(skipped);
    }
    this.running = true;
  }

  async stop() {
    for (const scheduler of this.schedulers) {
      try {
        const [id, job] = scheduler.stop();
        await this.updateJob(id, job, "stopped");
      } catch (e) {
        continue;
      }
    }
    this.running = false;
    this.schedulers.clear();
  }

  on(eventName, handler) {
    this.schedulers.forEach((s) => s.on(eventName, handler));
    this.eventHandlers.push([eventName, handler]);
    return this;
  }

  async createJob(name, job) {
    try {
      const knex = this.knex;
      const schema = this.schema;
      const key = { name };
      const data = {
        started: new Date(),
        next: job.nextDate()?.toJSDate(),
        exit_code: null,
        status: "idle",
        message: null,
      };
      const res = await knex(`${schema}.jobs`).where(key);
      if (res.length > 0) {
        await knex(`${schema}.jobs`).where(key).update(data);
        return res[0].next && res[0].next.valueOf() < Date.now();
      } else {
        await knex(`${schema}.jobs`).insert({ ...key, ...data });
        return false;
      }
    } catch (cause) {
      throw new Error("Schedule.createJob() failed", { cause });
    }
  }

  async updateJob(name, job, status, exit) {
    try {
      const knex = this.knex;
      if (!knex.client.pool || knex.client.pool.destroyed) {
        return;
      }
      const schema = this.schema;
      const key = { name };
      const data = {
        [status]: new Date(),
        next: status === "stopped" ? null : job.nextDate()?.toJSDate(),
        exit_code: typeof exit?.code === "number" ? exit.code : null,
        status: status,
        message: exit?.message || null,
      };
      await knex(`${schema}.jobs`).where(key).update(data);
    } catch (cause) {
      throw new Error("Schedule.updateJob() failed", { cause });
    }
  }

  list() {
    const knex = this.knex;
    const schema = this.schema;
    const stats = Array.from(this.schedulers).map((scheduler) =>
      scheduler.stat()
    );
    const generator = async function* () {
      try {
        for await (const job of knex(`${schema}.jobs`).stream()) {
          const stat = stats.find((stat) => stat.id === job.name);
          if (!stat) {
            continue;
          }
          const data = { ...stat, ...job };
          delete data.id;
          yield data;
        }
      } catch (cause) {
        throw new Error("Schedule.list() failed", { cause });
      }
    };
    return thenable(generator);
  }

  async find(name) {
    try {
      const knex = this.knex;
      const schema = this.schema;
      const schedulers = this.schedulers;
      for (const scheduler of schedulers) {
        const { id, ...stat } = scheduler.stat();
        if (id !== name) {
          continue;
        }
        const res = await knex(`${schema}.jobs`).where({ name });
        return { ...stat, ...res[0] };
      }
    } catch (cause) {
      throw new Error("Schedule.find() failed", { cause });
    }
  }

  async migrate() {
    const knex = this.knex;
    const schema = this.schema;
    await knex.raw(`CREATE SCHEMA IF NOT EXISTS ??`, [schema]);
    await knex.raw(
      `
      CREATE TABLE IF NOT EXISTS ?? (
        name text,
        started timestamptz,
        stopped timestamptz,
        active timestamptz,
        idle timestamptz,
        error timestamptz,
        next timestamptz,
        exit_code int,
        status text,
        message text
      )`,
      [`${schema}.jobs`]
    );
  }
}
