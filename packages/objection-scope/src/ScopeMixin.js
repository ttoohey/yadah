import { dedupe } from "@yadah/mixin";
import ScopeBuilderBase from "./ScopeBuilder.js";

function ScopeMixin(superclass) {
  return class Scope extends superclass {
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
          AND.forEach((criteria) => q.where((q) => q.scope(criteria)))
        ),
      OR: (query, { OR }) =>
        query.where((q) =>
          OR.forEach((criteria) => q.orWhere((q) => q.scope(criteria)))
        ),
      NOT: (query, { NOT }) => query.whereNot((q) => q.scope(NOT)),
    };
    static get QueryBuilder() {
      return class extends super.QueryBuilder {
        scope(criteria = {}) {
          return this.modify("scope", criteria);
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
  };
}

export default dedupe(ScopeMixin);
