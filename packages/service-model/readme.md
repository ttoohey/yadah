# ServiceModel mixin

A Service class mixin that provides access to an Objection.js model.

Basic usage

```js
import MyModel from "./models/MyModel";
import Service, { mixin } from "@phasis/core";
import { ServiceModel, ServiceTransaction } from "@phasis/service-model";

class MyService extends mixin(
  Service,
  ServiceTransaction,
  ServiceModel(MyModel)
) {}
```

## Find functions

### find(id)

`find` accepts either an integer ID to find, or an object that can be used in a `.where()` to identify a single record, or an instance of the model.

Throws a `NotFoundError` if no record is found. May be disabled by passing `allowNotFound: true` in the options.

Throws a `NotUniqueError` if a criteria object is used and more than one record is returned.

Returns a promise that resolves with the instance of the model that is found. If an instance of the model was passed as the `id` parameter the instance will be returned.

```js
await MyService.find(123); // returns a MyModel instance
await MyService.find({ foo: "bar" }); // returns a MyModel instance

node = await MyService.find(123);
found = await MyService.find(node);
node === found; // true
```

### list(scope)

Accepts a `.scope()` criteria object.

Returns a `QueryBuilder` instance that resolves with an array of records matching the scope.

```js
await MyService.list({ bar: "baz" }); // returns array of MyModel instances

// streaming list results
for await (const myModel of MyService.list({ bar: "baz" })) {
  // myModel is an instance of MyModel
}
```

### one(scope)

Accepts a `.scope()` criteria object. The criteria _should_ identify a unique record.

Returns a `QueryBuilder` instance that resolves with the record matching the scope or `null` if no record is found.

```js
await MyService.one({ foo: "bar" }); // returns a MyModel instance
```

### count(scope)

Accepts a `.scope()` criteria object.

Returns the number of records that match the criteria.

```js
await MyService.count({ bar: "baz" }); // returns integer
```

### sum(scope, field)

Accepts a `.scope()` criteria object and a field name to sum.

Returns a Number containing the sum or null if there no were records that matched the criteria.

```js
await MyService.sum({ bar: "baz" }, "qty"); // returns Number
```

### min(field, scope)

Accepts a field name to find the minimum of and a `.scope()` criteria object.

Returns the minimum value in the specified field for all records that match the criteria.

```js
await MyService.min("qty", { bar: "baz" });
```

### max(field, scope)

Accepts a field name to find the maximum of and a `.scope()` criteria object.

Returns the maximum value in the specified field for all records that match the criteria.

```js
await MyService.max("qty", { bar: "baz" });
```

## Mutating functions

### create(json)

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

### update(id, json)

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

### delete(ids)

Deletes database records.

Accepts an ID or an array of IDs for records to be deleted.

Returns an array of IDs that were deleted.

Emits `deleted` event for each record that was deleted containing `undefined` to represent the deleted record, and the instance of the Model for the record that was deleted.

```js
await MyService.delete(123); // returns [123]
await MyService.delete([100, 102, 104]); // returns [100, 102, 104]

MyService.on("deleted", (after, before) => {
  after === undefined; // true
  before instanceof MyModel; // true
});
```

### upsert(key, json)

Creates or updates a database record.

The first argument is a `.where()` criteria object that uniquely identifies a record to find.

The second argument contains data to set.

If a record is found it will be updated using `.update()`, otherwise a new record will be created using `.create()`.

When creating a record the criteria and data are merged; it's not necessary to duplicate the criteria object fields in the data object.

Returns an instance of Model that was created or updated.

Emits `created` or `updated` events (depending on whether `.create()` or `.update()` was used).

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

Note: no events are emitted, and no hooks are run.

## Hooks

Hooks are a way to run additional database queries within transactions during the `.create()`, `.update()`, and `.delete()` mutating functions.

### onCreate(node, options)

The `.onCreate()` hook is executed after a newly created record is inserted. The first argument is an instance of the Model containing the newly created record.

A typical use-case for hooks is to overload the `.create()` function to provide additional logic for parts of a record that aren't simply inserted into the Model's database table.

