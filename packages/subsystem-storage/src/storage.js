import assert from "node:assert";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import minimatch from "minimatch";

const isStringRegEx = /^([^:]+):([^/]+)\/(.+)$/;
const isSpaceStringRegEx = /^([^:]+)$/;

function isString(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.match(isStringRegEx);
}

function isSpaceString(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.match(isSpaceStringRegEx);
}

function isUrlString(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}

function isJson(value) {
  if (typeof value !== "object") {
    return false;
  }
  if (value.space && typeof value.space !== "string") {
    return false;
  }
  if (typeof value.container !== "string" && value.container !== null) {
    return false;
  }
  if (typeof value.object !== "string" && value.object !== null) {
    return false;
  }
  if (value.container === null && value.object !== null) {
    return false;
  }
  return true;
}

function isTuple(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length !== 2 && value.length !== 3) {
    return false;
  }
  const [container, object] = value.slice(-2);
  if (typeof container !== "string" && container !== null) {
    return false;
  }
  if (typeof object !== "string" && object !== null) {
    return false;
  }
  if (container === null && object !== null) {
    return false;
  }
  return true;
}

function isUrl(value) {
  return value instanceof URL;
}

function storage(config, adaptors) {
  function defaultSpace() {
    return Object.keys(config)[0];
  }
  function getSpaceConfig(value) {
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
    throw new Error("Unable to locate storage space");
  }
  function getStorageAdaptor(value) {
    const [, spaceConfig] = getSpaceConfig(value);
    const url = new URL(spaceConfig.url);
    const adaptor = adaptors.find((adaptor) =>
      adaptor.protocols.includes(url.protocol)
    );
    if (!adaptor) {
      throw new Error("Unable to locate storage adaptor");
    }
    return adaptor(spaceConfig);
  }
  function getStorageUrlJson(value) {
    const [space, spaceConfig] = getSpaceConfig(value);
    const [container, object] = value.pathname
      .slice(spaceConfig.url.pathname.length)
      .split("/");
    return { space, container, object };
  }

  class StorageUrl {
    #json;
    constructor(value) {
      if (isJson(value)) {
        this.#json = { space: defaultSpace(), ...value };
        return this;
      }
      if (isString(value)) {
        const [, space, container, object] = value.match(isStringRegEx);
        this.#json = { space, container, object };
        return this;
      }
      if (isUrl(value) || isUrlString(value)) {
        const url = new URL(value);
        const storageUrlJson = getStorageUrlJson(url);
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
          const space = defaultSpace();
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
      const { url } = config[space];
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

  class Storage {
    from(value) {
      return StorageUrl.from(value);
    }

    createReadStream(storageUrl) {
      const adaptor = getStorageAdaptor(storageUrl.toUrl());
      return adaptor.createReadStream(storageUrl);
    }

    createWriteStream(storageUrl) {
      const adaptor = getStorageAdaptor(storageUrl.toUrl());
      return adaptor.createWriteStream(storageUrl);
    }

    download(storageUrlLike, writable = undefined) {
      const storageUrl = StorageUrl.from(storageUrlLike);
      const readable = this.createReadStream(storageUrl);
      if (!writable) {
        return [storageUrl, readable];
      }
      return promisify(pipeline)(readable, writable).then(() => storageUrl);
    }

    upload(storageUrlLike, readable = undefined) {
      const storageUrl = StorageUrl.from(storageUrlLike);
      const writable = this.createWriteStream(storageUrl);
      if (!readable) {
        return [storageUrl, writable];
      }
      return promisify(pipeline)(readable, writable).then(() => storageUrl);
    }

    async remove(storageUrlLike) {
      const storageUrl = StorageUrl.from(storageUrlLike);
      const adaptor = getStorageAdaptor(storageUrl.toUrl());
      await adaptor.deleteObject(storageUrl);
      return storageUrl;
    }

    async rename(fromStorageUrlLike, toStorageUrlLike) {
      const fromStorageUrl = StorageUrl.from(fromStorageUrlLike);
      const toStorageUrl = StorageUrl.from(toStorageUrlLike);
      assert(
        fromStorageUrl.toJson().space === toStorageUrl.toJson().space,
        '"from" and "to" space must be the same to rename'
      );
      const adaptor = getStorageAdaptor(fromStorageUrl.toUrl());
      await adaptor.renameObject(fromStorageUrl, toStorageUrlLike);
      return [fromStorageUrl, toStorageUrl];
    }

    async *list(storageContainerUrl, glob = undefined) {
      const { space, container } = storageContainerUrl.toJson();
      const adaptor = getStorageAdaptor(storageContainerUrl.toUrl());
      for await (const object of adaptor.listObjects(
        storageContainerUrl,
        glob
      )) {
        if (glob && !minimatch(object, glob)) {
          continue;
        }
        yield StorageUrl.from({ space, container, object });
      }
    }

    async *listContainers(space, glob = undefined) {
      const storageSpaceUrl = StorageUrl.from([space, null, null]);
      const adaptor = getStorageAdaptor(space);
      for await (const container of adaptor.listContainers(
        storageSpaceUrl,
        glob
      )) {
        if (glob && !minimatch(container, glob)) {
          continue;
        }
        yield StorageUrl.from({ space, container, object: null });
      }
    }

    async exists(storageUrlLike) {
      const storageUrl = StorageUrl.from(storageUrlLike);
      const adaptor = getStorageAdaptor(storageUrl.toUrl());
      return await adaptor.objectExists(storageUrl);
    }

    async stat(storageUrlLike) {
      const storageUrl = StorageUrl.from(storageUrlLike);
      const adaptor = getStorageAdaptor(storageUrl.toUrl());
      return await adaptor.statObject(storageUrl);
    }
  }

  return new Storage();
}

export default storage;
