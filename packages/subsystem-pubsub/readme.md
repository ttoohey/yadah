# Yadah PubSub subsystem

A [Yadah](https://www.npm.com/packages/@yadah/yadah) subsystem and Service class
mixin that provides Pub/Sub functionality.

## Basic usage

```js
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
```

## createPubsub(knex)

Creates a Pub/Sub subsystem using the provided `knex` instance for database
connections.

### PubSub.publish(channel, payload, [transactionOrKnex])

Publishes a message to the specified channel.

`payload` must be an array.

The `transactionOrKnex` argument is optional. It allows publishing messages
in a transaction; if the transaction is aborted the message will not be sent.
If not set the `knex` instance provided in the constructor will be used.

Returns a `Promise` that resolves when the database query is complete.

### PubSub.subscribe(channel)

Subscribes to the specified channel.

Returns a `Readable` object stream to asynchronously read messages from the
channel.

### PubSub.unsubscribe(stream)

Ends the subscription stream.

Returns a `Promise` that resolves when the stream has closed and cleanup
performed.

### PubSub.unlisten()

Closes all subscriptions.

Returns a `Promise` that resolves when the stream

## PubSubMixin

The `PubSubMixin` function will add a `.pubsub` property to service classes which
provides access to the pubsub instance, and a `.publish` getter to use
in the `registerListeners()` function.

An error will be thrown if no `pubsub` subsystem is provided during the `boot`
lifecycle.

The `.publish` getter is used setup an event handler to publish events to the
pubsub subsystem.

```js
class MyService extends (Service |> ListenerMixin(%) |> PubSubMixin(%)) {
  registerListeners() {
    super.registerListeners();

    this.publish.on("example");
  }
}
```

The `.publish` getter returns an object that allows defining how to handle an
event in a fluent manner. The modifiers are:

### .publish.on(eventName, ...)

The `.on` modifier is used to list event names that will be published.

### .publish.map(callback)

The `.map` modifier is used to transform and filter the message payload. The
payload will be the event arguments by default, but may be altered by supplying
a callback function to `.map`. The callback should return an array containing
data to publish as the message payload, or a non-array (typically `null` or
`undefined`) to filter the event and not publish a message.

```js
// only broadcast messages when the `broadcast` argument is true
// also, only publish the message in the payload
this.publish.map((message, broadcast) => (broadcast ? [message] : null));
```

### .publish.id(id)

The `.id` modifier is used to override the default channel. This allows
controlling the channel in cases where that is required.

By default, the channel will be the service class constructor name. If the `.on`
modifier is used, the channel will have the event name as a suffix.

`.id` accepts a callback with signature `(eventName, id) => channel` allowing
dynamic construction of the channel. This can be useful when using the same
code for multiple events, like

```js
this.publish
  .on("ev1", "ev2", "ev3")
  .id((eventName, id) => `${id}:${eventName}`);
```

### .publish

The final value is a function suitable to be used in an event handler.

```js
// the following are equivalient
this.on("eventName", this.publish.id("EVENT"));
this.publish.on("eventName").id("EVENT");
```
