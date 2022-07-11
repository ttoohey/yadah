# Yadah Logger subsystem

A [Yadah](https://www.npm.com/packages/@yadah/yadah) subsystem and Service class
mixin that provides a logging using [winston](https://www.npmjs.com/package/winston).

## Basic usage

```js
import createLogger, { LoggerMixin } from "@yadah/subsystem-logger";
import DataManager, { Service } from "@yadah/data-manager";

class MyService extends (Service |> LoggerMixin(%)) {
  foo() {
    this.logger.info("foo() was called");
  }

  err() {
    try {
      throw new Error("error message");
    } catch (error) {
      this.logger.error("err() threw", error);
    }
  }
}

const logger = createLogger({ pretty: true, silent: false, level: "info" });

const dataManager = new DataManager({ logger });
const services = dataManager.boot({ MyService });

services.MyService.foo();
// info: foo() was called {timestamp}

services.MyService.err();
// error: err() threw {timestamp}
// Error: error message
//   {stack}
```

## createLogger(options)

Creates a `winston` logger configured to output logs to the console.

Options:

- `pretty` - set to `true` in development to output readable logs; set to `false`
  in production to output JSON content more suitable for machine consumption
- `silent` - set to `true` to suppress all log output
- `level` - only log messages at or above this level will be output; set to
  "debug" to get maximum logs; default is "info"

## LoggerMixin

The `LoggerMixin` function will add a `.logger` property to service classes which
provides access to the `logger` instance.
