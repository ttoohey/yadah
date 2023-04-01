import assert from "node:assert";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import minimatch from "minimatch";
import StorageUrl from "./StorageUrl.js";
import { isUrl, isSpaceString, thenable } from "./helpers.js";

export default class Storage {
  static #config;
  static #adaptors;

  static set config(config) {
    this.#config = config;
    StorageUrl.config = config;
  }
  static set adaptors(adaptors) {
    this.#adaptors = adaptors;
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
  static #getStorageAdaptor(value) {
    const adaptors = this.#adaptors;
    const [space, spaceConfig] = Storage.#getSpaceConfig(value);
    const url = new URL(spaceConfig.url);
    const Adaptor = adaptors.find((adaptor) =>
      adaptor.protocols.includes(url.protocol)
    );
    if (!Adaptor) {
      throw new Error(`Unable to locate storage adaptor for space "${space}"`);
    }
    return new Adaptor(spaceConfig);
  }

  from(value) {
    return StorageUrl.from(value);
  }

  createReadStream(storageUrl) {
    const adaptor = Storage.#getStorageAdaptor(storageUrl.toUrl());
    return adaptor.createReadStream(storageUrl);
  }

  createWriteStream(storageUrl) {
    const adaptor = Storage.#getStorageAdaptor(storageUrl.toUrl());
    return adaptor.createWriteStream(storageUrl);
  }

  download(storageUrlLike, writable = undefined) {
    const storageUrl = StorageUrl.from(storageUrlLike);
    const readable = this.createReadStream(storageUrl);
    if (writable === undefined) {
      const result = [storageUrl, readable];
      const _then = (resolve, reject) =>
        (async () => {
          try {
            const chunks = [];
            for await (const chunk of readable) {
              chunks.push(chunk);
            }
            return resolve(Buffer.concat(chunks));
          } catch (cause) {
            const e = new Error("download failed", { cause });
            if (reject instanceof Function) {
              return reject(e);
            }
            throw e;
          }
        })();
      const _catch = (reject) => _then((result) => result, reject);
      const _finally = async (cb) => _then((result) => result).finally(cb);

      return Object.assign(result, {
        then: _then,
        catch: _catch,
        finally: _finally,
      });
    }
    return promisify(pipeline)(readable, writable).then(() => storageUrl);
  }

  upload(storageUrlLike, readable = undefined) {
    const storageUrl = StorageUrl.from(storageUrlLike);
    const writable = this.createWriteStream(storageUrl);
    if (readable === undefined) {
      return [storageUrl, writable];
    }
    return promisify(pipeline)(readable, writable)
      .then(() => storageUrl)
      .catch((cause) => {
        throw new Error("upload failed", { cause });
      });
  }

  async remove(storageUrlLike) {
    const storageUrl = StorageUrl.from(storageUrlLike);
    const adaptor = Storage.#getStorageAdaptor(storageUrl.toUrl());
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
    const adaptor = Storage.#getStorageAdaptor(fromStorageUrl.toUrl());
    await adaptor.renameObject(fromStorageUrl, toStorageUrl);
    return [fromStorageUrl, toStorageUrl];
  }

  list(storageContainerUrlLike, glob = undefined) {
    const storageContainerUrl = StorageUrl.from(storageContainerUrlLike);
    const { space, container } = storageContainerUrl.toJson();
    const adaptor = Storage.#getStorageAdaptor(storageContainerUrl.toUrl());
    const generator = async function* () {
      for await (const object of adaptor.listObjects(
        storageContainerUrl,
        glob
      )) {
        if (glob && !minimatch(object, glob)) {
          continue;
        }
        yield StorageUrl.from({ space, container, object });
      }
    };
    return thenable(generator);
  }

  listContainers(space, glob = undefined) {
    const storageSpaceUrl = StorageUrl.from([space, null, null]);
    const adaptor = Storage.#getStorageAdaptor(space);
    const generator = async function* () {
      for await (const container of adaptor.listContainers(
        storageSpaceUrl,
        glob
      )) {
        if (glob && !minimatch(container, glob)) {
          continue;
        }
        yield StorageUrl.from({ space, container, object: null });
      }
    };
    return thenable(generator);
  }

  async exists(storageUrlLike) {
    const storageUrl = StorageUrl.from(storageUrlLike);
    const adaptor = Storage.#getStorageAdaptor(storageUrl.toUrl());
    return await adaptor.objectExists(storageUrl);
  }

  async stat(storageUrlLike) {
    const storageUrl = StorageUrl.from(storageUrlLike);
    const adaptor = Storage.#getStorageAdaptor(storageUrl.toUrl());
    return await adaptor.statObject(storageUrl);
  }
}
