import { run, makeWorkerUtils, Logger } from "graphile-worker";
import DuckPgPool from "./DuckPgPool.js";
import EventEmitter from "node:events";
import assert from "node:assert";
import { decodeJob, getChildKeys, runAfter } from "./helpers.js";

/**
 * @typedef {Awaited<ReturnType<run>>} Runner
 * @typedef {Parameters<run>[0]} RunnerOptions
 * @typedef {import("knex").Knex} Knex
 * @typedef {Required<RunnerOptions["taskList"]>} TaskList
 * @typedef {() => void} EventHandler
 * @typedef {Record<string,EventHandler} EventHandlerCollection
 * @typedef {Record<string,EventHandlerCollection} EventHandlerList
 * @typedef {import("graphile-worker").Job} Job
 */

export default class MessageQueue extends EventEmitter {
  /** @type {Runner | undefined} */
  #runner;

  /** @type {RunnerOptions} */
  #runnerOptions = {
    concurrency: 1,
    noPreparedStatements: false,
    pollInterval: 2000,
    schema: "graphile_worker",
  };

  /** @type {Knex} */
  knex;

  /** @type {TaskList} */
  taskList = {};

  /** @type {EventHandlerList} */
  eventHandlerList = {};

  constructor(options) {
    const { knex, logger, ...runnerOptions } = options;
    super();
    assert.equal(
      options.knex.client.config.client,
      "postgresql",
      "mq: knex client must use postgresql adapter"
    );
    this.knex = knex;
    this.logger = new Logger((scope) => (level, message, meta) => {
      logger.syslog.log({
        level,
        message: `mq: ${message}`,
        ...meta,
        scope,
      });
    });
    Object.assign(this.#runnerOptions, runnerOptions);
  }

  async start() {
    if (this.#runner) {
      throw new Error("MessageQueue has already started");
    }
    const knex = this.knex;
    const logger = this.logger;
    const pgPool = new DuckPgPool(knex.client.pool);
    const worker = await makeWorkerUtils({ pgPool });
    await worker.migrate();
    await worker.release();
    const taskList = this.taskList;
    const noHandleSignals = true;
    this.#runner = await run({
      ...this.#runnerOptions,
      pgPool,
      taskList,
      logger,
      noHandleSignals,
      events: this,
    });

    const eventNames = getChildKeys(this.eventHandlerList);
    for (const eventName of eventNames) {
      this.on(eventName, (data) => {
        const taskId = data.job["task_identifier"];
        const handler = this.eventHandlerList[taskId]?.[eventName];
        if (!handler) {
          return;
        }
        const job = decodeJob(data.job);
        return handler(job, data.error);
      });
    }
  }

  async stop() {
    await this.#runner?.stop();
    this.#runner = undefined;
  }

  /**
   * @param {string} taskId - ID of the task
   * @param {Object} options - Options
   * @param {import("knex").Knex} knexTransaction?
   */
  async send(taskId, { key, payload, runAt, queueName }, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const jobs = await trx
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
      .then((result) => result.rows.map(decodeJob))
      .catch((cause) => {
        throw new Error("graphile_worker.add_job failed", { cause });
      });
    return jobs[0];
  }

  /**
   *
   * @param {string} key
   * @param {Knex} knexTransaction
   * @returns {Job}
   */
  async remove(key, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const jobs = await trx
      .raw(
        `WITH jobs AS (
          SELECT (graphile_worker.remove_job(?))
        ) SELECT (remove_job).* FROM jobs`,
        [key]
      )
      .then((result) => result.rows.map(decodeJob))
      .catch((cause) => {
        throw new Error("graphile_worker.remove_job failed", { cause });
      });
    return jobs[0];
  }

  async complete(ids, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const jobs = await trx
      .raw(
        `WITH jobs AS (
          SELECT (graphile_worker.complete_jobs(?))
        ) SELECT (complete_jobs).* FROM jobs`,
        [[ids].flat()]
      )
      .then((result) => result.rows.map(decodeJob))
      .catch((cause) => {
        throw new Error("graphile_worker.complete_jobs failed", { cause });
      });
    return Array.isArray(ids) ? jobs : jobs[0];
  }

  async permanantlyFail(ids, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const jobs = await trx
      .raw(
        `WITH jobs AS (
          SELECT (graphile_worker.permanently_fail_jobs(?))
        ) SELECT (permanently_fail_jobs).* FROM jobs`,
        [[ids].flat()]
      )
      .then((result) => result.rows.map(decodeJob))
      .catch((cause) => {
        throw new Error("graphile_worker.permanently_fail_jobs failed", {
          cause,
        });
      });
    return Array.isArray(ids) ? jobs : jobs[0];
  }

  async reschedule(ids, { runAt } = {}, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const jobs = await trx
      .raw(
        `WITH jobs AS (
          SELECT (graphile_worker.reschedule_jobs(?, run_at := ?, attempts := 0))
        ) SELECT (reschedule_jobs).* FROM jobs`,
        [
          [ids].flat(),
          typeof runAt === "object" ? runAt : new Date(runAt || Date.now()),
        ]
      )
      .then((result) => result.rows.map(decodeJob))
      .catch((cause) => {
        throw new Error("graphile_worker.reschedule_jobs failed", {
          cause,
        });
      });
    return Array.isArray(ids) ? jobs : jobs[0];
  }

  /**
   * List jobs
   *
   * @param {Knex|undefined} knexTransaction
   */
  jobs(knexTransaction) {
    const trx = knexTransaction || this.knex;
    const query = trx("graphile_worker.jobs");
    runAfter(query, (rows) => rows.map(decodeJob));
    return query;
  }

  /**
   * Get a job by ID
   *
   * @param {number|bigint|string} id Job ID to lookup
   * @param {Knex|undefined} knexTransaction
   */
  job(id, knexTransaction) {
    const trx = knexTransaction || this.knex;
    const query = trx("graphile_worker.jobs").where({ id });
    runAfter(query, ([row]) => decodeJob(row));
    return query;
  }
}
