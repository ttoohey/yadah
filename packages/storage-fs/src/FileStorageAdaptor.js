import minimatch from "minimatch";
import assert from "node:assert";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { Writable } from "node:stream";

export default class FileStorageAdaptor {
  static protocols = ["file:"];

  #baseUrl;
  #readonly;
  #createMissingContainer;
  #deleteEmptyContainer;

  constructor({ url, readonly, createMissingContainer, deleteEmptyContainer }) {
    this.#baseUrl = new URL(url);
    this.#readonly = Boolean(readonly);
    this.#createMissingContainer = createMissingContainer;
    this.#deleteEmptyContainer = deleteEmptyContainer;
  }

  async #exists(pathname) {
    assert(
      pathname.startsWith(this.#baseUrl.pathname),
      "path must belong to space url"
    );
    return await fsPromises
      .access(pathname)
      .then(() => true)
      .catch(() => false);
  }

  async #createContainerDirectory(dirname) {
    assert(!this.#readonly, "Cannot create container directory when readonly");
    const doesExist = await this.#exists(dirname);
    if (doesExist) {
      return;
    }
    if (!this.#createMissingContainer) {
      throw new Error(
        "container not found and createMissingContainer is not set"
      );
    }
    await fsPromises.mkdir(dirname);
  }

  async #createObjectDirectory(dirname) {
    assert(!this.#readonly, "Cannot create object directory when readonly");
    const doesExist = await this.#exists(dirname);
    if (!doesExist) {
      await fsPromises.mkdir(dirname, { recursive: true });
    }
  }

  createReadStream(storageUrl) {
    const pathname = storageUrl.toUrl().pathname;
    return fs.createReadStream(pathname);
  }

  createWriteStream(storageUrl) {
    assert(!this.#readonly, "Cannot write to storage when readonly");
    const createContainerDirectory = this.#createContainerDirectory.bind(this);
    const createObjectDirectory = this.#createObjectDirectory.bind(this);
    const pathToContainer = path.join(
      this.#baseUrl.pathname,
      storageUrl.toJson().container
    );
    const pathToObject = storageUrl.toUrl().pathname;
    let dtemp;
    let tmpname;
    let filehandle;
    return new Writable({
      async construct(callback) {
        try {
          await createContainerDirectory(pathToContainer);
          await createObjectDirectory(path.dirname(pathToObject));
          dtemp = await fsPromises.mkdtemp(pathToObject);
          tmpname = path.join(dtemp, ".tmp");
          filehandle = await fsPromises.open(tmpname, "w");
          callback();
        } catch (err) {
          callback(err);
        }
      },
      write(chunk, encoding, callback) {
        fs.write(filehandle.fd, chunk, callback);
      },
      async final(callback) {
        try {
          await filehandle.close();
          await fsPromises.rename(tmpname, pathToObject);
          await fsPromises.rmdir(dtemp);
          callback();
        } catch (err) {
          callback(err);
        }
      },
      async destroy(err, callback) {
        try {
          if (err && dtemp) {
            await fsPromises.unlink(tmpname);
            await fsPromises.rmdir(dtemp);
          }
          callback(err);
        } catch (er) {
          callback(er || err);
        }
      },
    });
  }

  async deleteObject(storageUrl) {
    assert(!this.#readonly, "Cannot delete file when readonly");
    await fsPromises.unlink(storageUrl.toUrl().pathname);
    if (this.#deleteEmptyContainer) {
      const storageContainerUrl = storageUrl.constructor.from(storageUrl);
      storageContainerUrl.object = null;
      const list = this.listObjects(storageContainerUrl);
      const object = await list.next();
      if (object.done) {
        const dirname = storageContainerUrl.toUrl().pathname;
        await fsPromises.rmdir(dirname, { recursive: true });
      }
    }
  }

  renameObject(from, to) {
    assert(!this.#readonly, "Cannot rename file when readonly");
    return fsPromises.rename(from.toUrl().pathname, to.toUrl().pathname);
  }

  async *listObjects(
    storageContainerUrl,
    glob = undefined,
    objectPath = undefined
  ) {
    const dirname = path.join(
      ...[storageContainerUrl.toUrl().pathname, objectPath].filter(Boolean)
    );
    const dir = await fsPromises.opendir(dirname);
    for await (const dirent of dir) {
      if (dirent.name[0] === ".") {
        continue;
      }
      if (dirent.isDirectory()) {
        for await (const object of this.listObjects(
          storageContainerUrl,
          glob,
          path.join(...[objectPath, dirent.name].filter(Boolean))
        )) {
          yield object;
        }
        continue;
      }
      if (dirent.isFile()) {
        const name = dirent.name;
        const object = objectPath ? path.join(objectPath, name) : name;
        if (glob && !minimatch(object, glob)) {
          continue;
        }
        yield object;
        continue;
      }
    }
  }

  async *listContainers(storageSpaceUrl, glob = undefined) {
    const dirname = storageSpaceUrl.toUrl().pathname;
    const dir = await fsPromises.opendir(dirname);
    for await (const dirent of dir) {
      if (dirent.name[0] === ".") {
        continue;
      }
      if (!dirent.isDirectory()) {
        continue;
      }
      const container = dirent.name;
      if (glob && !minimatch(container, glob)) {
        continue;
      }
      yield container;
    }
  }

  async statObject(storageUrl) {
    const stat = await fsPromises.stat(storageUrl.toUrl().pathname);
    return {
      size: stat.size,
      mtime: stat.mtime,
    };
  }

  async objectExists(storageUrl) {
    return await this.#exists(storageUrl.toUrl().pathname);
  }
}
