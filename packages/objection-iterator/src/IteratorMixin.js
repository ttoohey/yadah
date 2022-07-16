import { dedupe } from "@yadah/mixin";

function IteratorMixin(superclass) {
  return class Iterator extends superclass {
    static get QueryBuilder() {
      return class extends super.QueryBuilder {
        async *[Symbol.asyncIterator]() {
          const Model = this.resultModelClass();
          for await (const data of this.toKnexQuery().stream().iterator()) {
            const model = Model.fromJson(data);
            model.$afterFind(this.context());
            yield model;
          }
        }
      };
    }
  };
}

export default dedupe(IteratorMixin);
