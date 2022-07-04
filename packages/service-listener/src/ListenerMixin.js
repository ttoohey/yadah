import dedupe from "@yadah/dedupe-mixin";
import { PubSubMixin } from "@yadah/subsystem-pubsub";
import camelcase from "camelcase";

function ListenerMixin(superclass) {
  const mixins = superclass |> PubSubMixin(%);
  return class Listener extends mixins {
    boot() {
      super.boot(...arguments);
      this.registerListeners();
    }
    async shutdown() {
      await super.shutdown();
      this.removeAllListeners();
    }

    /**
     * hook for derived classes to register event listeners
     * this is called during the boot process after the context has been setup
     * so derived classes will have access to other services and the pubsub
     * and message queue providers
     */
    registerListeners() {}

    /**
     * helper function for setting up event listeners that broadcast data
     * via the pubsub provider
     *
     * @param  {String[]} eventNames list of event names to listen to
     * @param  {String}   channel    the PubSub channel to broadcast to
     * @return {void}
     */
    publish(eventNames, channel = null) {
      eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
      const { pubsub } = this;
      for (const eventName of eventNames) {
        const pubChannel =
          channel || camelcase(`${this.constructor.name}.${eventName}`);
        this.on(eventName, async (...args) =>
          pubsub.publish(pubChannel, ...args)
        );
      }
    }
  };
}

export default ListenerMixin |> dedupe(%);
