import { dedupe } from "@yadah/mixin";
import assert from "node:assert";

function ScheduleMixin(superclass) {
  return class Schedule extends superclass {
    #schedule;
    constructor({ schedule, ...subsystems }) {
      assert(schedule, `"schedule" subsystem must be provided`);
      super(subsystems);
      this.#schedule = schedule;
    }

    get schedule() {
      return this.#schedule.bindTo(this);
    }

    /**
     * hook for derived classes to register scheduled jobs
     *
     * a background process should call this before starting schedules
     */
    registerSchedule() {}
  };
}

export default dedupe(ScheduleMixin);
