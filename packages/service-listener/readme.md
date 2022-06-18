# ServiceListener mixin

An opinionated way for services to coordinate through pub/sub and message
queue events.

## registerListeners()

Hook for derived classes to register event listeners.

This is called during the boot process Service classes will have access to other
services and subsystems (such as PubSub and MessageQueue)

```js
import { ServiceListener } from "@phasis/service-listener";

class MyService extends mixin(Service, ServiceListener) {
  registerListeners() {
    this.on("hello", (name) => this.hello(name));
  }

  hello(name) {
    console.log(`Hello ${name}`);
  }
}

// after service boot
App.services.MyService.emit("hello", "world"); // logs "Hello world"
```

It is common to listen to events from other services.

```js

registerListeners() {
  this.on("hello", (name) => this.hello(name));

  const { OtherService } = this.services;
  OtherService.on("hola", (name) => this.hello(`${name} (OtherService)`));
}

App.services.OtherService.emit("hola", "mundo"); // logs "Hello mundo (OtherService)"
```

## publish()

Helper function for setting up event listeners that broadcast data via the PubSub provider

```js
import { ServiceListener } from "@phasis/service-listener";

class MyService extends mixin(Service, ServiceListener) {
  registerListeners() {
    this.publish("hello");
  }
}

// after service boot
App.pubsub.on("myServiceHello", (name) => console.log(`Hello ${name}`));
App.services.MyService.emit("hello", "world"); // logs "Hello world"
```

A default channel name is generated using the `ClassName.EventName` structure. A custom channel name can be set.

```js
registerListeners() {
  this.publish("hello", "HELLO");
}
App.pubsub.on("HELLO", listener);
```

Multiple events can be listened to

```js
registerListeners() {
  this.publish(["hello", "goodbye"]);
}
App.pubsub.on("myServiceHello", listener);
App.pubsub.on("myServiceGoodbye", listener);
```

## queue()

Helper function for setting up event listeners that send data via the message queue to a receiver.

```js
import { ServiceListener } from "@phasis/service-listener";

class MyService extends mixin(Service, ServiceListener) {
  registerListeners() {
    this.queue("hello", "MyService.hello", (name) =>
      console.log(`Hello ${name}`)
    );
  }
}

// after boot
App.services.MyService.emit("hello", "world"); // queues a `MyService.hello` job

// background job processor logs "Hello world"
```

The helper will construct a name for the queued job if a named function is specified as the receiver.

```js
import { ServiceListener } from "@phasis/service-listener";

class MyService extends mixin(Service, ServiceListener) {
  registerListeners() {
    this.queue("hello", this, this.hello);
  }
  hello(name) {
    console.log(`Hello ${name}`);
  }
}
```

Multiple events can be listened to

```js
import { ServiceListener } from "@phasis/service-listener";

class MyService extends mixin(Service, ServiceListener) {
  registerListeners() {
    this.queue(["hello", "goodbye"], this, this.aloha);
  }
  aloha(name) {
    console.log(`Aloha ${name}`);
  }
}

App.services.MyService.emit("goodbye", "world"); // queues a `MyService.aloha` job
```
