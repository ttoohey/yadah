import { dedupe } from "@yadah/mixin";
import assert from "node:assert";

function KnexMixin(superclass) {
  return class Knex extends superclass {
    /**
     * Knex subsystem instance
     */
    #knex = null;

    constructor({ knex, ...subsystems }) {
      assert(knex, `"knex" subsystem must be provided`);
      super(subsystems);
      this.#knex = knex;
    }

    get knex() {
      return this.#knex;
    }
  };
}

export default dedupe(KnexMixin);
