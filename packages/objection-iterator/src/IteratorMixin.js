export default function IteratorMixin(Model) {
  return class extends Model {
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
