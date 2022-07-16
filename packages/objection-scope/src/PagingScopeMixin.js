import { dedupe, pipe } from "@yadah/mixin";
import ScopeMixin from "./ScopeMixin.js";

function PagingScopeMixin(superclass) {
  const mixins = pipe(superclass, ScopeMixin);
  return class PagingScope extends mixins {
    static get scopes() {
      return {
        ...super.scopes,
        page(query, { page, size }) {
          if (size === null) {
            return query.runAfter(async (models) => {
              return {
                results: models,
                total: models.length,
              };
            });
          }
          if (size === undefined) {
            return query;
          }
          return query.page(page, size);
        },
        size(query, { page, size }) {
          if (page !== undefined) {
            return query;
          }
          return query.limit(size);
        },
      };
    }
  };
}

export default dedupe(PagingScopeMixin);
