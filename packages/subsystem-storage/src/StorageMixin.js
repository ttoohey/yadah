import { dedupe } from "@yadah/mixin";
import assert from "node:assert";

function StorageMixin(superclass) {
  return class Storage extends superclass {
    /**
     * Storage subsystem instance
     */
    #storage = null;

    constructor({ storage, ...subsystems }) {
      assert(storage, `"storage" subsystem must be provided`);
      super(subsystems);
      this.#storage = storage;
    }

    get storage() {
      return this.#storage;
    }
  };
}

export default dedupe(StorageMixin);
