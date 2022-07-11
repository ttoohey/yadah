# yadah/data-manager

Provides logic for configuring an application's data layer, and creating
"service classes" to provide a standard way for front-ends to interact with
subsystems.

## Usage

Create service classes

```js
// my-package/services.js
import { Service } from "@yadah/data-manager";

export class ServiceA extends Service {
  doATask() {
    this.logger.info("in doATask");
  }
}

export class ServiceB extends Service {
  async doBTask() {
    await this.knex("tableB").insert({ text: "in doBTask" });
  }
}
```

Create a data manager

```js
// my-package/index.js
import DataManager from "@yadah/data-manager";
import createLogger from "@yadah/subsystem-logger";
import createKnex from "@yadah/subsystem-knex";
import * as modules from "./services.js";

// setup subsystems
export const logger = createLogger(); // example
export const knex = createKnex(); // example
const subsystems = { logger, knex };

// initialise and boot the data manager
const dataManager = new DataManager(subsystems);
export const services = dataManager.boot(modules);

// life-cycle functions to start and stop subsystems and services
export async function startup() {
  await dataManager.startup();
}

export async function shutdown() {
  await dataManager.shutdown();
  await knex.destroy();
}
```

Access data package exports

```js
// other-package/example.js
import { services, startup, shutdown } from "my-package";

await startup();
services.ServiceA.doATask();
await services.ServiceB.doBTask();
await shutdown();
```

## Mixins

Mixins are used to create common logic for services.

Example: the `ListenerMixin` will call `registerListeners()` during the `boot`
lifecycle, and will automatically remove listeners during `shutdown`.

```js
// my-package/SomeService.js
import { Service } from "@yadah/data-manager";
import ListenerMixin from "@yadah/service-listener";

export class SomeService extends (Service |> ListenerMixin(%)) {
  registerListeners() {
    this.on("someEvent", () => this.handleEvent());
  }
  handleEvent() {
    // code to handle 'someEvent' events
  }
}
```

### Creating a mixin

A mixin is a function that returns a class that extends a supplied class.

The `dedupe()` function is a wrapper for mixin functions that ensures they will
wrap a class only once. This allows mixin depdendencies to be well defined.

```js
// my-package/SomeMixin.js
import dedupe from "@yadah/dedupe-mixin";

function SomeMixin(superclass) {
  return class Some extends superclass {
    someMixinFn() {
      //
    }
  };
}
export default SomeMixin |> dedupe(%);
```

A mixin can depend on another mixin by extending the `superclass`:

```js
// my-package/SomeMixin.js
import OtherMixin from "other-package";

fucntion SomeMixin(superclass) {
  const mixins = superclass |> OtherMixin(%);
  return class Some extends mixins {
    someMixinFn() {
      const dm = this.otherMixinFn();
      //
    }
  }
}

export default SomeMixin |> dedupe(%);
```

## Service class life-cycle functions

The `Service` class provides three life-cycle functions:

1. `boot()`
2. `startup()`
3. `shutdown()`

The `boot()` function is executed synchronously. All subsystems and other
service classes are visible via `this`. This function is typically used to allow
registering behaviours defined by mixins. `boot()` is called when the
`DataManager.boot()` function is called - typically during the application's
data-layer setup. `boot()` should be passed an object containing "service
classes" which will be created as singletons and stored on the `this.services`
object. `boot()` returns an object containing the service class singletons.

The `startup()` function may be asynchronous. The `boot()` function should be
called prior to `startup()`. This function is called on each service class
singleton when the `DataManager.startup()` function is called.

The `shutdown()` function may be asynchronous. This function is called on each
service class singleton when the `DataManage.shutdown()` function is called.
