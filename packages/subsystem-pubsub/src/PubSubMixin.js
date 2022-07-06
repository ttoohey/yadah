import dedupe from "@yadah/dedupe-mixin";
import CriticalSectionMixin from "@yadah/service-critical-section";
import ListenerMixin from "@yadah/service-listener";
import camelcase from "camelcase";
import assert from "node:assert";
import PubSubAgent from "./PubSub.js";

function PubSubMixin(superclass) {
  const mixins = superclass |> CriticalSectionMixin(%) |> ListenerMixin(%);
  return class PubSub extends mixins {
    /**
     * PubSub subsystem instance
     */
    pubsub = null;

    constructor({ pubsub, ...subsystems }) {
      assert(
        pubsub instanceof PubSubAgent,
        `"pubsub" subsystem must be provided`
      );
      super(subsystems);
      this.pubsub = pubsub;
    }

    get publish() {
      const state = {
        id: null,
        map: (...args) => args,
      };
      const id = this.constructor.name;
      const setChannel = (name) => {
        if (state.id instanceof Function) {
          state.channel = state.id(name, id);
        } else if (state.id === null) {
          state.channel = camelcase(`${id}_${name}`);
        } else {
          state.channel = state.id;
        }
      };
      const handler = (...args) => {
        const payload = state.map(...args);
        if (!Array.isArray(payload)) {
          return;
        }
        const channel = state.id || state.channel || id;
        const trx = this.context.get("transaction");
        this.criticalSection(this.pubsub.publish(channel, payload, trx));
      };
      handler.map = (map) => {
        const _map = state.map;
        state.map = (...args) =>
          _map(...args) |> (Array.isArray(%) ? map(...%) : %);
        return handler;
      };
      handler.id = (id) => {
        state.id = id;
        return handler;
      };
      handler.on = (...eventNames) => {
        for (const eventName of eventNames) {
          this.on(eventName, (...args) => {
            setChannel(eventName);
            return handler(...args);
          });
        }
        return handler;
      };
      return handler;
    }
  };
}

export default PubSubMixin |> dedupe(%);
