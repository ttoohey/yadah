# Yadah PubSub subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides Pub/Sub functionality.

## Basic usage

```js
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

A subscription stream may be converted to an `AsyncIterator` using the
`iterator()` method. Calling `.return()` on the iterator will end the stream
(this is equivalent to calling `unsubscribe()` on the stream).

The iterator also has two methods:

- `push(...payload)` - pushes a payload onto the stream
- `map(callback)` - allows to filter and transform the payload

Both methods return an iterator with the same properties.

The `callback` function has signature `(...payload) => payload`. If the callback
returns a non-array value the payload is ignored.

#### Example

```js
import { createKnex } from "@yadah/subsystem-knex";
import { createPubSub } from "@yadah/subsystem-pubsub";

const knex = createKnex({
  client: "postgresql",
  connection: process.env.DATABASE_URL,
});
const pubsub = createPubSub({ knex });

function subscribe(criteria) {
  return pubsub
    .subscribe("MyDomain")
    .iterator()
    .map((value) => {
      // filter out events that don't match the criteria
      if (!isMatch(value, criteria)) {
        return null;
      }
      // return a new payload
      return [value];
    })
    .push(intialValue);
}
```

### PubSub.unsubscribe(stream)

Ends the subscription stream.

Returns a `Promise` that resolves when the stream has closed and cleanup
performed.

### PubSub.unlisten()

Closes all subscriptions.

Returns a `Promise` that resolves when the connection has closed.

## PubSubMixin

The `PubSubMixin` function will add a `.pubsub` property to domain classes which
provides access to the pubsub instance, and a `.publish` getter to use
in the `registerListeners()` function.

An error will be thrown if no `pubsub` subsystem is provided during the `boot`
lifecycle.

The `.publish` getter is used to setup an event handler to publish events to the
pubsub subsystem.

```js
import { pipe } from "@yadah/mixin";

class MyDomain extends pipe(Domain, ListenerMixin, PubSubMixin) {
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
// *Example*
// only broadcast messages when the `broadcast` argument is true
// also, only publish the message in the payload
this.publish.map((message, broadcast) => (broadcast ? [message] : null));
```

### .publish.id(id)

The `.id` modifier is used to override the default channel. This allows
controlling the channel in cases where that is required.

By default, the channel will be the domain class constructor name. If the `.on`
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
