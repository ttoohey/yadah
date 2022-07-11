# Objection Iterator mixin

A [mixin](https://vincit.github.io/objection.js/guide/plugins.html#plugin-development-best-practices) for [Objection.js](https://vincit.github.io/objection.js/) Model classes that allows using queries as [async iterables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of).
It allows _streaming query results_!

## Usage

```js
import { Model } from "objection";
import IteratorMixin from "@yadah/objection-iterator";

class MyModel extends (Model |> IteratorMixin(%)) {
  static tableName = "mytable";

  async doSomething() {
    //
  }
}

for await (const model of MyModel.query()) {
  model instanceof MyModel; // true
  await model.doSomething();
}
```
