import dedupe from "@yadah/dedupe-mixin";
import { ContextMixin } from "@yadah/subsystem-context";
import { KnexMixin } from "@yadah/subsystem-knex";

export const TRANSACTION = Symbol("TRANSACTION");

function TransactionMixin(superclass) {
  const mixins = superclass |> KnexMixin(%) |> ContextMixin(%);
  return class Transaction extends mixins {
    get transaction() {
      return async (callback) => {
        const knex = this.knex;
        const trx = this.context.get(TRANSACTION);
        try {
          return await (trx || knex).transaction((trx) =>
            this.context(() => {
              this.transaction = trx;
              return callback();
            })
          );
        } catch (error) {
          if (trx && !trx.isCompleted()) {
            await trx.rollback(error);
          }
          throw error;
        }
      };
    }
    set transaction(trx) {
      this.context.set(TRANSACTION, trx);
    }
    get transactionOrKnex() {
      return this.context.get(TRANSACTION) || this.knex;
    }
  };
}

export default TransactionMixin |> dedupe(%);
