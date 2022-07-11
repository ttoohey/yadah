# Yadah

Yadah helps builing applications by organising the "data layer" into "subsystems"
and "services".

The `@yadah/yadah` package re-exports modules from all the core Yadah packages to
simplify package installation and usage.

## Usage

```sh
npm install -w @myscope/package-name @yadah/yadah
```

A typical "data layer" package will have a folder structure like:

```
src/
  models/
    index.js
    Bar.js
    Foo.js
  services/
    index.js
    Bar.js
    Foo.js
  index.js
  config.js
```

The `src/index.js` file is responsible for creating subsystem instances and
initialising the "Yada service classes" via the `DataManager`.

```js
// packages/package-name/src/index.js
import {
  createContext,
  createKnex,
  createLogger,
  createMessageQueue,
  createPubSub,
  createSchedule,
  DataManager,
  Model,
} from "@yadah/yadah";
import config from "./config.js";
import * as modelModules from "./models/index.js";
import * as serviceModules from "./services/index.js";

// setup subsystems
export const models = modelModules;
export const context = createContext();
export const knex = createKnex(config.knex);
export const logger = createLogger(config.logger);
export const mq = createMessageQueue(knex, logger);
export const pubsub = createPubSub(knex, config.pubsub);
export const schedule = createSchedule(knex, logger, config.schedule);

// initialise the data manager
const dataManager = new DataManager({
  models,
  context,
  knex,
  logger,
  mq,
  pubsub,
  schedule,
});

// boot services
export const services = dataManager.boot(serviceModules);

// lifecycle functions allow applications to cleanly control startup and shutdown
export const startup = async () => {
  Model.knex(knex);
  await dataManager.startup();
};
export const shutdown = async () => {
  await dataManager.shutdown();
  await knex.destroy();
};
```

Other packages may then access subsystems and service classes from this package.

```js
import { services, logger } from "@myscope/package-name";

const foo = await services.Foo.find(123);
logger.info("message", foo);
```

## data-manager

https://www.npmjs.com/package/@yadah/data-manager

### `class DataManager`

Manages subsystems and service classes

### `class Service`

Base Yadah service class implemenation

## service-critical-section

https://www.npmjs.com/package/@yadah/service-critical-section

### `CriticalSectionMixin`

A mixin for Yadah service classes providing a way to shutdown processes cleanly.

## service-listener

https://www.npmjs.com/package/@yadah/service-listener

### `ListenerMixin`

A mixin for Yadah service classes to manage registering event listeners.

## service-model

https://www.npmjs.com/package/@yadah/service-model

### `class Model`

An Objection.js Model with plugins that provide functionality required by the
`ModelMixin` service class mixin.

### `ModelMixin`

A mixin for Yadah service classes that provides access to an Objection.js Model.

### `class NotUniqueError`

A Error class that may be thrown by `ModelMixin` when a query does not validate
as having a unique result.

### `NotUniqueMixin`

A mixin for Objection.js models which adds a `.throwIfNotUnique()` function to
query builder instances.

## subsystem-context

https://www.npmjs.com/package/@yadah/subsystem-context

### `createContext`

A function to create a "context" subsystem.

### `ContextMixin`

A mixin for Yadah service classes which provides access to the application's
context subsystem.

## subsystem-knex

https://www.npmjs.com/package/@yadah/subsystem-knex

### `createKnex`

A function to create a [knex](https://knexjs.org) instance.

### `KnexMixin`

A mixin for Yadah service classes which provides access to the application's
knex instance.

### `TRANSACTION`

A symbol used to lookup the current knex transaction in a promise-chain context.

### `TransactionMixin`

A mixin for Yadah service classes which allows creating database transactions.

## subsystem-logger

https://www.npmjs.com/package/@yadah/subsystem-logger

### `createLogger`

A function to create a logger subsystem.

### `LoggerMixin`

A mixin for Yadah service classes which provides access to the application's
logger subsystem.

## subsystem-message-queue

https://www.npmjs.com/package/@yadah/subsystem-message-queue

### `createMessageQueue`

A function to create a message queue (mq) subsystem.

### `MessageQueueMixin`

A mixin for Yadah service classes which provides access to the message queue
subsystem, and helper methods for add jobs to the queue.

## subsystem-pubsub

https://www.npmjs.com/package/@yadah/subsystem-pubsub

### `createPubSub`

A function to create a PubSub subsystem.

### `PubSubMixin`

A mixin for Yadah service classes which provides access to the pubsub subsystem,
and helper methods for publishing messages.

## subsystem-schedule

https://www.npmjs.com/package/@yadah/subsystem-schedule

### `createSchedule`

A function to create a schedule subsystem.

### `ScheduleMixin`

A mixin for Yadah service classes which allows registering scheduled jobs.
