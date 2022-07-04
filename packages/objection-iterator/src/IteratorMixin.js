import dedupe from "@yadah/dedupe-mixin";

function IteratorMixin(superclass) {
  return class Iterator extends superclass {
    static get QueryBuilder() {
      return class extends super.QueryBuilder {
        async *[Symbol.asyncIterator]() {
          const modelClass = this.resultModelClass();
          for await (const data of this.toKnexQuery().stream()) {
            const modelInstance = modelClass.fromJson(data);
            modelInstance.$afterFind(this.context());
            yield modelInstance;
          }
        }
      };
    }
  };
}

export default IteratorMixin |> dedupe(%);
