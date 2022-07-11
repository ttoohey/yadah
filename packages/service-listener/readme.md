# Yadah Listener mixin

A mixin for [Yadah](https://www.npmjs.com/packages/@yadah/yadah) Service classes
adding the `registerListeners()` method. It provides a standardised way for
Service classes to register event handlers.

## registerListeners()

Hook for derived classes to register event listeners.

`registerListeners()` is called during the `boot()` lifecycle method
so access to other services and subsystems is available.

`registerListeners()` should return synchronously.

```js
import { ServiceListener } from "@yadah/service-listener";
import { Service } from "@yadah/data-manager";

class MyService extends (Service |> ServiceListener(%)) {
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

// after service boot
dataManager.services.MyService.emit("hello", "world"); // logs "Hello world"
```

It is common to listen to events from other services:

```js
registerListeners() {
    // ensure superclass event listeners are registered
  super.registerListeners();

  // listen for 'hello' events
  this.on("hello", (name) => this.hello(name));

  // listen for 'hola' events on another service class
  const { OtherService } = this.services;
  OtherService.on("hola", (name) => this.hello(`${name} (OtherService)`));
}

dataManager.services.OtherService.emit("hola", "mundo"); // logs "Hello mundo (OtherService)"
```
