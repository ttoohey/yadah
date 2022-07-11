# Objection scope mixin

A mixin for [Objection.js](https://vincit.github.io/objection.js/) which
extends the QueryBuilder to have a `scope()` method. It allows a model to define
common query building functions based on a criteria object with a well-defined
shape.

## Usage

The `Model.scopes` object maps criteria keys to functions that work in a
similar way to [`Model.modifiers`](https://vincit.github.io/objection.js/recipes/modifiers.html#modifiers). Scope modifiers accept the query object and the criteria object that was passed to the `QueryBuilder.scope()` function (this object will have a property with key that matches the `Model.scopes` key).

```js
import ScopeMixin from "@yadah/objection-scope"
import { Model } from "objection"

class MyModel extends (Model |> ScopeMixin(%)) {
  static get scopes() {
    return {
      ...super.scopes,
      keyword: (query, { keyword }) {
        return query.where("title", "like", `%${keyword}`)
      }
    }
  }
}

MyModel.query().scope({ keyword: "abc" })
// select * from "tableName" where "tableName"."title" like ?
// bindings: ["abc"]
```

## Matcher

The ScopeBuilder class can be used to help write common modifier patterns.

```js
class MyModel extends (Model |> ScopeMixin(%)) {
  static get scopes() {
    const matcher = new this.ScopeBuilder();
    return {
      ...super.scopes,
      field1: matcher,
      field2: matcher,
    };
  }
}
MyModel.query().scope({ field1: "foo", field2: "bar" });
// select * from "tableName" where "tableName"."field1" = ? and "tableName"."field2" = ?
// bindings: ["foo", "bar"]
```

The `matcher` object can be chained to produce various common types of query modifier.

```js
const matcher = new this.ScopeBuilder();
const scopes = {
  field1: matcher,
  minField2: matcher.min,
  maxField3: matcher.max,
  field4: matcher.related("related"),
  field5: matcher.notNull,
};
```

| Expression                    | Result                                                                        | Notes                         |
| ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------- |
| matcher                       | .where(fieldName, value)                                                      | if `value` is not an array    |
| matcher                       | .whereIn(fieldName, value)                                                    | if `value` is an array        |
| matcher.min                   | .where(fieldName, ">=", value)                                                |
| matcher.max                   | .where(fieldname, "<=", value)                                                |
| matcher.related(relationName) | .joinRelated(relationName).where(\`\${relationName}.\${fieldName}\`, value)   | if `value` is not an array    |
| matcher.related(relationName) | .joinRelated(relationName).whereIn(\`\${relationName}.\${fieldName}\`, value) | if `value` is an array        |
| matcher.exists                | .whereExists(Model.relatedQuery(fieldName).scope(value))                      |                               |
| matcher.notNull               | .whereNotNull(fieldname)                                                      | if `value` is true            |
| matcher.notNull               | .whereNull(fieldName)                                                         | if `value` is false           |
| matcher.name(name)            |                                                                               | changes `fieldName` to `name` |
