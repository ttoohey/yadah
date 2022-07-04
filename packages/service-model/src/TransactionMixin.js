import dedupe from "@yadah/dedupe-mixin";
import { KnexMixin } from "@yadah/subsystem-knex";
import { ContextMixin } from "@yadah/subsystem-context";
import CriticalSectionMixin from "@yadah/service-critical-section";

function ServiceTransactionMixin(superclass) {
  const mixins =
    superclass |> KnexMixin(%) |> ContextMixin(%) |> CriticalSectionMixin(%);
  return class ServiceTransaction extends mixins {
    async transaction(callback) {
      const knex = this.knex;
      const context = this.context;
      const trx = context.get("transaction");
      try {
        return await this.context(
          async (ctx) =>
            (trx || knex).transaction(async (transaction) => {
              ctx.set("transaction", transaction);
              try {
                return await callback();
              } finally {
                await this.criticalSection();
              }
            }),
          true
        );
      } catch (error) {
        if (trx && !trx.isCompleted()) {
          await trx.rollback(error);
        }
        throw error;
      }
    }
  };
}

export default ServiceTransactionMixin |> dedupe(%);
