# Yadah Model mixin

A mixin for [Yadah](https://www.npmjs.com/package/@yadah/yadah) Service classes
that adds methods for database access via an
[Objection.js](https://vincit.github.io/objection.js/) model.

## Basic usage

```js
import ModelMixin, { Model } from "@yadah/service-model";
import { Service } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";

export class MyModel extends Model {
  static tableName = "myModelTable";

  static scopes() {
    return {
      ...super.scopes,
      field: (query, { field }) => query.where("field", field);
    };
  }
}

const mixins = pipe(Service, x => ModelMixin(x, MyModel));

export class MyService extends mixins {
  // business logic
}
```

```js
// find functions
services.MyService.find(); // find one record by id
services.MyService.list(); // listing records
services.MyService.one(); // find one record by criteria
services.MyService.count(); // count records
services.MyService.sum(); // aggregate total
services.MyService.min(); // aggregate minimum
services.MyService.max(); // aggregate maximum
services.MyService.avg(); // aggregate average

// mutating functions
services.MyService.create();
services.MyService.update();
services.MyService.delete();
services.MyService.upsert();
services.MyService.copyFrom();
```

The `Model` class exported from `@yadah/service-model/Model.js` has the following
Objection.js mixins:

- `@yadah/objection-iterator/IteratorMixin.js`
- `@yadah/objection-scope/ScopeMixin.js`
- `@yadah/service-model/NotUniqueMixin.js`

These mixins are required for any `Model` passed to `ModelMixin`.

## Find functions

`ModelMixin` adds the following functions to the Service class.

### find(id)

`find` accepts either an integer ID to find, or an object that can be used in a `.where()` to identify a single record, or an instance of the model.

Throws a `NotFoundError` if no record is found. May be disabled by passing `allowNotFound: true` in the options.

Throws a `NotUniqueError` if a criteria object is used and more than one record is returned.

Returns a promise that resolves with the instance of the model that is found. If an instance of the model was passed as the `id` parameter the instance will be returned.

```js
await MyService.find(123); // returns a MyModel instance
await MyService.find({ field: "bar" }); // returns a MyModel instance

node = await MyService.find(123);
found = await MyService.find(node);
node === found; // true
```

### list(criteria)

Accepts a [`Model.scope()`](https://www.npmjs.com/package/@yadah/objection-scope)
criteria object.

Returns a `QueryBuilder` instance that resolves with an array of records
matching the scope.

```js
await MyService.list({ field: "baz" }); // returns array of MyModel instances

// streaming list results
for await (const myModel of MyService.list({ field: "baz" })) {
  // myModel is an instance of MyModel
}
```

### one(criteria)

Accepts a `.scope()` criteria object. The criteria _should_ identify a unique record.

Returns a `QueryBuilder` instance that resolves with the record matching the scope or `null` if no record is found.

```js
await MyService.one({ field: "bar" }); // returns a MyModel instance
```

### count(criteria)

Accepts a `.scope()` criteria object.

Returns the number of records that match the criteria.

```js
await MyService.count({ field: "baz" });
```

### sum(field, criteria)

Accepts a `.scope()` criteria object and a field name to sum.

Returns a number containing the sum or null if there no were records that matched the criteria.

```js
await MyService.sum("qty", { field: "baz" });
```

### min(field, criteria)

Accepts a field name to find the minimum of and a `.scope()` criteria object.

Returns the minimum value in the specified field for all records that match the criteria.

```js
await MyService.min("qty", { field: "baz" });
```

### max(field, criteria)

Accepts a field name to find the maximum of and a `.scope()` criteria object.

Returns the maximum value in the specified field for all records that match the criteria.

```js
await MyService.max("qty", { field: "baz" });
```

## Mutating functions

### create(json, onCreate)

Creates a new database record.

Returns an instance of the Model containing the newly created record.

Emits `created` event containing the newly created record.

```js
await MyService.create({ foo: "bar", bar: "baz" }); // returns a MyModel instance

MyService.on("created", (after, before) => {
  after instanceof MyModel; // true
  before === undefined; // true
});
```

#### onCreate(model, transaction)

The `onCreate()` hook is executed after a newly created record is inserted. The
first argument is an instance of the Model containing the newly created record.

A typical use-case for hooks is to overload the `.create()` function to provide
additional logic for parts of a record that aren't simply inserted into the
Model's database table.

```js
function create(json) {
  const { localPart, ...rest } = json;
  const onCreate = async (model, transaction) => {
    await model.$relatedQuery("localPart", transaction).insert(localPart);
  };
  return super.create(rest, onCreate);
}
```

`onCreate()` returns void.

### update(id, json, onUpdate)

Updates a database record.

The first argument is a `.find()` identifier to identify the record to update. A `NotFoundError` can be thrown if the record is not found.

The second argument is an object containing fields to update.

Returns an instance of the Model containing the updated data.

Emits `updated` event containing the updated record and the record prior to the update.

```js
await MyService.update(123, { bar: "..." }); // return a MyModel instance

MyService.on("updated", (after, before) => {
  after instanceof MyModel; // true
  before instanceof MyModel; // true
});
```

#### onUpdate([after, before], transaction)

The `onUpdate()` hook is executed after a record is patched. The first argument
is an tuple containing instances of the Model after the update and before the
update.

A typical use-case for hooks is to overload the `.update()` function to provide
additional logic for parts of a record that aren't simply inserted into the
Model's database table.

```js
function update(id, json) {
  const { localPart, ...rest } = json;
  const onUpdate = async ([after, before], transaction) => {
    await after.$relatedQuery("localPart", transaction).patch(localPart);
  };
  return super.update(id, rest, onUpdate);
}
```

The `.update()` function will emit the `updated` event only when it has executed a patch query. The `onUpdate()` hook may override this behaviour by returning `true` to indicate that there has been a change.

The `onUpdate()` hook may alternatively return an array with shape `[after, before]` containing instances of the Model to be emitted. If these instances are equal (ie. reference the same object) no `updated` event is emitted.

### delete(id, callback)

Deletes a database record.

Returns an instance of the Model containing the deleted record.

Emits `deleted` event containing the deleted record.

```js
await MyService.delete(123); // returns a MyModel instance

MyService.on("deleted", (after, before) => {
  after === undefined; // true
  before instanceof MyModel; // true
});
```

#### onDelete(model, transaction)

The `onDelete()` hook is executed after a record has been deleted. The first
argument is the instance of the Model that was deleted.

A typical use-case for hooks is to overload the `.delete()` function to provide
additional logic for parts of a record that aren't in the Model's database table.

```js
function delete(id) {
  const onDelete = async (model, transaction) => {
    await model.$relatedQuery("localPart", transaction).delete();
  };
  return super.delete(id, onDelete);
}
```

A return value is optional. If `onDelete()` returns a "truthy" value it will be
emitted as the `before` value of the `deleted` event, and returned as the value
of the `delete()` function.

### upsert(key, json)

Creates or updates a database record.

The first argument is a `.where()` criteria object that uniquely identifies a
record to find.

The second argument contains data to set.

If a record is found it will be updated using `.update()`, otherwise a new
record will be created using `.create()`.

When creating a record the criteria and data are merged; it's not necessary to
duplicate the criteria object fields in the data object.

Returns an instance of Model that was created or updated.

Emits `created` or `updated` events (depending on whether `.create()` or
`.update()` was used).

```js
await MyService.upsert({ foo: "bar" }, { bar: "..." });
```

### copyFrom(data)

Perform a streaming import of records.

`data` is any async iterable-like object (arrays, object streams, generator
output etc). Each yielded object is inserted into the model's database
table (via `COPY FROM`)

Returns a count of the number of records inserted.

```js
await App.services.MyService.copyFrom([{ foo: "bar", bar: "baz" }]);
// 1
```

Note: no events are emitted.

## Transactions

All functions will attempt to use the current context's transaction.

The mutating functions wrap all logic in a transaction.

To run queries in a transaction wrap them in a call to the `transaction()`
method.

```js
function action(args) {
  return this.transaction(async () => {
    // perform logic for action (.one() uses the transaction from context)
    const model = await this.one(args.scope);

    // get the transaction from context to pass to Objection/Knex functions
    const trx = this.transactionOrKnex;
    await model.$relatedQuery("localPart", trx);
  });
}
```

To run a query _outside_ the transaction, create a new context and set
the transaction to null

```js
function action(args) {
  return this.transaction(async () => {
    // uses the transaction
    const model = await this.one(args.scope);

    await this.context(() => {
      this.transaction = null;
      // this delete is performed _outside_ the transaction
      await this.delete(model);
    })

    // uses the transaction again; (will probably be a conflict? TODO: what's a good example?)
    await this.create(model);
  })
}
```
