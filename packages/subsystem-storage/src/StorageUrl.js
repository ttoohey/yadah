import {
  isContainerString,
  isContainerStringRegEx,
  isJson,
  isSpaceString,
  isString,
  isStringRegEx,
  isTuple,
  isUrl,
  isUrlString,
} from "./helpers.js";

export default class StorageUrl {
  static #config;
  static set config(config) {
    this.#config = config;
  }
  static #defaultSpace() {
    return Object.keys(this.#config)[0];
  }
  static #getSpaceConfig(value) {
    const config = this.#config;
    if (isUrl(value)) {
      for (const [space, spaceConfig] of Object.entries(config)) {
        const url = new URL(spaceConfig.url);
        if (value.protocol !== url.protocol) {
          continue;
        }
        if (value.hostname !== url.hostname) {
          continue;
        }
        if (!value.pathname.startsWith(url.pathname)) {
          continue;
        }
        return [space, spaceConfig];
      }
    }
    if (isSpaceString(value) && config[value]) {
      const spaceConfig = config[value];
      return [value, spaceConfig];
    }
    throw new Error(
      `Unable to locate storage space. Spaces: ${Object.keys(config).join(
        ", "
      )}`
    );
  }
  static #getStorageUrlJson(value) {
    const [space, spaceConfig] = this.#getSpaceConfig(value);
    const [container, object] = value.pathname
      .slice(new URL(spaceConfig.url).pathname.length + 1)
      .split(/\/(.*)/, 2)
      .map((value) => (value === undefined ? null : value));
    return { space, container: container, object };
  }

  #json;
  constructor(value) {
    if (isJson(value)) {
      this.#json = { space: StorageUrl.#defaultSpace(), ...value };
      return this;
    }
    if (isString(value)) {
      const [, space, container, object] = value.match(isStringRegEx);
      this.#json = { space, container, object };
      return this;
    }
    if (isContainerString(value)) {
      const [, space, container] = value.match(isContainerStringRegEx);
      this.#json = { space, container, object: null };
      return this;
    }
    if (isUrl(value) || isUrlString(value)) {
      const url = new URL(value);
      const storageUrlJson = StorageUrl.#getStorageUrlJson(url);
      if (!storageUrlJson) {
        const error = new Error("Unable to find storage space from URL");
        error.url = url;
        throw error;
      }
      this.#json = storageUrlJson;
      return this;
    }
    if (isTuple(value)) {
      if (value.length === 2) {
        const space = StorageUrl.#defaultSpace();
        const [container, object] = value;
        this.#json = { space, container, object };
      } else {
        const [space, container, object] = value;
        this.#json = { space, container, object };
      }
      return this;
    }
    throw new Error("Invalid StorageUrl");
  }
  static from(value) {
    if (value instanceof StorageUrl) {
      return new StorageUrl(value.toJson());
    }
    return new StorageUrl(value);
  }

  toString() {
    const { space, container, object } = this.#json;
    if (container === null) {
      return space;
    }
    if (object === null) {
      return `${space}:${container}`;
    }
    return `${space}:${container}/${object}`;
  }

  toUrl() {
    const { space, container, object } = this.#json;
    const { url } = StorageUrl.#config[space];
    if (container === null) {
      return new URL(url);
    }
    if (object === null) {
      return new URL(`${url}/${container}`);
    }
    return new URL(`${url}/${container}/${object}`);
  }
  toURL() {
    return this.toUrl();
  }
  toJson() {
    return this.#json;
  }
  toJSON() {
    return this.toJson();
  }

  [Symbol.iterator]() {
    const { space, container, object } = this.#json;
    return [space, container, object].values();
  }
  toArray() {
    return Array.from(this);
  }

  set object(value) {
    this.#json.object = value;
  }
}
