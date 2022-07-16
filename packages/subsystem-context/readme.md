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
