# Yadah Knex subsystem

A [Yadah](https://www.npm.com/packages/@yadah/yadah) subsystem and Service class
mixin that provides a way to access a [knex](https://knexjs.org/) instance.

## Basic usage

```js
import createKnex, { KnexMixin } from "@yadah/subsystem-knex";
import DataManager, { Service } from "@yadah/data-manager";

class MyService extends (Service |> KnexMixin(%)) {
  async foo() {
    return await this.knex.select("*").table("tableName");
  }
}

const knex = createKnex({ ...knexConfigOptions });

const dataManager = new DataManager({ knex });
const services = dataManager.boot({ MyService });

console.log(await services.MyService.foo());
// [...records] from "tableName"
```

## createKnex(config)

Creates a `knex` instance using the provided configuration.

`createKnex()` will setup `pg.types` so that dates will use the "plain date"
convention (time component is set to zero at zulu), and numbers will be
output as javascript number types (ints, bigints, and floats).

## KnexMixin

The `KnexMixin` function will add a `.knex` property to service classes which
provides access to the `knex` instance.

An error will be thrown if no `knex` subsystem is provided during the `boot`
lifecycle.
