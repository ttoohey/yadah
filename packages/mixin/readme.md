# @yadah/mixin

Utilities for using class mixins

## `pipe()`

Execute a list of unary functions passing the output of one to the next.

```js
import { pipe } from "@yadah/mixin";

class superclass {}

function AMixin(superclass) {
  return class A extends superclass {
    aFn() {
      return "a";
    }
  };
}
function BMixin(superclass) {
  return class B extends superclass {
    bFn() {
      return "b";
    }
  };
}
function CMixin(superclass) {
  return class C extends superclass {
    cFn() {
      return "c";
    }
  };
}

const mixed = pipe(superclass, AMixin, BMixin, CMixin);

class ABC extends mixed {}

const abc = new ABC();
abc.aFn(); // 'a'
abc.bFn(); // 'b'
abc.cFn(); // 'c'
```

## `dedupe()`

A wrapper for mixins to allow a mixin to be used multiple times without
duplicating behaviour.

The typical usage is like:

```js
// CustomMixin.js
import { dedupe } from "@yadah/mixin";

function CustomMixin(superclass) {
  return class Custom extends superclass {
    fn() {
      super.fn();
      console.log("inside Custom.fn");
    }
  };
}
export default dedupe(CustomMixin);
```

If this mixin is then used multiple times in the some mixin pipe, it will
only appear once in the class prototype chain

```js
import { pipe } from "@yadah/mixin";
import CustomMixin from "./CustomMixin.js";

class superclass {
  fn() {}
}

class Example extends pipe(superclass, CustomMixin, CustomMixin) {}

new Example().fn();
// logs "inside Custom.fn" (once only)
```

`dedupe()` also adds a method to the wrapped mixin function that allows
checking if a class includes the mixin:

```js
CustomMixin.extends(Example);
// true
```
