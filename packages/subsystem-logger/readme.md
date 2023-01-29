# Yadah Logger subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides a logging using [winston](https://www.npmjs.com/package/winston).

## Basic usage

```js
import createLogger, { LoggerMixin } from "@yadah/subsystem-logger";
import DataManager, { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";

class MyDomain extends pipe(Domain, LoggerMixin) {
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
const domains = dataManager.boot({ MyDomain });

domains.MyDomain.foo();
// info: foo() was called {timestamp}

domains.MyDomain.err();
// error: err() threw {timestamp}
// Error: error message
//   {stack}
```

### Logging types

The `logger` instance provides access to `syslog`, `npm`, and `cli` logging
types.

```js
logger.syslog.warning("A syslog style warning");
logger.cli.help("A help message");
logger.npm.http("request", request);
```

The `options.level` option may be set to a comma-separated list of levels. Each
logging type will use the first level that the logger supports. For example,
to output only syslog "alert" and above messages and otherwise "error" messages,
set `{ level: "alert,error" }`. To get all levels for each type use
`{ level: "silly,debug" }`.

### Log formats

The logger has two formats:

- pretty
- json

In each format, the log functions accept arguments in the form:

```js
logger.info(message: string, ...metaData: any[]);
```

Note: No string interpolation is performed.

The "pretty" format is intended for development environments. It will display
the message and each `metaData` item as colorized output. `Error` objects are
displayed with a stack trace.

The "json" format is intended for production environments where logs are
captured in a centralized logging tool. `Error` objects are captured with
a stack trace.

## createLogger(options)

Creates a `winston` logger configured to output logs to the console.

Options:

- `pretty` - set to `true` in development to output readable logs; set to `false`
  in production to output JSON content more suitable for machine consumption
- `silent` - set to `true` to suppress all log output
- `level` - only log messages at or above this level will be output; set to
  "silly,debug" to get maximum logs; default is "info"

## LoggerMixin

The `LoggerMixin` function will add a `.logger` property to domain classes which
provides access to the `logger` instance.
