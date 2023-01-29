import EventEmitter from "node:events";

export default class Domain extends EventEmitter {
  /**
   * object containing all domains defined by the application
   */
  static domains = {};
  constructor(subsystems) {
    super();
    Object.assign(this, subsystems);
  }
  /**
   * lifecycle method to perform synchronous initialisation
   */
  boot() {}
  /**
   * lifecycle method to perform asynchronous initialisation
   */
  async startup() {}
  /**
   * lifecycle method to perform cleanup tasks
   */
  async shutdown() {}
}
