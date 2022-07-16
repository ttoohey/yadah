import EventEmitter from "node:events";

export default class Domain extends EventEmitter {
  static domains = {};
  constructor(subsystems) {
    super();
    Object.assign(this, subsystems);
  }
  boot() {}
  async startup() {}
  async shutdown() {}
}