```js
function create(json, options = {}) {
  const { localPart, ...rest } = json;
  const onCreate = async (node, { transaction }) => {
    await node.$relatedQuery("localPart", transaction).insert(localPart);
  };
  return super.create(rest, Object.assign(options, { onCreate }));
}
```

`.onCreate()` returns void.

### onUpdate([after, before], options)

The `.onUpdate()` hook is executed after a record is patched. The first argument is an array containing instances of the Model after the update and before the update.

A typical use-case for hooks is to overload the `.update()` function to provide additional logic for parts of a record that aren't simply inserted into the Model's database table.

```js
function update(id, json, options = {}) {
  const { localPart, ...rest } = json;
  const onUpdate = async ([after, before], { transaction }) => {
    await after.$relatedQuery("localPart", transaction).patch(localPart);
  };
  return super.update(id, rest, Object.assign(options, { onUpdate }));
}
```

The `.update()` function will emit the `updated` event only when it has executed a patch query. The `onUpdate()` hook may override this behaviour by returning `true` to indicate that there has been a change.

The `onUpdate()` hook may alternatively return an array with shape `[after, before]` containing instances of the Model to be emitted. If these instances are equal (ie. reference the same object) no `updated` event is emitted.

### onDelete(nodes, options)

The `.onDelete()` hook is executed after records have been deleted. The first argument is an array containing instances of the Model that were deleted.

```js
function delete(ids, options = {}) {
  const onDelete = async (nodes, { transaction }) => {
    for (const node of nodes) {
      await node.$relatedQuery("localPart", transaction).delete();
    }
  };
  return super.delete(ids, Object.assign(options, { onDelete }));
}
```

A return value is optional. If `onDelete` returns an array it should be an array of Model instances. Each item in the array will be the `before` value of the `deleted` event, and the return value of `super.delete()` will be IDs of the Model instances.

## Transactions

The `.onCreate`, `.onUpdate`, and `.onDelete` hooks are designed to support executing database queries in transactions. The `options` argument contains a `transaction` property that should be used when making queries inside the hook function.

The "find functions" (`.find()`, `.list()` etc) also accept a final `options` argument and will use the transaction if one is provided.

When the transaction is committed a `committed` event is emitted on the `options` argument. This allows hook functions to execute logic after the transaction is complete. Beware of adding event listeners when inside
loops; the event handlers are kept in-memory until the transaction completes.

If a hook function is calling `.create()`, `.update()`, or `.delete()` on a ServiceModel class the `options` object should be passed through to ensure queries performed there will be executed in the same transaction. Note: the `options` object should be mutated rather than replaced to ensure the `committed` event will be properly recognised.

```js
// DO
super.create(json, Object.assign(options, { onCreate }));

// DON'T
super.create(json, { ...options, onCreate });
```

To run queries in a transaction wrap them in a call to the `transaction()`
method.

```js
function action(args, options) {
  return this.transaction(options, async (options) => {
    // perform logic for action
    const node = await this.one(args.scope, options);
    await node.$relatedQuery("localPart", options.transaction);

    options.once("committed", () => {
      // perform logic when the transaction completes
    });
  });
}
```

### Message queue

The `mq` property of the `options` object contains details of the Message Queue transaction wrapping
the database transaction. This can be used to send data to the message queue to be transmitted
only when the transaction completes (an aborted transaction will discard the messages).

The `mq.transaction` property contains the `MessageQueueTransaction` object which
is used to indicate a message that is part of the transaction:

```js
this.transaction(async (options) => {
  await this.mq.send("eventType", options.mq.transaction, ...payload);
});
```

The `mq.emit` property is a convenience function to emit events intended to be
handled by an event listener which will properly

```js
this.transaction(async (options) => {
  options.mq.emit("eventType", ...payload);
  // is a shorthand for
  this.emit("eventType", options.mq.transaction, ...payload);
});
```

This is normally used in conjunction with the [service-listener](https://bitbucket.org/westonenergy/service-listener/) mixin where the `.queue()` function is used to send emitted events to
the message queue.
