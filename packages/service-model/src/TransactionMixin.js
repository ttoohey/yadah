import dedupe from "@yadah/dedupe-mixin";
import { ContextMixin } from "@yadah/subsystem-context";
import { KnexMixin } from "@yadah/subsystem-knex";

export const TRANSACTION = Symbol("TRANSACTION");

function ServiceTransactionMixin(superclass) {
  const mixins = superclass |> KnexMixin(%) |> ContextMixin(%);
  return class ServiceTransaction extends mixins {
    async transaction(callback) {
      if (callback === null) {
        this.context.set(TRANSACTION, undefined);
        return;
      }
      const knex = this.knex;
      const context = this.context;
      const trx = context.get(TRANSACTION);
      try {
        return (trx || knex).transaction((transaction) =>
          this.context(async (ctx) => {
            ctx.set(TRANSACTION, transaction);
            return await callback();
          }, true)
        );
      } catch (error) {
        if (trx && !trx.isCompleted()) {
          await trx.rollback(error);
        }
        throw error;
      }
    }
    get transactionOrKnex() {
      return this.context.get(TRANSACTION) || this.knex;
    }
  };
}

export default ServiceTransactionMixin |> dedupe(%);
