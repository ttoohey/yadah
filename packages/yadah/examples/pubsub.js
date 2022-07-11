import createPubSub, { PubSubMixin } from "@yadah/subsystem-pubsub";
import DataManager, { Service } from "@yadah/data-manager";
import ListenerMixin from "@yadah/service-listener";
import createContext from "@yadah/subsystem-context";
import createKnex from "@yadah/subsystem-knex";
import createLogger from "@yadah/subsystem-logger";
import { once } from "node:events";

class MyService extends (Service |> ListenerMixin(%) |> PubSubMixin(%)) {
  registerListeners() {
    // ensure all superclass listeners are registered
    super.registerListeners();

    // This will listen for the "example" event being emitted on the MyService
    // singleton, and re-publish events on channel "myServiceExample"
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

// create and boot services
const dataManager = new DataManager({ context, knex, pubsub });
const services = dataManager.boot({ MyService });

// start services and subscribe to pubsub channel
await dataManager.startup();
const subscription = pubsub.subscribe("myServiceExample");

// `subscription` is a Readable stream. The custom event 'pubsub:ready'
// indicates it is ready to receive messages
subscription.on("pubsub:ready", () => {
  // the "example" event is published to the "myServiceExample" channel.
  services.MyService.emit("example", { data: "example-payload" });
});

// read the first payload from the subscription
const payload = await once(subscription, "data");
logger.info("example payload received", ...payload);
// info: example payload received {timestamp}
// { data: 'example-payload' }

// close the subscription and wait for cleanup
await pubsub.unsubscribe(subscription);

// shutdown pubsub and services
await pubsub.unlisten();
await dataManager.shutdown();
await knex.destroy();
