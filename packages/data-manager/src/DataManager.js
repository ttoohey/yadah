import Domain from "./Domain.js";

const isDomainInstance = (domain) => domain instanceof Domain;
const isDomainClass = (DomainClass) =>
  Object.isPrototypeOf.call(Domain, DomainClass);

export default class DataManager {
  #domains;
  #modules;
  #subsystems;

  constructor(subsystems, domainModules) {
    const domains = {
      [Symbol.iterator]: function* () {
        for (const value of Object.values(domains)) {
          yield value;
        }
      },
    };
    this.#domains = domains;
    this.#subsystems = { ...subsystems, domains };
    if (domainModules) {
      this.boot(domainModules);
    }
  }
  boot(modules) {
    const domains = this.#domains;
    const subsystems = this.#subsystems;
    Object.entries(modules).forEach(([name, DomainClass]) => {
      try {
        if (isDomainClass(DomainClass)) {
          domains[name] = new DomainClass(subsystems);
        } else {
          domains[name] = DomainClass;
        }
      } catch (error) {
        error.domain = DomainClass;
        throw error;
      }
    });
    Object.values(domains)
      .filter(isDomainInstance)
      .forEach((domain) => {
        try {
          domain.boot();
        } catch (error) {
          error.domain = domain;
          throw error;
        }
      });
    return domains;
  }
  startup() {
    const domains = this.#domains;
    return Promise.all(
      Object.values(domains)
        .filter(isDomainInstance)
        .map((domain) => domain.startup())
    );
  }
  shutdown() {
    const domains = this.#domains;
    return Promise.all(
      Object.values(domains)
        .filter(isDomainInstance)
        .map((domain) => domain.shutdown())
    );
  }
  get domains() {
    return this.#domains;
  }
}
