import ScheduleMixin from "./ScheduleMixin.js";
import Scheduler from "./Scheduler.js";

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

  async start() {
    if (this.running) {
      await this.stop();
    }
    for (const scheduler of this.schedulers) {
      const [id, job] = await scheduler;
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
  }

  async updateJob(name, job, status, exit) {
    const knex = this.knex;
    const schema = this.schema;
    const key = { name };
    const data = {
      [status]: job.lastDate(),
      next: status === "stopped" ? null : job.nextDate()?.toJSDate(),
      exit_code: typeof exit?.code === "number" ? exit.code : null,
      status: status,
      message: exit?.message || null,
    };
    await knex(`${schema}.jobs`).where(key).update(data);
  }

  async migrate() {
    const knex = this.knex;
    const schema = this.schema;
    await knex.raw(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await knex.raw(`
      CREATE TABLE IF NOT EXISTS "${schema}".jobs (
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
      )`);
  }
}
