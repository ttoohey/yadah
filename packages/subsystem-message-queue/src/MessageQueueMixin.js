import { dedupe, pipe } from "@yadah/mixin";
import ListenerMixin from "@yadah/domain-listener";
import { TransactionMixin } from "@yadah/subsystem-knex";
import { ContextMixin } from "@yadah/subsystem-context";
import assert from "node:assert";
import Queue from "./Queue.js";

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
      const domain = this;
      const mq = this.#mq;
      return new Queue(domain, mq);
    }
  };
}

export default dedupe(MessageQueueMixin);
