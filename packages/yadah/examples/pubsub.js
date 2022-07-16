import createPubSub, { PubSubMixin } from "@yadah/subsystem-pubsub";
import DataManager, { Domain } from "@yadah/data-manager";
import ListenerMixin from "@yadah/domain-listener";
import createContext from "@yadah/subsystem-context";
import createKnex from "@yadah/subsystem-knex";
import createLogger from "@yadah/subsystem-logger";
import { pipe } from "@yadah/mixin";
import { once } from "node:events";

class MyDomain extends pipe(Domain, ListenerMixin, PubSubMixin) {
  registerListeners() {
    // ensure all superclass listeners are registered
    super.registerListeners();

    // This will listen for the "example" event being emitted on the MyDomain
    // singleton, and re-publish events on channel "myDomainExample"
    this.publish.on("example");
  }
}

// create subsystems
const context = createContext();
const knex = createKnex({
  client: "postgresql",
  connection: process.env.DATABASE_URL,
});
const logger = createLogger({ pretty: true });
const pubsub = createPubSub(knex);
await pubsub.migrate();

// create and boot domains
const dataManager = new DataManager({ context, knex, pubsub });
const domains = dataManager.boot({ MyDomain });

// start domains and subscribe to pubsub channel
await dataManager.startup();
const subscription = pubsub.subscribe("myDomainExample");

// `subscription` is a Readable stream. The custom event 'pubsub:ready'
// indicates it is ready to receive messages
subscription.on("pubsub:ready", () => {
  // the "example" event is published to the "myDomainExample" channel.
  domains.MyDomain.emit("example", { data: "example-payload" });
});

// read the first payload from the subscription
const payload = await once(subscription, "data");
logger.info("example payload received", ...payload);
// info: example payload received {timestamp}
// { data: 'example-payload' }

// close the subscription and wait for cleanup
await pubsub.unsubscribe(subscription);

// shutdown pubsub and domains
await pubsub.unlisten();
await dataManager.shutdown();
await knex.destroy();
