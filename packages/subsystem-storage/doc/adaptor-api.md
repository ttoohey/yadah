# Storage adaptor API

_This API is intended for implementers of custom storage adapators_

A Storage Adaptor is a class that implements the following interface:

```ts
interface StorageAdaptor {
  constructor({ url, readonly, ...rest }: ConfigOptions): StorageAdaptor;

  createReadStream(storageUrl: StorageUrl): Readable;

  createWriteStream(storageUrl: StorageUrl): Writable;

  deleteObject(storageUrl: StorageUrl): Promise<void>;

  renameObject(from: StorageUrl, to: storageUrl): Promise<void>;

  listObjects(
    storageContainerUrl: StorageUrl,
    glob?: string
  ): AsyncGenerator<string>;

  listContainers(
    storageSpaceUrl: StorageUrl,
    glob?: string
  ): AsyncGenerator<string>;

  statObject(storageUrl: StorageUrl): Promise<{ size: int; mtime: Date }>;

  objectExists(storageUrl: StorageUrl): Promise<boolean>;
}
```

## protocols

The static `protocols` array lists the URL protocols the adaptor implements
functionality for. The protocol value is as parsed by the `URL` class.

For example, given a URL `cloud://bucket/container/object-name`, the protocol
would be `cloud:`. An adaptor that implements functionality for URLs of this
form would use:

```js
class CloudStorageAdaptor {
  static protocols: ["cloud:"];
}
```

## constructor

The constructor is provided with the `ConfigOptions` object corresponding to
the space matching the `StorageUrl` being used.

### ConfigOption.url

Applications using the storage subsystem specify a root location for the
"storage space" as a `URL` string. The adaptor should use this location to
identify where to read and write file objects to.

### ConfigOption.readonly

If the `readonly` property is set to `true` the adaptor should not allow
mutating methods to make changes to the stored objects.

### ConfigOption[...rest]

The rest of the config options may contain any information the adaptor requires.
This may include details such as credentials. The adaptor should specify
how these options are provided.

## createReadStream

Returns a readable stream for the given Storage URL object allowing the
object data to be read.

If the object is unable to be read, the stream should be destroyed with an
Error object.

## createWriteStream

Creates an object at the specified Storage URL and returns a writable stream
allowing the object data to be written.

If an object already exists at the Storage URL, it should be replaced by the new object only when the writable stream ends. If the writable stream is destroyed
the existing object should not be altered.

If the object is unable to be written, the stream should be destroyed with an
Error object.

## deleteObject

Removes the object from storage.

## renameObject

Renames an object in storage.

## listObjects

Returns a generator that yields the name of each object for the given
container Storage URL.

If a `glob` pattern is supplied, only objects whose name matches the specified
glob pattern should be yielded.

## listContainers

Returns a generator that yields the name of each container for the given
space Storage URL.

If a `glob` pattern is supplied, only containers whose name matches the
specified glob pattern should be yielded.

## statObject

Read the file size (`size`) and last modified time (`mtime`) of the specified
object.

## objectExists

Check if an object has been saved at the given Storage URL.

# Notes

- container names may contain any characters except `/`
- object names may contain any characters (including `/`)
