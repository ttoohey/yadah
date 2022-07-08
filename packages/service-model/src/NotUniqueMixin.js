import dedupe from "@yadah/dedupe-mixin";
import NotUniqueError from "./NotUniqueError.js";

function NotUniqueMixin(superclass) {
  return class NotUnique extends superclass {
    static get QueryBuilder() {
      return class QueryBuilder extends super.QueryBuilder {
        throwIfNotUnique() {
          return this.runAfter((result) => {
            if (Array.isArray(result) && result.length > 1) {
              throw new NotUniqueError(result.length);
            }
            return result;
          });
        }
      };
    }
  };
}

export default NotUniqueMixin |> dedupe(%);
