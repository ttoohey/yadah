# Yadah Context subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides a way to access shared "context" values in promise chains.

## Basic usage

```js
import createContext, { ContextMixin } from "@yadah/subsystem-context";
import DataManager, { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";

class MyDomain extends pipe(Domain, ContextMixin) {
  async foo() {
    const value = this.context.get("foo");
    console.log(value);
  }
  async bar() {
    await this.context(async () => {
      const value = this.context.get("foo");
      this.context.set("foo", value + "!");
      await this.foo();
    });
  }
}

const context = createContext();

const dataManager = new DataManager({ context });
const domains = dataManager.boot({ MyDomain });

await domains.MyDomain.bar();
// logs: "undefined!"

context(async (ctx) => {
  ctx.set("foo", "demo inside context");
  await domains.MyDomain.bar();
  await domains.MyDomain.foo();
});
// logs:
// "demo inside context!"
// "demo inside context"
```

## Nesting contexts

A context callback resolves once all nested context callbacks have resolved.

In this example logging `3` doesn't occur before `2` because the outer context
will await the inner context.

```js
await context(() => {
  context(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    console.log(2);
  });
  console.log(1);
});
console.log(3);
```

This feature allows awaiting async event handlers.

```js
class MyDomain extends pipe(Domain, ContextMixin) {
  registerListeners() {
    this.on("event", () =>
      this.context(async () => {
        await new Promise((resolve) => setImmediate(resolve));
        console.log("event complete");
      })
    );
  }

  doEvent() {
    this.emit("event");
    console.log("before event complete");
  }

  async doEventAsync() {
    await this.context(() => this.emit("event"));
    console.log("after event complete");
  }
}
```

The `.onAsync()` and `.emitAsync()` functions can be used to simplify this
pattern.

```js
class MyDomain extends pipe(Domain, ContextMixin) {
  registerListeners() {
    this.onAsync("event", async () => {
      await new Promise((resolve) => setImmediate(resolve));
      console.log("event complete");
    });
  }

  async doEventAsync() {
    await this.emitAsync("event");
    console.log("after event complete");
  }
}
```

## API

### `createContext()`

- Returns: `<context>`

Creates a promise chain context.

#### `context(callback)`

- `callback` `<AsyncFunction>`
- Returns: `<Promise<any>>`

Executes a callback function in a promise chain context. The `context` object
is passed as the first argument to the callback function.

Returns the result of the callback function.

#### `context.get(key)`

- `key` `<string>` | `<number>` | `<symbol>`
- Returns: `<any>`

Returns the current value stored for the specified `key` from the context.

#### `context.set(key, value)`

- `key` `<string>` | `<number>` | `<symbol>`
- Returns: `<any>`

Sets the current value stored for the specified `key` to `value`.

### `class ContextMixin`

Adds behaviour to `Domain` classes.

A `context` object must be passed as in the `Domain` constructor.

#### `.context()`

Getter to return the context object.

#### `.onAsync(eventName, listener)`

- `eventName` `<string>`|`<symbol>`
- `listener` `<Function>`

Wraps an event listener in a context calback.

#### `.emitAsync(eventName[, ...args])`

- `eventName` `<string>`|`<symbol>`
- `args` `<any>`
- Returns: `<Promise<void>>`

Emits an event in a context callback.
