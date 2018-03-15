# Events

During a backup run, a `ContentfulBackup` instance emits events indicating what's going on, using [emittery](https://www.npmjs.com/package/emittery). This provides an interface like `EventEmitter` that supports both synchronous and asynchronous event handlers. Your own plugins or custom code subscribe to these events to perform their actions.

| Event | Parameter | For each | Description |
|---|---|---|---|
| `beforeRun` | `{ dir: string, spaces: Array<{ id: string, token: string }> }` | run | About to start a backup run to back up all spaces |
| `beforeSpace` | `{ dir: string, space: string, token: string }` | space | About to back up a space, with these parameters |
| `beforeSpaceMetadata` | `{ dir: string, space: string }` | space | About to fetch metadata for the space id in the parameter |
| `spaceMetadata` | `{ dir: string, space: string, metadata: Space }` | space | Fetched space metadata |
| `afterSpaceMetadata` | `{ dir: string, space: string }` | space | Finished processing space metadata |
| `beforeContentTypeMetadata` | `{ dir: string, space: string }` | space | About to fetch content type metadata for the space id in the parameter |
| `contentTypeMetadata` | `{ dir: string, space: string, metadata: ContentTypeCollection }` | space | Fetched content type metadata` |
| `afterContentTypeMetadata` | `{ dir: string, space: string }` | space | Finished processing content type metadata |
| `beforeContent` | `{ dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date }` | space | About to synchronise entries and assets for the space id in the parameter. `type` indicates the type of sync, and when `type` is `incremental` the `lastSyncDate` is the timestamp of the last successful backup of this space. |
| `content` | `{ dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date, content: SyncCollection }` | space | Synchronisation returned this content. `space`, `type` and `lastSyncDate` are as for the `beforeContent` event. |
| `contentRecord` | `{ ordinal: number, total: number, record?: Entry \| Asset \| DeletedEntry \| DeletedAsset, recordType?: "Entry" \| "Asset" \| "DeletedEntry" \| "DeletedAsset", dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date }` | space | Processing record `record` of type `recordType`, the `ordinal`th of `total` records. (If `total` is zero there were no changes to synchronise and `record` and `recordType` are absent.) `space`, `type` and `lastSyncDate` are as for the `beforeContent` event. |
| `afterContent` | `{ dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date }` | space | Finished processing space content |
| `afterSpace` | `{ dir: string, space: string, error?: Error }` | space | Finished backup of a space, and possibly failed with an error |
| `afterRun` | `{ dir: string, spaces: Array<{ id: string, token: string }>` | run | Finished a backup run |
| `beforeSleep` | `{ dir: string, spaces: Array<{ id: string, token: string }>, didChange: boolean, sleep: number }` | run | About to sleep between backup runs. `didChange` is true if any space content changed in the last backup, and false otherwise. `sleep` is the number of minutes until the next backup run. |

In the table:

- `dir` is always the target directory.
- `space` is always a space id.
- `Space`, `ContentTypeCollection`, `SyncCollection`, `Entry`, `Asset`, `DeletedEntry` and `DeletedAsset` refer to the data types in the [Contentful JavaScript SDK documentation](https://contentful.github.io/contentful.js/contentful/5.1.3/index.html).

The `contentRecord` event counts a change as any of these:

- New or updated entry
- New or updated asset
- Deleted entry
- Deleted asset

Contentful's definition of 'deleted' here includes those entries or assets changed from 'published' to 'draft' or 'archived'.


## Adding an event handler

Here's an example of adding a short asynchronous `contentRecord` event handler to a `ContentfulBackup` instance:

```js
import { ContentfulBackup } from '@avaragado/contentful-backup';
import somePromiseReturningFunction from 'somewhere';

const cfb = new ContentfulBackup();

cfb.on('contentRecord', async ({ ordinal, total, record } => {
    console.log(`Synchronising ${ordinal}/${total} id ${record.sys.id}`);
    await somePromiseReturningFunction(record);
}));

// ...more
```
