# Yadah Listener mixin

A mixin for [Yadah](https://www.npmjs.com/package/@yadah/yadah) Domain classes
adding the `registerListeners()` method. It provides a standardised way for
Domain classes to register event handlers.

## registerListeners()

Hook for derived classes to register event listeners.

`registerListeners()` is called during the `boot()` lifecycle method
so access to other domains and subsystems is available.

`registerListeners()` should return synchronously.

```js
import ListenerMixin from "@yadah/domain-listener";
import { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";

class MyDomain extends pipe(Domain, ListenerMixin) {
  registerListeners() {
    // ensure superclass event listeners are registered
    super.registerListeners();

    // listen for 'hello' events
    this.on("hello", (name) => this.hello(name));
  }

  hello(name) {
    console.log(`Hello ${name}`);
  }
}

// after domain boot
dataManager.domains.MyDomain.emit("hello", "world"); // logs "Hello world"
```

It is common to listen to events from other domains:

```js
registerListeners() {
    // ensure superclass event listeners are registered
  super.registerListeners();

  // listen for 'hello' events
  this.on("hello", (name) => this.hello(name));

  // listen for 'hola' events on another domain class
  const { OtherDomain } = this.domains;
  OtherDomain.on("hola", (name) => this.hello(`${name} (OtherDomain)`));
}

dataManager.domains.OtherDomain.emit("hola", "mundo"); // logs "Hello mundo (OtherDomain)"
```
