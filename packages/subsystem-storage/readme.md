# Yadah Storage subsystem

A [Yadah](https://www.npmjs.com/package/@yadah/yadah) subsystem and Domain class
mixin that provides object storage functionality.

## Concepts

- **Object** - a piece of data represented as a stream of bytes; a file
- **Container** - a folder containing related objects
- **Space** - a location where containers of objects are stored
- **Adaptor** - a class that implements primitive methods for object storage
  and retrieval

The storage subsystem is initialised with a configuration that defines one
or more _spaces_. It may then be used to upload & download objects to/from
containers in those spaces.

Storage spaces may reside in cloud services (eg. Google Cloud Storage or AWS
S3), other networked file storage systems (eg. FTP), or a local filesystem (eg.
a shared NFS volume).

## Basic usage

```js
import createStorage, { StorageMixin } from "@yadah/subsystem-storage";
import FilesystemStorageAdaptor from "@yadah/storage-fs";
import DataManager, { Domain } from "@yadah/data-manager";
import { pipe } from "@yadah/mixin";
import { createReadStream } from "node:fs";

class MyDomain extends pipe(Domain, StorageMixin) {
  async saveFileToStorage(filename) {
    const readable = createReadStream(filename);
    await this.storage.upload(["containerName", "objectName"], readable);
  }

  async saveObjectToStorage(object) {
    await this.storage.upload(
      ["containerName", "objectName"],
      JSON.stringify(object)
    );
  }
}

// create subsystems
const storage = createStorage(
  {
    demo: {
      url: "file:///tmp/storage/demo",
    },
  },
  [FilesystemStorageAdaptor]
);

// create and boot domains
const dataManager = new DataManager({ storage });
const domains = dataManager.boot({ MyDomain });

// start domains
await dataManager.startup();

// copies a file to the storage space
await domains.MyDomain.saveFileToStorage("/path/to/a/file");

// writes an object to storage
await domains.MyDomain.saveObjectToStorage({ foo: "bar" });

// shutdown domains
await dataManager.shutdown();
```

## API

### createStorage(spaces, adaptors)

- **`spaces`** - `{ [name]: SpaceConfig, ... }`
- **`adaptors`** - `StorageAdaptor[]`
- Returns: `Storage`

Creates a Storage subsystem.

A `SpaceConfig` object is a configuration object defining each space. A space
must have a `url` property that points to the space's root path.

The optional `readonly` property is used by storage adaptors to restrict use
of mutating functions.

Adaptors may define additional configuration properties such as credentials
or other protocol specific policies.

```js
{
  [spaceName]: { url, readonly, ...adaptorConfig },
  [spaceName]: { url, readonly, ...adaptorConfig },
  ...
}
```

The `adaptors` array is a list of classes that implement the
[`StorageAdaptor`](./doc/adaptor-api.md) interface.

### storage.from(storageUrlLike)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `StorageUrl`

Create a `StorageUrl` instance from the given value.

### storage.createReadStream(storageUrl)

- **`storageUrl`** - `StorageUrl`
- Returns: `Readable`

Creates a `Readable` stream to allow reading the object data at the specified
`storageUrl`.

### storage.createWriteStream(storageUrl)

- **`storageUrl`** - `StorageUrl`
- Returns: `Writable`

Creates a `Writable` stream to allow writing the object data to the specified
`storageUrl`.

### storage.download(storageUrlLike)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `[StorageUrl, Readable]` | `Thenable<Buffer>`

Parses the `storageUrlLike` value to a `StorageUrl` instance and returns a tuple
containing the `StorageUrl` instance and a `Readable` stream.

```js
const [storageUrl, readable] = storage.download([containerName, objectName]);
console.log(`downloading ${storageUrl.toUrl()}`);
await stream.promises.pipeline(readable, response);
```

The return value is `thenable` so it may be used as a `Promise` to read the
object data to a `Buffer`.

```js
const buffer = await storage.download([containerName, objectName]);
```

### storage.download(storageUrlLike, writable)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- **`writable`** - `Writable`
- Returns: `Promise<StorageUrl>`

Parses the `storageUrlLike` value to a `StorageUrl` and returns a `Promise` that
resolves with the `StorageUrl` instance once the object data has been
downloaded and piped to the `Writable` stream.

```js
const writable = fs.createWriteStream("/path/to/a/file");
const storageUrl = await storage.download(
  [containerName, objectName],
  writable
);
```

### storage.upload(storageUrlLike)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `[StorageUrl, Writable]`

Parses the `storageUrlLike` value to a `StorageUrl` instance and returns a tuple
containing the `StorageUrl` instance and a `Writable` stream.

```js
const [storageUrl, writable] = storage.upload([containerName, objectName]);
console.log(`uploading ${storageUrl.toUrl()}`);
await stream.promises.pipeline(data, writable);
```

### storage.upload(storageUrlLike, readable)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- **`readable`** - `Readable` | `Buffer` | `string`
- Returns: `Promise<StorageUrl>`

Parses the `storageUrlLike` value to a `StorageUrl` and returns a `Promise` that
resolves with the `StorageUrl` instance once the object data has been streamed
from `readable` to storage.

```js
const readable = fs.createReadStream("/path/to/a/file");
const storageUrl = await storage.upload([containerName, objectName], readable);
```

### storage.remove(storageUrlLike)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `Promise<StorageUrl>`

Parses the `storageUrlLike` value to a `StorageUrl` instance and returns a
`Promise` that resolves to the `StorageUrl` instance once the object has been
deleted from storage.

### storage.rename(fromStorageUrlLike, toStorageUrlLike)

- **`fromStorageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- **`toStorageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `Promise<[from: StorageUrl, to: StorageUrl]>`

Parses the `fromStorageUrlLike` and `toStorageUrlLike` values to `StorageUrl`
instances and returns a `Promise` that resolves with a tuple containing the
`StorageUrl` instances once the object at the `from` location has been renamed
to the `to` location.

The `from` and `to` locations must be in the same storage space.

### storage.exists(storageUrlLike)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `Promise<boolean>`

Returns a `Promise` that resolves with `true` if there is an object at the
location specified in `storageUrlLike` and `false` if there is not.

### storage.stat(storageUrlLike)

- **`storageUrlLike`** - `string` | `string[]` | `{space, container, object}` | `StorageUrl`
- Returns: `Promise<{ size: number, mtime: Date }>`

Returns a `Promise` that resolves with an object specifying the object size in
bytes, and the object's last modified time.

### storage.listContainers(space[, glob])

- **`space`** - `string`
- **`glob`** - `string`; a `minimatch` glob pattern
- Returns: `AsyncIterable<StorageContainerUrl>` | `Thenable<StorageContainerUrl[]>`

Returns an `AsyncIterable` yielding the `StorageContainerUrl` instances in
the specified space. If a `glob` string is provided it is used to filter the
list of containers by name.

```js
const storageContainerUrls = storage.listContainers(spaceName);
for await (const storageContainerUrl of storageContainerUrls) {
  // do something with storageContainerUrl
}
```

The return value is also `thenable` which allows using it as a `Promise` that resolves
with an array of the `StorageContainerUrl` instances.

```js
const storageContainerUrls = await storage.listContainers(spaceName);
for (const storageContainerUrls of storageContainerUrls) {
  // do something with storageContainerUrl
}
```

_NOTE: depending on the Storage Adaptor, listing containers may require exhaustively listing objects in a storage space which may have performance implications._

### storage.list(storageContainerUrlLike[, glob])

- **`storageContainerUrlLike`** - `string` | `[string, null]` `[string, string, null]` | `{space, container, object: null}` | `StorageContainerUrl`
- **`glob`** - `string`; a `minimatch` glob pattern
- Returns: `AsyncIterable<StorageUrl>` | `Thenable<StorageUrl[]>`

Returns an `AsyncIterable` yielding the `StorageUrl` instances of objects in
the specified container. If a `glob` string is provided it is used to filter the
list of objects by name (using `minimatch`).

```js
const storageUrls = storage.list([containerName, null], "*");
for await (const storageUrl of storageUrls) {
  // do something with storageUrl
}
```

The return value is also `thenable` which allows using it as a `Promise` that
resolves with an array of the `StorageUrl` instances.

```js
const storageUrls = await storage.list([containerName, null], "*");
for (const storageUrl of storageUrls) {
  // do something with storageUrl
}
```

### StorageUrl.from(value)

- **`value`** - `string` | `[string, string | null]` `[string, string, string | null]` | `{space, container, object: string | null}` | `StorageUrl`
- Returns: `StorageUrl`

Constructs a `StorageUrl` instance from one of the accepted forms:

- internal stringified form: a `string` matching `space ":" container ["/" object]`
- external stringified form: a `string` that can be parsed with `URL`
- a 2-tuple: `[container: string, object: string | null]`
- a 3-tuple: `[space: string, container: string, object: string | null]`
- an object: `{ space: string, container: string, object: string | null }`

A `StorageContainerUrl` is a `StorageUrl` where the `object` property is `null`.

### storageUrl.toString()

- Returns: `string`

Constructs the internal stringified form representing the storage location

```
space ":" container ["/" object]
```

### storageUrl.toUrl()

- Returns: `URL`

Constructs a `URL` object representing the storage location.

`storageUrl.toURL()` is an alias for `storageUrl.toUrl()`.

### storageUrl.toJson()

- Returns: `{ space: string, container: string, object: string | null }`

Constructs an object representing the storage location.

`storageUrl.toJSON()` is an alias for `storageUrl.toJson()`.

### storageUrl.toArray()

- Returns: `[string, string, string | null]`

Constructs a 3-tuple representing the storage location.

### StorageMixin

The `StorageMixin` function adds a `.storage` property to domain classes to
provide access to the Storage instance.

An error will be thrown if no `storage` subsystem is provided during the `boot`
lifecycle.
