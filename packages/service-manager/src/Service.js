import EventEmitter from "node:events";

export default class Service extends EventEmitter {
  constructor(subsystems = {}) {
    super();
    Object.assign(this, subsystems);
  }
  boot() {}
  async shutdown() {}
  async startup() {}

  static services = {};
}
