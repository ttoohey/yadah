import dedupe from "@yadah/dedupe-mixin";
import ScopeBuilderBase from "./ScopeBuilder.js";

function ScopeMixin(Model) {
  return class Scope extends Model {
    #relationScopes;
    constructor() {
      super();
      this.#relationScopes = {};
    }
    static get modifiers() {
      const scopes = this.scopes;
      return {
        ...super.modifiers,
        scope(query, params) {
          for (const key of Object.keys(params)) {
            if (!(key in scopes)) {
              throw new Error(`${key} is not in scopes`);
            }
            if (params[key] === undefined) {
              continue;
            }
            let scope = scopes[key];
            if (scope instanceof ScopeBuilderBase) {
              scope = scope.resolve(key);
            }
            query = scope(query, params) || query;
          }
          return query;
        },
      };
    }
    static scopes = {
      AND: (query, { AND }) =>
        query.where((q) =>
          AND.forEach((params) => q.where((q) => q.scope(params)))
        ),
      OR: (query, { OR }) =>
        query.where((q) =>
          OR.forEach((params) => q.orWhere((q) => q.scope(params)))
        ),
      NOT: (query, { NOT }) => query.whereNot((q) => q.scope(NOT)),
    };
    static get QueryBuilder() {
      return class extends super.QueryBuilder {
        scope(params = {}) {
          return this.modify("scope", params);
        }
      };
    }
    static get ScopeBuilder() {
      const Model = this;
      return class ScopeBuilder extends ScopeBuilderBase {
        constructor() {
          super(Model);
        }
      };
    }

    $relatedQuery(relationName, transactionOrKnex) {
      const builder = super.$relatedQuery(relationName, transactionOrKnex);
      if (this.#relationScopes[relationName]) {
        return builder.scope(this.#relationScopes[relationName]);
      }
      return builder;
    }
    $setRelationScope(relationName, scope) {
      if (
        !Object.hasOwnProperty.call(
          this.constructor.relationMappings,
          relationName
        )
      ) {
        throw new Error(
          `A model class ${this.constructor.name} doesn't have relation ${relationName}`
        );
      }
      this.#relationScopes[relationName] = scope;
    }
  };
}

export default ScopeMixin |> dedupe(%);
