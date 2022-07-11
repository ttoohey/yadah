import dedupe from "@yadah/dedupe-mixin";
import assert from "node:assert";

function LoggerMixin(superclass) {
  return class Logger extends superclass {
    /**
     * Logger subsystem instance
     */
    #logger;

    constructor({ logger, ...subsystems }) {
      assert(logger, `"logger" subsystem must be provided`);
      super(subsystems);
      this.#logger = logger;
    }

    get logger() {
      return this.#logger;
    }
  };
}

export default LoggerMixin |> dedupe(%);
