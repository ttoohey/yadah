# Yadah Critical Section mixin

A mixin for [Yadah](https://www.npmjs.com/packages/@yadah/yadah) Service classes
that provides a way to run asynchronous code which will be allowed to complete
prior to a process exiting. This helps to ensure that data will be
consistent across different services even in the event that a service is being
restarted.

## Usage

Add the mixin to a service class and provide a callback function to the
`criticalSection()` method. During a process shutdown, the service class
`shutdown()` method won't resolve until the callback resolves.

```js
import CriticalSectionMixin from "@yadah/service-critical-section";
import { Service } from "@yadah/data-manager";

class MyService extends (Service |> CriticalSectionMixin(%)) {
  async performRemoteMutation() {
    await this.criticalSection(async () => {
      const result = await remoteMutation();
      await localMutation(result);
    });
  }
}
```

In this example, the `remoteMutation()` function may take some time to complete,
and when it does the result will be stored somewhere using the `localMutation()`
method. It's desired to ensure that **both** functions will complete even if
the nodejs process is stopped (eg. via `nodemon` or ECS task replacement).

The callback function may be a generator function returning an
[async iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of).
The service class `shutdown()` method won't resolve until the iterator has
resolved.

```js
import CriticalSectionMixin from "@yadah/service-critical-section";
import { Service } from "@yadah/data-manager";

class MyService extends (Service |> CriticalSectionMixin(%)) {
  async performRemoteMutation(list) {
    async function* generator() {
      for await (const item of list) {
        yield await remoteMutation(item);
      }
    }
    const iterable = this.criticalSection(generator);
    for await (const result of iterable) {
      await localMutation(result);
    }
  }
}
```

A Promise may also be passed to `criticalSection()`. Again, the `shutdown()`
method won't resolve until the promise is resolved.

```js
import CriticalSectionMixin from "@yadah/service-critical-section";
import { Service } from "@yadah/data-manager";

class MyService extends (Service |> CriticalSectionMixin(%)) {
  async performRemoteMutation() {
    const promise = remoteMutation().then((result) => localMutation(result));
    await this.criticalSection(promise);
  }
}
```
