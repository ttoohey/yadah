import { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";

export default class Queue {
  #domain;
  #id = null;
  #queueName = null;
  #map = (...args) => args;
  #onList = [];
  #runAt = () => new Date();
  #getKey = () => null;
  #onJob = null;
  #onRun = null;

  #resolve(resolver, args) {
    if (resolver instanceof Function) {
      return resolver.apply(this.#domain, args);
    }
    return resolver;
  }

  constructor(domain) {
    this.#domain = domain;
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

  onJob(onJob) {
    this.#onJob = onJob;
    return this;
  }

  onRun(onRun) {
    this.#onRun = onRun;
    return this;
  }

  do(handler) {
    const domain = this.#domain;
    const id = `${domain.constructor.name}.${handler?.name}`;
    const taskId = this.#resolve(this.#id || id, [id]);
    if (handler) {
      domain.mq.taskList[taskId] = async ({ job }, ...args) => {
        await this.#resolve(this.#onRun, [job]);
        const result = handler.apply(domain, args);
        return result;
      };
    }
    const eventHandler = (...args) =>
      domain.context(async () => {
        try {
          const payload = await this.#map(...args);
          if (!Array.isArray(payload)) {
            return;
          }
          const [runAt, key, queueName] = await Promise.all([
            this.#resolve(this.#runAt, args),
            this.#resolve(this.#getKey, args),
            this.#resolve(this.#queueName, args),
          ]);
          const trx = domain.transactionOrKnex;
          if (handler) {
            const job = await domain.mq.send(
              taskId,
              { key, payload, queueName, runAt },
              trx
            );
            await this.#resolve(this.#onJob, [job]);
          } else if (key) {
            await domain.mq.remove(key, trx);
          }
        } catch (cause) {
          throw new Error("Event handler error", { cause });
        }
      });
    this.#onList.forEach(([domain, eventName]) =>
      domain.on(eventName, eventHandler)
    );
    return eventHandler;
  }
}
