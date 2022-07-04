import Service from "./Service.js";

const isServiceInstance = (service) => service instanceof Service;
const isServiceClass = (ServiceClass) =>
  Object.isPrototypeOf.call(Service, ServiceClass);

export default class ServiceManager {
  #services;
  #modules;
  #subsystems;

  constructor(subsystems, serviceModules) {
    const services = {
      [Symbol.iterator]: function* () {
        for (const value of Object.values(services)) {
          yield value;
        }
      },
    };
    this.#services = services;
    this.#subsystems = { ...subsystems, services };
    if (serviceModules) {
      this.boot(serviceModules);
    }
  }
  boot(modules) {
    const services = this.#services;
    const subsystems = this.#subsystems;
    Object.entries(modules).forEach(([name, ServiceClass]) => {
      try {
        if (isServiceClass(ServiceClass)) {
          services[name] = new ServiceClass(subsystems);
        } else {
          services[name] = ServiceClass;
        }
      } catch (error) {
        error.service = ServiceClass;
        throw error;
      }
    });
    Object.values(services)
      .filter(isServiceInstance)
      .forEach((service) => {
        try {
          service.boot();
        } catch (error) {
          error.service = service;
          throw error;
        }
      });
    return services;
  }
  startup() {
    const services = this.#services;
    return Promise.all(
      Object.values(services)
        .filter(isServiceInstance)
        .map((service) => service.startup())
    );
  }
  shutdown() {
    const services = this.#services;
    return Promise.all(
      Object.values(services)
        .filter(isServiceInstance)
        .map((service) => service.shutdown())
    );
  }
  get services() {
    return this.#services;
  }
}
