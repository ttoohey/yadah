# Objection Copy mixin

A mixin for [Objection.js](https://vincit.github.io/objection.js/) which
adds a `copyFromCsv()` static function to Model classes. It allows streaming
CSV data to objection model tables.

Uses SQL `COPY FROM` to perform data import.

# Usage

```js
import { mixin, Model } from "objection";
import CopyMixin from "@yadah/objection-copy";

class MyModel extends mixin(Model, [CopyMixin]) {
  static tableName = "mytable";
}

const fromStream = Readble.from(`"foo 1","bar 1"\n"foo 2","bar 2"`);
const columns = ["field1", "field2"];
const rowCount = await MyModel.copyFromCsv(fromStream, columns); // 2
```
