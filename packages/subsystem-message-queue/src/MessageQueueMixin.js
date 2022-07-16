import { Domain } from "@yadah/data-manager";
import { dedupe, pipe } from "@yadah/mixin";
import ListenerMixin from "@yadah/domain-listener";
import { TransactionMixin } from "@yadah/subsystem-knex";
import { ContextMixin } from "@yadah/subsystem-context";
import assert from "node:assert";

function MessageQueueMixin(superclass) {
  const mixins = pipe(
    superclass,
    ContextMixin,
    ListenerMixin,
    TransactionMixin
  );
  return class MessageQueue extends mixins {
    /**
     * MessageQueue subsystem instance
     *
     * @type {object}
     */
    #mq;

    constructor({ mq, ...subsystems }) {
      assert(mq, `"mq" subsystem must be provided`);
      super(subsystems);
      this.#mq = mq;
    }

    get mq() {
      return this.#mq;
    }

    get queue() {
      const state = {
        id: null,
        map: (...args) => args,
        onList: [],
      };
      const queue = (handler) => {
        const id = `${this.constructor.name}.${handler.name}`;
        const taskId =
          state.id instanceof Function ? state.id(id) : state.id || id;
        this.mq.taskList[taskId] = handler.bind(this);
        const eventHandler = (...args) => {
          const payload = state.map(...args);
          if (!Array.isArray(payload)) {
            return;
          }
          return this.context(() =>
            this.mq.send(taskId, payload, this.transactionOrKnex)
          );
        };
        state.onList.forEach(([domain, eventName]) =>
          domain.on(eventName, eventHandler)
        );
        return eventHandler;
      };
      queue.map = (map) => {
        const _map = state.map;
        state.map = (...args) =>
          pipe(_map(...args), (x) => (Array.isArray(x) ? map(...x) : x));
        return queue;
      };
      queue.id = (id) => {
        state.id = id;
        return queue;
      };
      queue.on = (...args) => {
        const isDomain = args[0] instanceof Domain;
        const domain = isDomain ? args[0] : this;
        const eventNames = isDomain ? args.slice(1) : args;
        state.onList = [
          ...state.onList,
          ...eventNames.map((eventName) => [domain, eventName]),
        ];
        return queue;
      };
      queue.do = queue;
      return queue;
    }
  };
}

export default dedupe(MessageQueueMixin);
