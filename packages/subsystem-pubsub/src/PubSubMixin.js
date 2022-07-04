import dedupe from "@yadah/dedupe-mixin";
import assert from "node:assert";

function PubSubMixin(superclass) {
  return class PubSub extends superclass {
    /**
     * PubSub subsystem instance
     */
    pubsub = null;

    constructor({ pubsub, ...subsystems }) {
      assert(pubsub, `"pubsub" subsystem must be provided`);
      super(subsystems);
      this.pubsub = pubsub;
    }
  };
}

export default PubSubMixin |> dedupe(%);
