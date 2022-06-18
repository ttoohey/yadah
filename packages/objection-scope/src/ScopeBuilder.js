import * as pluralizePkg from "pluralize";

const { singular } = pluralizePkg;
const notNullSymbol = Symbol.for("notNull");

class ScopeBuilder {
  constructor(modelClass) {
    this.modelClass = modelClass;
    this.params = {
      notNull: false,
      name: (name) => name,
      operator: "=",
      relationName: null,
    };
  }

  set(params) {
    this.params = { ...this.params, ...params };
    return this;
  }

  get clone() {
    const ScopeBuilder = this.constructor;
    const clone = new ScopeBuilder(this.modelClass);
    return clone.set(this.params);
  }

  name(name) {
    return this.clone.set({ name });
  }

  resolve(key) {
    const { ref } = this.modelClass;
    const { exists, notNull, name, operator, relationName, ignoreIfNull } =
      this.params;
    let fieldName = name instanceof Function ? name(key) : name;
    return (query, params) => {
      if (exists) {
        const Model = this.modelClass;
        return query.whereExists(
          Model.relatedQuery(fieldName).scope(params[key])
        );
      }
      if (relationName) {
        query.joinRelated(relationName);
      }
      if (notNull) {
        if (relationName) {
          fieldName = `${relationName}.${fieldName}`;
        }
        if (params[key]) {
          return query.whereNotNull(ref(fieldName));
        } else {
          return query.whereNull(ref(fieldName));
        }
      }
      if (Array.isArray(params[key])) {
        fieldName = singular(fieldName);
        if (relationName) {
          fieldName = `${relationName}.${fieldName}`;
        }
        return query.whereIn(ref(fieldName), params[key]);
      }
      if (relationName) {
        fieldName = `${relationName}.${fieldName}`;
      }
      if (operator === "=") {
        if (params[key] === null) {
          return query.whereNull(ref(fieldName));
        }
        if (params[key] === notNullSymbol) {
          return query.whereNotNull(ref(fieldName));
        }
      }
      if (ignoreIfNull) {
        if (params[key] === null) {
          return query;
        }
      }
      return query.where(ref(fieldName), operator, params[key]);
    };
  }

  get notNull() {
    return this.clone.set({ notNull: true });
  }

  get max() {
    return this.clone.set({
      operator: "<=",
      ignoreIfNull: true,
      name: (name) => name.replace(/^max(.)/, (_, c) => c.toLowerCase()),
    });
  }

  get min() {
    return this.clone.set({
      operator: ">=",
      ignoreIfNull: true,
      name: (name) => name.replace(/^min(.)/, (_, c) => c.toLowerCase()),
    });
  }

  get exists() {
    return this.clone.set({
      exists: true,
    });
  }

  related(relationName, name = null) {
    const params = {};
    if (relationName) {
      params.relationName = relationName;
    }
    if (name) {
      params.name = name;
    }
    return this.clone.set(params);
  }
}

export default ScopeBuilder;
