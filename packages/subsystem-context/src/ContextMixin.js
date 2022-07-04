import dedupe from "@yadah/dedupe-mixin";
import assert from "node:assert";

function ContextMixin(superclass) {
  return class Context extends superclass {
    /**
     * Context subsystem instance
     */
    context = null;

    constructor({ context, ...subsystems }) {
      assert(context, `"context" subsystem must be provided`);
      super(subsystems);
      this.context = context;
    }
  };
}

export default ContextMixin |> dedupe(%);
