# Yadah Knex subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides a way to access a [knex](https://knexjs.org/) instance.

## Basic usage

```js
import createKnex, { KnexMixin } from "@yadah/subsystem-knex";
import DataManager, { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";

class MyDomain extends pipe(Domain, KnexMixin) {
  async foo() {
    return await this.knex.select("*").table("tableName");
  }
}

const knex = createKnex({ ...knexConfigOptions });

const dataManager = new DataManager({ knex });
const domains = dataManager.boot({ MyDomain });

console.log(await domains.MyDomain.foo());
// [...records] from "tableName"
```

## createKnex(config)

Creates a `knex` instance using the provided configuration.

`createKnex()` will setup `pg.types` so that dates will use the "plain date"
convention (time component is set to zero at zulu), and numbers will be
output as javascript number types (ints, bigints, and floats).

## KnexMixin

The `KnexMixin` function will add a `.knex` property to domain classes which
provides access to the `knex` instance.

An error will be thrown if no `knex` subsystem is provided during the `boot`
lifecycle.

## TransactionMixin

The `TransactionMixin` function will add properties to domain classes to run
database transactions.

### `transaction(callback)`

Starts a knex transaction and calls the provided callback. The knex transaction
is added to the context and is available via the `transactionOrKnex`
property or via the callback's first argument.

The knex transaction will be completed when the callback's returned promise
resolves. If the callback throws an error, or returns a rejected promise the
transaction will be aborted.

The `transaction` property is also a setter to allow changing the context's
transaction value (for example, to create a child context that performs
queries outside the transaction).
