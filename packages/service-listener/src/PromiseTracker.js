import { EventEmitter, once } from "events";

export default class PromiseTracker extends EventEmitter {
  #sending = 0;
  watch(promise) {
    this.#sending++;
    let result;
    let error;
    return promise
      .then((r) => {
        result = r;
      })
      .catch((e) => {
        error = e;
      })
      .finally(() => {
        this.#sending--;
        if (this.#sending === 0) {
          this.emit("drained");
        }
        if (error) {
          throw error;
        }
        return result;
      });
  }

  async drain() {
    if (this.#sending > 0) {
      await once(this, "drained");
    }
  }
}
