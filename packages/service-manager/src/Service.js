import EventEmitter from "node:events";

export default class Service extends EventEmitter {
  static services = {};
  constructor(subsystems) {
    super();
    Object.assign(this, subsystems);
  }
  boot() {}
  async startup() {}
  async shutdown() {}
}
