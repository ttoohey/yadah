```js
import fs from "@yadah/storage-fs";
import s3 from "@yadah/storage-s3";

const config = {
  [spaceId]: {
    url,
    adaptor,
    // optional; if true mutating functions will throw an error
    readonly,
    options,
  },
  "my-project": {
    url: "file:///path/to/my-project/files",
    adaptor: fs,
    options: {
      createMissingUrl: true,
      createMissingContainer: true,
      deleteEmptyContainer: true,
    },
  },
  "another-project": {
    url: "s3://bucket-name/path/to/my-project/containers",
    adaptor: s3,
    readonly: true,
    options: {
      accessKeyId,
      secretAccessKey,
    },
  },
};
```

### Adaptor interface API

Specifying a location

```

# JSON syntax
{
    space: spaceId,
    container: containerId,
    object: objectId
}

# tuple syntax
[spaceId, containerId, objectId]

# string syntax
"spaceId:containerId/objectId"

```

```js
class StorageUrl {
    /* Create new StorageUrl object from one of the location specifying types
     */
    constructor(value:
      | string "spaceId:containerId/objectId"
      | string "protocol://..."
      | { space?, container, object }
      | [space, container, object]
      | [container, object ]
      | URL
    ): StorageUrl

    /* formats the storage as a "spaceId:containerId/objectId" string */
    toString(): string

    /* a URL object set to the location of the storage object
       this is the public identifier
     */
    toUrl(): URL
    toURL(): alias of toUrl()

    /* the storage object as a plain Javascript object */
    toJson(): { space, container, object }
    toJSON(): alias of toJson()

    /* the storage object as tuple */
    toTuple(): [spaceId, containerId, objectId]
    [Symbol.Iterator]: [spaceId, containerId, objectId]
}

// use default space
const storageUrl = new StorageUrl(["container", "object"])
storageUrl.toString(); // "my-project:container/object"
storageUrl.toUrl().toString(); // "file:///path/to/my-project/containers/container/object"
storageUrl.toJson().object // "object"
Array.from(storageUrl); // ["my-project", "container", "object"]

// infer space from public identifier
const storageUrl = StorageUrl.from("file:///path/to/my-project/containers/container/object")
const storageUrl.toJson().space === 'my-project"
const storageUrl.toJson().container === 'container"
```

```js
class Storage {
    from(object: StorageUrlLike): StorageUrl

    download(object: StorageUrlLike): [StorageUrl, Readable]

    upload(object: StorageUrlLike): [StorageUrl, Writable]

    append(object: StorageUrlLike): [StorageUrl, Writable]

    createReadStream(object: StorageUrl): Readable

    createWriteStream(object: StorageUrl): Writable

    remove(object: StorageUrlLike): Promise<StorageUrl>

    rename(from: StorageUrlLike, to: StorageUrlLike): Promise<[from: StorageUrl, to: StorageUrl]>

    list(container: StorageContainerUrlLike, glob?: string): AsyncIterator<StorageUrl>

    // beware: some adaptors may not be able to do this without listing the
    //         entire space
    listContainers(spaceId, glob?: string): AsyncIterator<string>

    exists(object: StorageUrlLike): Promise<boolean>

    stat(object: StorageUrlLike): Promise<{
        size
        mtime
    }>

    static get StorageUrl(): typeof StorageUrl
}

const storage = new Storage()

const url = storage.from('my-project:example/data.csv')
fs.createReadStream("/tmp/data.csv").pipe(storage.createWriteStream(url));
console.log(`copying /tmp/data.csv to ${url.toUrl().toString()}`)

fs.createReadStream("/tmp/data.csv").pipe(
    storage.upload(['my-project', 'example', 'data.csv'])[1]
);

const [, readable] = storage.download("my-project:example/data.csv")
readable.pipe(csvTransform)
for await (const record of records) {
    await db.insert(record)
}

for await (const url of storage.list("csv-files-container", "*.csv")) {
    const records = storage.createReadStream(url).pipe(csvTransform)
    for await (const record of records) {
        await db.insert({ storageUrl: url.toString(), record })
    }
}

// get the StorageUrl class
const StorageUrl = storage.StorageUrl
StorageUrl.from(['container', 'object']).toJson().space // 'my-project' (default space)


// promise download/upload interface
const readable = fs.createReadStream("/tmp/data.csv");
const storageUrl = await storage.upload(['example', 'data.csv'], readable);

const writable = fs.createWriteStream("/tmp/data.csv");
const storageUrl = await storage.download(['example', 'data.csv'], writable)
```
