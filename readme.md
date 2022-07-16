# Yadah

Yet another data abstraction helper.

Yadah is a framework providing an opinionated foundation for building
services following a domain-driven design.

In this framework, a typical _service_ consists of a number of layers:

- front-ends
- domains
- subsystems

```
            +-------+      +------------+   +-------+
FRONTENDS   |  API  |      | Background |   |  CLI  |
            +-------+      +------------+   +-------+
                |                 |             |
                |                 |             |
            +---------------------------------------------------------+
DOMAINS     |                                                         |
            +---------------------------------------------------------+
                |                  |               |              |
                |                  |               |              |
            +----------+   +---------------+   +--------+   +---------+
SUBSYTEMS   | database |   | message queue |   | pubsub |   | storage |
            +----------+   +---------------+   +--------+   +---------+
```

A typical _service_ is organised as a mono-repository containing
a `data` package where subsystems and domains are defined, and separate
packages for each front-end. A front-end is typically a thin wrapper around
the _domains_

Domains implement the business logic of the service. A typical pattern is to
define database models, and construct a domain class around each model.

The types of front-ends and subsystems a service uses is dependant on the
requirements of that service.

## Build

```sh
npm install
# or
npm run build
```

For automatic re-builds:

```sh
npm start
```

## Run unit tests

```sh
npm test
```

Or, for individual packages

```sh
npm run -- workspace:data-manager test
npm run -- workspace:data-manager test --watch
```
