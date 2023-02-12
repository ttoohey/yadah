# Yadah Message Queue subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides a message/job queue using
[graphile-worker](https://www.npmjs.com/package/graphile-worker).

## Basic usage

```js
// MyDomain.js
import createMessageQueue, {
  MessageQueueMixin,
} from "@yadah/subsystem-message-queue";
import DataManager, { Domain } from "@yadah/data-manager";
import ListenerMixin from "@yadah/domain-listener";
import createContext from "@yadah/subsystem-context";
import createKnex from "@yadah/subsystem-knex";
import createLogger, { LoggerMixin } from "@yadah/subsystem-logger";
import { pipe } from "@yadah/mixin";

const mixins = pipe(Domain, ListenerMixin, LoggerMixin, MessageQueueMixin);

class MyDomain extends mixins {
  registerListeners() {
    // ensure all superclass listeners are registered
    super.registerListeners();

    // This will listen for the "example" event being emitted on the MyDomain
    // singleton, and create a message queue task named "MyDomain.handleExample".
    // The background service will handle the task by calling the `handleExample`
    // method
    this.queue.on("example").do(this.handleExample);
  }

  handleExample(...payload) {
    this.logger.info("example event handled", ...payload);
  }
}

export default MyDomain;
```

```js
import MyDomain from "./MyDomain.js";

// create subsystems
const context = createContext();
const knex = createKnex({
  client: "postgresql",
  connection: process.env.DATABASE_URL,
});
const logger = createLogger({ pretty: true });
const mq = createMessageQueue(knex, logger);

// create and boot domains
const dataManager = new DataManager({ context, knex, logger, mq });
const domains = dataManager.boot({ MyDomain });

// start domains and message queue
await dataManager.startup();
await mq.start();

// the 'example' event is handled by the `handleExample` event handler.
// normally this would be done by a separate process so that the work of
// creating a task and processing the task are done by separate workers
domains.MyDomain.emit("example", { data: "example-payload" });
// info: example event handled {timestamp}
// { data: 'example-payload' }

// shutdown message queue and domains
await mq.stop();
await dataManager.shutdown();
await knex.destroy();
```

## createMessageQueue(knex, logger)

Creates a message-queue (`mq`) subsystem.

## MessageQueueMixin

The `MessageQueueMixin` function will add a `.mq` property to domain classes which
provides access to the message-queue instance, and a `.queue` getter to use
in the `registerListeners()` function.

An error will be thrown if no `mq` subsystem is provided during the `boot`
lifecycle.

The `.queue` getter is used to setup an event handler to create and handle
message queue tasks.

```js
class MyDomain extends mixins {
  registerListeners() {
    super.registerListeners();

    this.queue.on("example").do(this.handleExample);
  }

  handleExample() {
    // code to handle the event
  }
}
```

The `.queue` getter returns an object that allows defining how to handle an
event in a fluent manner. The modifiers are:

### .queue.do(callback) or .queue.do()

_Note: the `.do()` method is not a modifier like other methods. It must be the final method in a fluent chain_

Returns an event handler suitable for attaching to an `EventEmitter` via
`EventEmitter.on()`.

If the `.on` modifier was used, the handler will be attached to the domain class
and the return value can be ignored.

The following are equivalent:

```js
this.on("example", this.queue.do(this.handleExample));
this.queue.on("example").do(this.handleExample);
```

If no callback is provided `.do()` will remove any job in the queue
with a key matching a key set using the `.key()` modifier.

```js
this.queue
  .on("delete")
  .key((data) => `data:${data.id}`)
  .do(); // remove job
```

### .queue.on([Domain,] eventName, ...)

The `.on` modifier is used to list event names that tasks will be created for.

To attach events to a different Domain class, pass it as the first argument.

### .queue.map((...args) => [...args])

The `.map` modifier is used to transform and filter the message payload. The
payload will be the event arguments by default, but may be altered by supplying
a callback function to `.map`. The callback should return an array containing
data to send as the message payload, or a non-array (typically `null` or
`undefined`) to filter the event and not send a message.

The callback may return a promise.

```js
// # Example
// only send messages when the `public` argument is true
// also, only send the message in the payload
this.queue
  .on(eventName)
  .map((message, public) => (public ? [message] : null))
  .do(this.handleExample);
```

### .queue.id(string) or .queue.id((id) => string)

The `.id` modifier is used to override the default "task id". This allows
controlling the task id in cases where that is required. The default task id
is created from the domain class name and handler name (eg. "MyDomain.handleExample")

`.id` accepts a callback which accepts the default task id value to transform to
a new value. This can be useful when using the same code for multiple events, like

```js
["ev1", "ev2", "ev3"].forEach((eventName) => {
  this.queue
    .on(eventName)
    .id((id) => `${id}:${eventname}`)
    .do(this.handleEv);
});
```

### .queue.to(string) or .queue.to((...args) => string)

Sets the queue jobs will be sent to. Jobs sent to a named queue will be
executed in serial.

`.to` accepts a callback which accepts the event arguments. The callback must
return the name of the queue for the event to be sent to.

The callback may return a promise.

### .queue.at(date) or .queue.at((...args) => date)

Sets the time at which the job will be run.

The value should be something that is acceptable to `new Date()` (eg. a string,
number, or `Date` instance). It may also be a `Knex.raw` instance which
represents a database `timestamptz` value.

`.at` accepts a callback which accepts the event arguments. The callback must
return a value representing the time the job will be run.

The callback may return a promise.

```js
this.queue.at(() => new Date() + 3600 * 1000).do(this.handleExample);
this.queue.at(knex.raw(`now() + '1 hour'`)).do(this.handleExample);
this.queue.at((data) => data.timestampField).do(this.handleExample);
```

### .queue.key(string) or .queue.key((...args) => string)

Sets the job key which allows replacing or deleting a job that is in the
queue.

`.key` accepts a callback which accepts the event arguments. The callback must
return the key.

The callback may return a promise.

```js
this.queue
  .key((data) => `my-custom-key:${data.type}:${data.id}`)
  .do(this.handleExample);
```

Using a key is useful when combined with `.at()` to create a deferred job which
may be updated.

### .queue.onJob(callback)

Register a callback to run when a job is created. This provides access to the
data related to the job.

```js
this.queue
  .on(eventName)
  .onJob((job) => console.log(`Job #${job.id} created`))
  .do(this.handleExample);
```

The callback is executed in the context of the event emitter.

The callback may return a promise.

### .queue.onRun(callback)

Register a callback to run when a job is about to run. The provides access to
the data related to the job.

```js
this.queue
  .on(eventName)
  .onRun((job) => console.log(`Job #${job.id} starting`))
  .do(this.handleExample);
```

The callback is executed in the context of the job handler.

The callback may return a promise.
