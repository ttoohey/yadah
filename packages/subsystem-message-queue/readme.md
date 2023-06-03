# Yadah Message Queue subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides a message/job queue using
[graphile-worker](https://www.npmjs.com/package/graphile-worker).

## Basic usage

```js
// MyDomain.js
import { MessageQueueMixin } from "@yadah/subsystem-message-queue";
import DataManager, { Domain } from "@yadah/data-manager";
import ListenerMixin from "@yadah/domain-listener";
import { LoggerMixin } from "@yadah/subsystem-logger";
import { pipe } from "@yadah/mixin";

const mixins = pipe(Domain, ListenerMixin, LoggerMixin, MessageQueueMixin);

class MyDomain extends mixins {
  registerListeners() {
    // ensure all superclass listeners are registered
    super.registerListeners();

    // This will listen for the "example" event being emitted on the MyDomain
    // singleton, and create a message queue job named "MyDomain.handleExample".
    // A background service handles the job by calling the `handleExample`
    // method
    this.mq.on("example").do(this.handleExample);
  }

  handleExample(...payload) {
    this.logger.info("example event handled", ...payload);
  }
}

export default MyDomain;
```

```js
// background.js

import createMessageQueue from "@yadah/subsystem-message-queue";
import createContext from "@yadah/subsystem-context";
import createKnex from "@yadah/subsystem-knex";
import createLogger from "@yadah/subsystem-logger";
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

## `createMessageQueue(knex, logger)`

- `knex` - a Knex instance
- `logger` - a logger instance

Creates a message queue (`mq`) subsystem.

Returns a `MessageQueue` instance.

## `class MessageQueue`

### `MessageQueue.start()`

- Returns `<Promise<void>>`

Starts listening for messages and processing them.

### `MessageQueue.stop()`

- Returns `<Promise<void>>`

Stops listening for messages and resolves when all the in progress jobs are
complete.

### `MessageQueue.send(taskId, options)`

- `taskId` `<string>`
- `options` `<object>`
  - `key` `<string>`
  - `payload` `<any[]>`
  - `runAt` `<Date>` | `<string>` | `<number>` | `<Knex.Raw>`
  - `queueName` `<string>`

Adds or updates a job.

### `MessageQueue.remove(key)`

- `key` `<string>`
- Returns `<Promise<Job>>` | `<undefined>`

Removes the job with the specified `key`.

### `MessageQueue.complete(id)` <br /> `MessageQueue.complete(ids)`

- `id` `<number>` the id of the job
- `ids` `<number>[]` a list of job ids
- Returns `<Promise<Job>>`|`<Promise<Job[]>>` | `<Promise<undefined>>`

Manually completes a job or a list of jobs so that it/they will no longer run.

Returns a single `Job` if a single `id` is provided, or a list of `Jobs` that
were updated if an array was provided. If no job was found then `undefined` is
returned.

### `MessageQueue.permanantlyFail(id, reason)` <br /> `MessageQueue.permanantlyFail(ids, reason)`

- `id` `<number>` the id of the job
- `ids` `<number>[]` a list of job ids
- `reason` `<string>`
- Returns `<Job>`|`<Job[]>`

Manually mark a job or a list of jobs as permanantly failed.

Returns a single `Job` if a single `id` is provided, or a list of `Jobs` that
were updated if an array was provided. If no job was found then `undefined` is
returned.

### `MessageQueue.reschedule(id, runAt)` <br /> `MessageQueue.reschedule(ids, runAt)`

- `id` `<number>` the id of the job
- `ids` `<number>[]` a list of job ids
- `runAt` `<Date>` | `<string>` | `<number>` | `<Knex.Raw>` defaults to 'now'
- Returns `<Promise<Job>>`|`<Promise<Job[]>>` | `<Promise<undefined>>`

Reschedule a job or list of jobs to the specified timestamp.

Returns a single `Job` if a single `id` is provided, or a list of `Jobs` that
were updated if an array was provided. If no job was found then `undefined` is
returned.

### `MessageQueue.jobs()`

- Returns: `<Knex.QueryBuilder<Job>>`

Reads the list of pending jobs.

### `MessageQueue.job(id)`

- `id` `<number>`
- Returns: `<Knex.QueryBuilder<Job>>`

Find a specific job by id.

## `MessageQueueMixin`

The `MessageQueueMixin` function adds a `.mq` property to domain classes which
allows using the message queue subsystem.

An error will be thrown if no `mq` subsystem is provided during the `boot`
lifecycle.

```js
const mixins = pipe(Domain, MessageQueueMixin);
class MyDomain extends mixins {
  registerListeners() {
    super.registerListeners();

    this.mq.on("example").do(this.handleExample);
  }

  handleExample() {
    // code to handle the event
  }
}
```

The `.mq` getter returns a `Queue` instance. This can be used to define how
to listen for events to be sent to the message queue, and to retrieve the active
job within event handlers.

## `Queue`

### `Queue.do([handler])`

- `handler` `<Function>`
- Returns: `<Function>`

_Note: the `.do()` method is not a modifier like other methods. It must be the final method in a fluent chain_

Returns an event handler suitable for attaching to an `EventEmitter` via
`EventEmitter.on()`.

If the `.on` modifier was used, the handler will be attached to the domain class
and the return value can be ignored.

The following are equivalent:

```js
this.on("example", this.mq.do(this.handleExample));
this.mq.on("example").do(this.handleExample);
```

If no callback is provided `.do()` will remove any job in the queue
with a key matching a key set using the `.key()` modifier.

```js
this.mq
  .on("delete")
  .key((data) => `data:${data.id}`)
  .do(); // remove job
```

### `Queue.on([domain][, ...eventNames])`

- `domain` `<Domain>` (optional) the domain to add an event listener to
- `eventNames` `<string[]>` one or more event names to listen for
- Returns: `this` to allow chaining modifiers in a fluent way

The `.on` modifier is used to listen for events on the domain that tasks will be
created for.

To attach events to a different Domain class, pass it as the first argument.

### `Queue.map(mapper)`

- `mapper` `<Function>`|`<AsyncFunction>`
  - `...args` `<any[]>` the event arguments that were emitted
  - Returns: `<any[]>` | `<falsey>`
- Returns: `this` to allow chaining modifiers in a fluent way

The `.map` modifier is used to transform and filter the message payload. The
payload will be the event arguments by default, but may be altered by supplying
a `mapper` function to `.map`. The `mapper` should return an array containing
data to send as the message payload, or a non-array (typically `null` or
`undefined`) to filter the event and not send a message.

The `mapper` may return a promise.

```js
// # Example
// only send messages when the `public` argument is true
// also, only send the message in the payload
this.mq
  .on(eventName)
  .map((message, public) => (public ? [message] : null))
  .do(this.handleExample);
```

### `Queue.id(taskIdentifier)` <br /> `Queue.id(callback)`

- `taskIdentifier` `<string>`
- `callback` `<Function>`
  - `id` `<string>` the default task identifier
  - Returns: `<string>` the new task identifier
- Returns: `this` to allow chaining modifiers in a fluent way

The `.id` modifier is used to override the default "task id". This allows
controlling the task id in cases where that is required. The default task id
is created from the domain class name and handler name (eg. "MyDomain.handleExample")

`.id` accepts a callback which accepts the default task id value to transform to
a new value. This can be useful when using the same code for multiple events, like

```js
["ev1", "ev2", "ev3"].forEach((eventName) => {
  this.mq
    .on(eventName)
    .id((id) => `${id}:${eventname}`)
    .do(this.handleEv);
});
```

### `Queue.to(queueName)` <br /> `Queue.to(callback)`

- `queueName` `<string>`
- `callback` `<Function>`|`<AsyncFunction>`
  - `...args` `<any[]>` the event arguments
  - Returns: `<string>` the queue name
- Returns: `this` to allow chaining modifiers in a fluent way

Sets the queue jobs will be sent to. Jobs sent to a named queue will be
executed in serial.

`.to` accepts a callback which accepts the event arguments. The callback must
return the name of the queue for the event to be sent to.

The callback may return a promise.

### `Queue.at(timestamp)` <br> `Queue.at(callback)`

- `timestamp` `<string>`|`<number>`|`<Date>`|`<Knex.Raw>`
- `callback` `<Function>`|`<AsyncFunction>`
  - `...args` `<any[]>` the event arguments that were emitted
  - Returns: `<string>`|`<number>`|`<Date>`|`<Knex.Raw>` the timestamp
- Returns: `this` to allow chaining modifiers in a fluent way

Sets the time at which the job will be run.

The value should be something that is acceptable to `new Date()` (eg. a string,
number, or `Date` instance). It may also be a `Knex.raw` instance which
represents a database `timestamptz` value.

`.at` accepts a callback which accepts the event arguments. The callback must
return a value representing the time the job will be run.

The callback may return a promise.

```js
this.mq.at(() => new Date() + 3600 * 1000).do(this.handleExample);
this.mq.at(knex.raw(`now() + '1 hour'`)).do(this.handleExample);
this.mq.at((data) => data.timestampField).do(this.handleExample);
```

### `Queue.key(jobKey)` <br /> `Queue.key((...args) => string)`

- `jobKey` `<string>`
- `callback` `<Function>`|`<AsyncFunction>`
  - `...args` `<any[]>` the event arguments that were emitted
  - Returns: `<string>` the job key

Sets the job key which allows replacing or deleting a job that is in the
queue.

`.key` accepts a callback which accepts the event arguments. The callback must
return the key.

The callback may return a promise.

```js
this.mq
  .key((data) => `my-custom-key:${data.type}:${data.id}`)
  .do(this.handleExample);
```

Using a key is useful when combined with `.at()` to create a deferred job which
may be updated.

### `Queue.onJobStart(handler)` <br /> `Queue.onJobSuccess(handler)` <br /> `Queue.onJobError(handler)` <br /> `Queue.onJobFailed(handler)` <br /> `Queue.onJobComplete(handler)`

- `handler` `<Function>`|`<AsyncFunction>`
  - `...args` `<any[]>` the event arguments that were emitted

Execute a callback function when a job event occurs. The `handler` receives
the job payload as arguments.

The active job may be retrieved by acessing `mq.job`.

For 'job:error', 'job:failed', and 'job:complete' events, the error can be
retrieved by accessing `mq.error`.

```js
this.mq
  .on(eventName)
  .onJobStart(() => this.logger.info(`Job #${this.mq.job.id} started`))
  .onJobComplete(() => this.logger.info(`Job #${this.mq.job.id} completed`))
  .do(this.handleExample);
```

The callback is executed in the context of the job runner.

The callback may return a promise.
