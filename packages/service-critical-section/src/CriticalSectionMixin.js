import dedupe from "@yadah/dedupe-mixin";
import { LoggerMixin } from "@yadah/subsystem-logger";
import { types } from "node:util";

function CriticalSectionMixin(superclass) {
  const mixins = superclass |> LoggerMixin(%);
  return class CriticalSection extends mixins {
    #promises = new Map();
    criticalSection(callback) {
      let deferred;
      const key = Symbol();
      const promise = new Promise(
        (resolve, reject) => (deferred = { resolve, reject })
      )
        .catch((error) => {
          this.logger.warn(`${process.pid}: critical section was rejected`);
          this.logger.error(undefined, error);
        })
        .finally(() => {
          this.#promises.delete(key);
        });
      this.#promises.set(key, promise);
      const result =
        callback instanceof Function ? callback.call(this) : callback;
      if (typeof result !== "object") {
        deferred.resolve();
        return result;
      }
      if (types.isPromise(result)) {
        return result
          .then((result) => {
            deferred.resolve();
            return result;
          })
          .catch((error) => {
            deferred.reject(error);
            throw error;
          });
      }
      if (types.isGeneratorObject(result)) {
        return (async function* () {
          try {
            for await (const data of result) {
              yield data;
            }
            deferred.resolve();
          } catch (error) {
            deferred.reject(error);
            throw error;
          }
        })();
      }
      deferred.resolve();
      return result;
    }

    async shutdown() {
      const promises = Array.from(this.#promises.values());
      if (promises.length > 0) {
        try {
          this.logger.debug(
            `${process.pid}: waiting for critical section to complete (${this.constructor.name})`
          );
          await Promise.all(promises);
          this.logger.debug(`${process.pid}: critical section completed`);
        } catch (error) {
          this.logger.error(`${process.pid}: critical section rejected`, error);
        }
      }
      return super.shutdown();
    }
  };
}

export default CriticalSectionMixin |> dedupe(%);
