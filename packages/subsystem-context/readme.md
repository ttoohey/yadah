# Yadah Context subsystem

A [Yadah](https://www.npm.com/packages/@yadah/yadah) subsystem and Service class
mixin that provides a way to access shared "context" values in promise chains.

## Basic usage

```js
import createContext, { ContextMixin } from "@yadah/subsystem-context";
import DataManager, { Service } from "@yadah/data-manager";

class MyService extends (Service |> ContextMixin(%)) {
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
const services = dataManager.boot({ MyService });

await services.MyService.bar();
// logs: "undefined!"

context(async (ctx) => {
  ctx.set("foo", "demo inside context");
  await services.MyService.bar();
  await services.MyService.foo();
});
// logs:
// "demo inside context!"
// "demo inside context"
```
