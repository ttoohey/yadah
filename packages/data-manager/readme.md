# yadah/data-manager

Provides logic for configuring an services's data layer, and creating
"domain classes" to provide a standard way for front-ends to interact with
subsystems.

## Usage

Create domain classes

```js
// my-package/domains.js
import { Domain } from "@yadah/data-manager";

export class DomainA extends Domain {
  doATask() {
    this.logger.info("in doATask");
  }
}

export class DomainB extends Domain {
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
import * as modules from "./domains.js";

// setup subsystems
export const logger = createLogger(); // example
export const knex = createKnex(); // example
const subsystems = { logger, knex };

// initialise and boot the data manager
const dataManager = new DataManager(subsystems);
export const domains = dataManager.boot(modules);

// life-cycle functions to start and stop subsystems and domains
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
import { domains, startup, shutdown } from "my-package";

await startup();
domains.DomainA.doATask();
await domains.DomainB.doBTask();
await shutdown();
```

## Mixins

Mixins are used to create common logic for domains.

Example: the `ListenerMixin` will call `registerListeners()` during the `boot`
lifecycle, and will automatically remove listeners during `shutdown`.

```js
// my-package/SomeDomain.js
import { Domain } from "@yadah/data-manager";
import ListenerMixin from "@yadah/domain-listener";
import { pipe } from "@yadah/mixin";

const mixins = pipe(Domain, ListenerMixin);
export class SomeDomain extends mixins {
  registerListeners() {
    this.on("someEvent", () => this.handleSomeEvent());
  }
  handleSomeEvent() {
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
import { dedupe } from "@yadah/mixin";

function SomeMixin(superclass) {
  return class Some extends superclass {
    someMixinFn() {
      // mixin logic
    }
  };
}
export default dedupe(SomeMixin);
```

A mixin can depend on another mixin by extending the `superclass`:

```js
// my-package/SomeMixin.js
import { dedupe, pipe } from "@yadah/mixin";
import OtherMixin from "other-package";

function SomeMixin(superclass) {
  const mixins = pipe(superclass, OtherMixin);
  return class Some extends mixins {
    someMixinFn() {
      const result = this.otherMixinFn();
      //
    }
  };
}

export default dedupe(SomeMixin);
```

## Domain class life-cycle functions

The `Domain` class provides three life-cycle functions:

1. `boot()`
2. `startup()`
3. `shutdown()`

The `boot()` function is executed synchronously. All subsystems and other
domain classes are visible via `this`. This function is typically used to allow
registering behaviours defined by mixins. `boot()` is called when the
`DataManager.boot()` function is called - typically during the services's
data-layer setup. `boot()` should be passed an object containing "domain
classes" which will be created as singletons and stored on the `this.domains`
object. `boot()` returns an object containing the domain class singletons.

The `startup()` function may be asynchronous. The `boot()` function should be
called prior to `startup()`. This function is called on each domain class
singleton when the `DataManager.startup()` function is called.

The `shutdown()` function may be asynchronous. This function is called on each
domain class singleton when the `DataManager.shutdown()` function is called.
