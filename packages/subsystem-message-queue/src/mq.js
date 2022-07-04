import { run, makeWorkerUtils, Logger } from "graphile-worker";

class MessageQueue {
  knex;
  taskList = {};

  constructor(options) {
    this.context = options.context;
    this.logger = new Logger((scope) => {
      return (level, message, meta) =>
        options.logger.log({ level, message, ...meta, scope });
    });
  }

  async transaction(callback) {
    const result = await callback(this);
    return result;
  }

  async send(taskId, payload) {
    const trx = this.context?.get("transaction") || this.knex;
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
    const pollInterval = 60000;
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

export default function createMessageQueue(options) {
  const mq = new MessageQueue(options);
  mq.knex = options.knex;
  return mq;
}
