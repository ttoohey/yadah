import EventEmitter from "node:events";

export default function (Service) {
  return class ServiceTransaction extends Service {
    async transaction() {
      const knex = this.knex;
      const mq = this.mq;
      let options, callback;

      if (arguments.length === 1) {
        [callback] = arguments;
        options = {};
      }
      if (arguments.length === 2) {
        [options, callback] = arguments;
      }
      if (!(options instanceof EventEmitter)) {
        options = new EventEmitter();
        Object.assign(options, arguments[0]);
      }

      const { transaction, mq: mqOpts = {} } = options;
      try {
        const result = await (mqOpts.transaction || mq).transaction(
          async (mqtrx) => {
            options.mq = {
              transaction: mqtrx,
              emit: (type, ...payload) => this.emit(type, mqtrx, ...payload),
            };
            const result = await (transaction || knex).transaction(
              (transaction) => {
                options.transaction = transaction;
                return callback(options);
              }
            );
            if (transaction) {
              options.transaction = transaction;
            } else {
              delete options.transaction;
            }
            if (!transaction || transaction.isCompleted()) {
              options.emit("committed");
            }
            return result;
          }
        );
        if (mqOpts) {
          options.mq = mqOpts;
        } else {
          delete options.mq;
        }
        return result;
      } catch (error) {
        if (transaction && !transaction.isCompleted()) {
          await transaction.rollback(error);
        }
        throw error;
      }
    }
  };
}
