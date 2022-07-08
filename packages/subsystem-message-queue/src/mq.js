import { run, makeWorkerUtils, Logger } from "graphile-worker";

class MessageQueue {
  knex;
  taskList = {};

  constructor(options) {
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
    const logger = this.logger;
    const worker = await makeWorkerUtils({});
    await worker.migrate();
    const taskList = Object.fromEntries(
      Object.entries(this.taskList).map(([taskId, handler]) => [
        taskId,
        (payload) => handler(...payload),
      ])
    );
    const noHandleSignals = true;
    const pollInterval = 3000;
    this.runner = await run({
      taskList,
      logger,
      noHandleSignals,
      pollInterval,
    });
  }

  async stop() {
    await this.runner.stop();
    delete this.runner;
  }
}

export default function createMessageQueue(knex, logger) {
  return new MessageQueue({ knex, logger });
}
