import minimatch from "minimatch";
import assert from "node:assert";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { Writable } from "node:stream";

function fileStorageAdaptor({
  url,
  createMissingContainer,
  deleteEmptyContainer,
}) {
  const baseUrl = new URL(url);
  async function exists(pathname) {
    try {
      assert(
        pathname.startsWith(baseUrl.pathname),
        "path must belong to space url"
      );
      await fsPromises.access(pathname);
      return true;
    } catch {
      return false;
    }
  }
  async function createContainerDirectory(dirname) {
    const doesExist = await exists(dirname);
    if (doesExist) {
      return;
    }
    if (!createMissingContainer) {
      throw new Error(
        "container not found and createMissingContainer is not set"
      );
    }
    await fsPromises.mkdir(dirname);
  }
  async function createObjectDirectory(dirname) {
    const doesExist = await exists(dirname);
    if (!doesExist) {
      await fsPromises.mkdir(dirname, { recursive: true });
    }
  }

  return {
    createReadStream(storageUrl) {
      const pathname = storageUrl.toUrl().pathname;
      return fs.createReadStream(pathname);
    },
    createWriteStream(storageUrl) {
      const pathToContainer = path.join(
        baseUrl.pathname,
        storageUrl.toJson().container
      );
      const pathToObject = storageUrl.toUrl().pathname;
      let filehandle;
      const wrapper = new Writable({
        async construct(callback) {
          try {
            await createContainerDirectory(pathToContainer);
            await createObjectDirectory(path.dirname(pathToObject));
            filehandle = await fsPromises.open(pathToObject, "w");
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
            if (filehandle) {
              await filehandle.close();
            }
            callback();
          } catch (err) {
            callback(err);
          }
        },
        async destroy(err, callback) {
          try {
            if (filehandle) {
              await filehandle.close();
            }
            callback(err);
          } catch (er) {
            callback(er || err);
          }
        },
      });
      return wrapper;
    },
    async deleteObject(storageUrl) {
      await fsPromises.unlink(storageUrl.toUrl().pathname);
      if (deleteEmptyContainer) {
        const storageContainerUrl = storageUrl.constructor.from(storageUrl);
        storageContainerUrl.object = null;
        const list = this.listObjects(storageContainerUrl);
        const object = await list.next();
        if (object.done) {
          const dirname = storageContainerUrl.toUrl().pathname;
          await fsPromises.rmdir(dirname, { recursive: true });
        }
      }
    },
    renameObject(from, to) {
      return fsPromises.rename(from.toUrl().pathname, to.toUrl().pathname);
    },
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
    },
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
    },
    async statObject(storageUrl) {
      const stat = await fsPromises.stat(storageUrl.toUrl().pathname);
      return {
        size: stat.size,
        mtime: stat.mtime,
      };
    },
    async objectExists(storageUrl) {
      return await exists(storageUrl.toUrl().pathname);
    },
  };
}
fileStorageAdaptor.protocols = ["file:"];

export default fileStorageAdaptor;
