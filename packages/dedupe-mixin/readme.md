# dedupe-mixin

A _mixin_ is a function which returns a class that extends a provided "super
class".

```js
(superclass) => class extends superclass {};
```

The `dedupe()` function is a wrapper for mixins to allow a mixin to be used
multiple times without duplicating behaviour.

The typical usage is like:

```js
// CustomMixin.js
import dedupe from "@yadah/dedupe-mixin";

function CustomMixin(superclass) {
  return class Custom extends superclass {
    fn() {
      super.fn();
      console.log("inside Custom.fn");
    }
  };
}
export default CustomMixin |> dedupe(%);
```

If this mixin is then used multiple times in the some mixin chain, it will
only appear once

```js
import CustomMixin from "./CustomMixin.js";

class superclass {
  fn() {}
}

class Example extends (superclass |> CustomMixin(%) |> CustomMixin(%)) {}

new Example().fn();
// logs "inside Custom.fn" (once only)
```

`dedupe()` also adds a method to the wrapped mixin function that allows
checking if a class includes the mixin:

```js
CustomMixin.extends(Example);
// true
```
