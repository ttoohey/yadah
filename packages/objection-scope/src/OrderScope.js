export default (Model) =>
  class extends Model {
    static get scopes() {
      const { ref } = this;
      return {
        ...super.scopes,
        order(query, { order }, overrides = {}) {
          if (!Array.isArray(order)) {
            throw new Error(
              `'order' scope expects order to be an array of { field, direction } objects`
            );
          }
          for (const { field, direction = "ASC" } of order) {
            if (field in overrides) {
              overrides[field](query, { field, direction });
            } else {
              query.orderBy(ref(field), direction);
            }
          }
          return query;
        },
      };
    }
  };
