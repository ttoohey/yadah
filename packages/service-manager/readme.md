# yadah/service-manager

Provides the core service manager logic for configuring an application's
data layer subsystems, and creating "service classes" to provide a standard way
for front-ends to interact with data.

## Usage

Create service classes

```js
// my-package/services.js
import { Service } from "@yadah/service-manager";

export class ServiceA extends Service {
  doATask() {
    this.logger.info("in doATask");
  }
}

export class ServiceB extends Service {
  async doBTask() {
    await this.knex("bData").insert({ text: "in doBTask" });
  }
}
```

Create a service manager

```js
// my-package/index.js
import { ServiceManager } from "@yadah/service-manager";
import * as modules from "./services.js";

export const logger = createLogger(); // example
export const knex = createKnex(); // example

const subsystems = { logger, knex };
const serviceManager = new ServiceManager(subsystems);
export const services = serviceManager.boot(modules);

export async function startup() {
  await serviceManager.startup();
}

export async function shutdown() {
  await serviceManager.shutdown();
  await knex.destroy();
}
```

Access service package exports

```js
// other-package/example.js
import { services } from "my-package";

services.ServiceA.doATask();
await services.ServiceB.doBTask();
```

## Mixins

Mixins are used to create common logic for services.

```js
// my-package/BaseService.js
import { mixin, Service } from "@yadah/service-manager";
import Listener from "@yadah/service-listener";

export class BaseService extends mixin(Service, Listener) {}
```

```js
// my-package/SomeService.js
import BaseService from "./BaseService.js";

export class SomeService extends BaseService {
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

```js
// my-package/SomeMixin.js

export default (SuperClass) =>
  class extends SuperClass {
    mixinFn() {
      //
    }
  };
```

A mixin can depend on another mixin by wrapping it with `mixin()`

```js
// my-package/SomeMixin.js
import { mixin } from "@yadah/service-manager";
import DependantMixin from "other-package";

export default (SuperClass) =>
  class extends mixin(SuperClass, DependantMixin) {};
```

To avoid `DependantMixin` from being "mixed" multiple times, it should name
it's class.

```js
// other-package/DependantMixin.js
export default (SuperClass) =>
  class DependantMixin extends SuperClass {
    // ... mixin logic ...
  };
```

## Service class life-cycle functions

The base `Service` class provides three life-cycle functions:

1. `boot()`
2. `startup()`
3. `shutdown()`

The `boot()` function is executed synchronously. All subsystems and other
service classes are visible via `this`. This function is typically used to allow
registering behaviours defined by mixins. `boot()` is called when the
`ServiceManager.boot()` function is called - typically during the application's
data-layer setup. `boot()` should be passed an array containing a list of
"service classes" which will be created as singletons and stored on the
`this.services` object.

The `startup()` function may be asynchronous. The `boot()` function should be
called prior to `startup()`. This function is called when the
`ServiceManager.startup()` function is called. Applications

The `shutdown()` function may be asynchronous.
