import { run, makeWorkerUtils, Logger } from "graphile-worker";
import DuckPgPool from "./DuckPgPool.js";
import EventEmitter from "node:events";
import assert from "node:assert";

class MessageQueue extends EventEmitter {
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
    this.logger = new Logger((scope) => {
      return (level, message, meta) =>
        options.logger.log({
          level,
          message: `mq: ${message}`,
          ...meta,
          scope,
        });
    });
  }

  async send(taskId, payload, knexTransaction) {
    const trx = knexTransaction || this.knex;
    await trx.raw(
      "SELECT graphile_worker.add_job(?, payload := ?, queue_name := ?)",
      [taskId, JSON.stringify(payload), "primary"]
    );
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
        (payload) => handler(...payload),
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
}

export default function createMessageQueue(knex, logger) {
  return new MessageQueue({ knex, logger });
}
