import camelcase from "camelcase";
import PromiseTracker from "./PromiseTracker.js";

export default function (Service) {
  return class ServiceListener extends Service {
    #tracker = new PromiseTracker();

    boot() {
      super.boot(...arguments);
      this.registerListeners();
    }
    async shutdown() {
      await this.#tracker.drain();
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

    /**
     * helper function for setting up event listeners that send
     * data via the message queue to a receiver
     *
     * @param  {String[]} eventNames list of event names to listen to
     * @param  {String}   msgName    message queue name to identify the message
     * @param  {Function} receiver   a callback to handle the event payload
     * @return {void}
     */
    queue(eventNames, msgName, receiver) {
      eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
      const { mq } = this;
      if (msgName instanceof Service) {
        const newMsgName = `${msgName.constructor.name}.${receiver.name}`;
        receiver = receiver.bind(msgName);
        msgName = newMsgName;
      }
      mq.on(msgName, receiver);
      for (const eventName of eventNames) {
        this.on(eventName, async (...args) =>
          this.#tracker.watch(mq.send(msgName, ...args))
        );
      }
    }
  };
}
