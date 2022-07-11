# Yadah

Yet another database abstraction helper.

Yadah is a kind of framework providing an opinionated foundation for building
applications. Specifically, it's a _service layer_ wrapping database models
built using the Objection.js ORM/query builder.

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
