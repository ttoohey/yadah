# Filesystem storage adaptor

A storage adaptor for the
[Yadah storage subsystem](https://www.npmjs.com/package/@yadah/subsystem-storage)
that uses the local filesystem for object storage.

## Usage

Include the `FileStorageAdaptor` class in the `adaptors` list. Any
storage spaces using the `file:` protocol will be handled by the class.

```js
import createStorage from "@yadah/subsystem-storage";
import FileStorageAdaptor from "@yadah/storage-fs";

const storage = createStorage(
  {
    demo: {
      url: "file:///tmp/storage/demo",
      readonly: false,
      createMissingContainer: true,
      deleteEmptyContainer: true,
    },
  },
  [FileStorageAdaptor]
);
```

## Configuration

### Config.url

_required_

Provide a string or `URL` object referencing the root folder in the local
filesystem for objects to be stored in.

### Config.readonly

_default: `false`_

Set to `true` to prevent mutating operations (write, delete, etc).

### Config.createMissingContainer

_default: `false`_

Whether to automatically create a folder for containers. If set to `false`
(the default), any containers the application uses should be created via
some other means before attempting to store objects.

### Config.deleteEmptyContainer

_default: `false`_

Whether to automatically delete a container folder when the folder is empty.
