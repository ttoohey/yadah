import { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";
import { decodeJob, decodeJobPayload, encodeJobPayload } from "./helpers.js";

const MQ = Symbol("MQ");

export default class Queue {
  #domain;
  #mq;
  #id = null;
  #queueName = null;
  #map = (...args) => args;
  #onList = [];
  #runAt = () => new Date();
  #getKey = () => null;
  #onJobCreate;
  #onJobStart;
  #onJobSuccess;
  #onJobError;
  #onJobFailed;
  #onJobComplete;

  #resolve(resolver, args) {
    if (resolver instanceof Function) {
      return resolver.apply(this.#domain, args);
    }
    return resolver;
  }

  constructor(domain, mq) {
    this.#domain = domain;
    this.#mq = mq;
  }

  on(...args) {
    const isDomain = args[0] instanceof Domain;
    const domain = isDomain ? args[0] : this.#domain;
    const eventNames = isDomain ? args.slice(1) : args;
    this.#onList = [
      ...this.#onList,
      ...eventNames.map((eventName) => [domain, eventName]),
    ];
    return this;
  }

  id(id) {
    this.#id = id;
    return this;
  }

  to(queueName) {
    this.#queueName = queueName;
    return this;
  }

  at(runAt) {
    this.#runAt = runAt;
    return this;
  }

  key(getKey) {
    this.#getKey = getKey;
    return this;
  }

  map(map) {
    const _map = this.#map;
    this.#map = (...args) =>
      pipe(_map(...args), (x) => (Array.isArray(x) ? map(...x) : x));
    return this;
  }

  onJobStart(onJobStart) {
    this.#onJobStart = onJobStart;
    return this;
  }
  onJobSuccess(onJobSuccess) {
    this.#onJobSuccess = onJobSuccess;
    return this;
  }
  onJobError(onJobError) {
    this.#onJobError = onJobError;
    return this;
  }
  onJobFailed(onJobFailed) {
    this.#onJobFailed = onJobFailed;
    return this;
  }
  onJobComplete(onJobComplete) {
    this.#onJobComplete = onJobComplete;
    return this;
  }

  do(handler) {
    const domain = this.#domain;
    const mq = this.#mq;
    const id = `${domain.constructor.name}.${handler?.name}`;
    const taskId = this.#resolve(this.#id || id, [id]);
    const taskList = mq.taskList;

    if (handler) {
      taskList[taskId] = (payload, helpers) => {
        const args = decodeJobPayload(payload);
        this.job = decodeJob(helpers.job);
        return handler.apply(domain, args);
      };
    }

    const eventHandler = (...args) =>
      domain.context(async () => {
        try {
          const mappedArgs = await this.#map(...args);
          if (!Array.isArray(mappedArgs)) {
            return;
          }
          const payload = encodeJobPayload(mappedArgs);
          const [runAt, key, queueName] = await Promise.all([
            this.#resolve(this.#runAt, args),
            this.#resolve(this.#getKey, args),
            this.#resolve(this.#queueName, args),
          ]);
          const trx = domain.transactionOrKnex;
          if (handler) {
            const job = await mq.send(
              taskId,
              { key, payload, queueName, runAt },
              trx
            );
            this.job = job;
          } else if (key) {
            await mq.remove(key, trx);
          }
        } catch (cause) {
          throw new Error("Event handler error", { cause });
        }
      });

    this.#onList.forEach(([domain, eventName]) =>
      domain.on(eventName, eventHandler)
    );

    const withContext = (handler) =>
      handler
        ? (job, error) => {
            return domain.context(() => {
              this.job = job;
              this.error = error;
              return handler.call(domain, ...job.payload);
            });
          }
        : undefined;

    mq.eventHandlerList[taskId] = {
      "job:start": withContext(this.#onJobStart),
      "job:success": withContext(this.#onJobSuccess),
      "job:error": withContext(this.#onJobError),
      "job:failed": withContext(this.#onJobFailed),
      "job:complete": withContext(this.#onJobComplete),
    };

    return eventHandler;
  }

  /**
   * gets the current job from the promise chain context
   */
  get job() {
    const domain = this.#domain;
    return domain.context.get(MQ)?.job;
  }

  /**
   * sets the current job in the promise chain context, creating a new context
   * reference if necessary
   */
  set job(job) {
    const domain = this.#domain;
    const ref = domain.context.get(MQ) || {};
    domain.context.set(MQ, ref);
    ref.job = job;
  }

  /**
   * gets the current error from the promise chain context
   */
  get error() {
    const domain = this.#domain;
    return domain.context.get(MQ)?.error;
  }

  /**
   * sets the current error in the promise chain context, creating a new
   * context reference if necessary
   */
  set error(error) {
    const domain = this.#domain;
    const ref = domain.context.get(MQ) || {};
    domain.context.set(MQ, ref);
    ref.error = error;
  }
}
