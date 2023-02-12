import { run, makeWorkerUtils, Logger } from "graphile-worker";
import DuckPgPool from "./DuckPgPool.js";
import EventEmitter from "node:events";
import assert from "node:assert";

export default class MessageQueue extends EventEmitter {
  knex;
  taskList = {};

  constructor(options) {
    super();
    assert.equal(
      options.knex.client.config.client,
      "postgresql",
      "mq: knex client must use postgresql adapter"
    );
    this.knex = options.knex;
    this.logger = new Logger((scope) => (level, message, meta) => {
      options.logger.syslog.log({
        level,
        message: `mq: ${message}`,
        ...meta,
        scope,
      });
    });
  }

  async send(taskId, { key, payload, runAt, queueName }, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const result = await trx
      .raw(
        `WITH jobs AS (
          SELECT (graphile_worker.add_job(?, payload := ?, run_at := ?, queue_name := ?, job_key := ?))
        ) SELECT (add_job).* FROM jobs`,
        [
          taskId,
          JSON.stringify(payload),
          typeof runAt === "object" ? runAt : new Date(runAt),
          queueName || "primary",
          key || null,
        ]
      )
      .catch((cause) => {
        throw new Error("graphile_worker.add_job failed", { cause });
      });
    return result.rows[0];
  }

  async remove(key, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const result = await trx
      .raw(`SELECT graphile_worker.remove_job(?)`, [key])
      .catch((cause) => {
        throw new Error("graphile_worker.remove_job failed", { cause });
      });
    return result.rows[0];
  }

  async start() {
    if (this.runner) {
      throw new Error("MessageQueue has already started");
    }
    const knex = this.knex;
    const logger = this.logger;
    const pgPool = new DuckPgPool(knex.client.pool);
    const worker = await makeWorkerUtils({ pgPool });
    await worker.migrate();
    await worker.release();
    const taskList = Object.fromEntries(
      Object.entries(this.taskList).map(([taskId, handler]) => [
        taskId,
        (payload, helpers) => handler(helpers, ...payload),
      ])
    );
    const noHandleSignals = true;
    const pollInterval = 2000;
    this.runner = await run({
      pgPool,
      taskList,
      logger,
      noHandleSignals,
      pollInterval,
      events: this,
    });
  }

  async stop() {
    if (!this.runner) {
      return;
    }
    await this.runner.stop();
    delete this.runner;
  }

  jobs(knexTransaction) {
    const trx = knexTransaction || this.knex;
    return trx("graphile_worker.jobs");
  }
}
