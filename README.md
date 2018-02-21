# contentful-backup

> A console app and node module for backing up Contentful spaces.

`contentful-backup` backs up:

- Entries
- Assets
- Space metadata
- Content type metadata

It supports incremental backup of entries and assets, so you can run the app frequently to keep the backup "topped up". You can back up one or more spaces with a single run of the tool.

**Files are deleted locally too.** When entries or assets are deleted from Contentful, `contentful-backup` removes the associated files from the local backup. To recover entries or assets accidentally deleted on Contentful, we recommend you use `contentful-backup` in conjunction with your favourite version control system. For example: run `contentful-backup`, then commit any changes made to git. (Some _mirror-my-disk-to-a-cloud_ services might work too, if they let you time travel and if they haven't silently crashed.)


## Caveats

- This project may have bugs and makes no guarantees. Use it at your own risk.
- This project uses the Contentful JavaScript API, and is subject to the whims of that API.
- This project is not associated with Contentful.


## Installation

```bash
$ yarn global add @avaragado/contentful-backup
$ # or
$ npm -g install @avaragado/contentful-backup
```


## Usage

### Back up a single space

```bash
$ contentful-backup [--dir <target-dir>] --space <space-id> --token <cda-token>
```

Backs up the space into the target directory (which must already exist, and defaults to the current directory). The token must be a valid Content Delivery API token for the space.


### Back up one or more spaces

```bash
$ contentful-backup [--dir <target-dir>]
```

Backs up all the spaces defined in a configuration file in the target directory (which defaults to the current directory). The configuration file is named either `contentful-backup.config.js` or `contentful-backup.config.json`. The configuration file must export or define an array `spaces`. Each member of the array must be an object with key `id`, identifying a space, and key `token`, for the associated CDA token.

Example configuration file `contentful-backup.config.json`:

```json
{
    "spaces": [
        { "id": "abcdabcdabcd", "token": "abcdabcdabcdabcdabcdabcd" },
        { "id": "zxzxzxzxzxzx", "token": "zxzxzxzxzxzxzxzxzxzxzxzx" },
    ]
}
```

### Examples

```bash
$ contentful-backup --space abcdabcdabcd --token abcdefg
```

Backs up space `abcdabcdabcd` to the current directory, using the CDA token `abcdefg`.

```bash
$ contentful-backup --dir ../my-backups
```

Backs up spaces according to the configuration file in `../my-backups`.


### Files written

`contentful-backup` writes these files and directories in the target directory:

| File/directory | Description |
|---|---|
| `<space-id>/space.json` | Space metadata |
| `<space-id>/contentTypes.json` | Content types metadata |
| `<space-id>/asset/<id>/data.json` | Data for a single asset |
| `<space-id>/asset/<id>/<locale>/<filename>` | An asset file |
| `<space-id>/entry/<id>/data.json` | Data for a single entry |
| `<space-id>/nextSyncToken.txt` | The Contentful token indicating the most recent successful synchronisation |


### Errors

Any error that occurs during a backup, for example a network failure, stops the backup at that point. This might not be too much of a problem: simply run `contentful-backup` again.

- If an error occurs before synchronisation is complete, the script doesn't save the next synchronisation token. This means the next run of the script reruns the synchronisation that failed (in other words, you shouldn't lose anything).
- If you don't trust a particular incremental backup, remove the `<space-id>` subdirectory of the target directory and run `contentful-backup` again: you'll get a full backup of that space.


## Node module usage

You can use `contentful-backup` programmatically as a node module. In this case, install as a standard dependency (`yarn add @avaragado/contentful-backup` or `npm install @avaragado/contentful-backup`). Then import the module and use it like this:

```js
import { ContentfulBackup } from '@avaragado/contentful';

const cfb = new ContentfulBackup();

// cfb is an EventEmitter instance: see below for all events.
// Here's an example:
cfb.on('syncProgress', ({ done, total } => {
    console.log(`Synchronised ${done}/${total}`);
}));

cfb.backup({
    dir: 'my-dir',
    spaces: [
        { id: 'abcabcabc', token: 'vbvbvb' },
        { id: 'zxzxzxzx', token: 'cnxncnxn' },
    ],
});
```

### Events

During a backup, a `ContentfulBackup` instance emits events indicating what's going on.

| Event | Parameter | Description |
|---|---|---|
| `start` | `{ dir: string, space: string, token: string }` | Backup starting with these parameters |
| `beforeSpace` | `void` | About to fetch space metadata |
| `afterSpace` | `Space` | Fetched this space metadata, which has been saved in `space.json` |
| `beforeContentTypes` | `void` | About to fetch content type metadata |
| `afterContentTypes` | `ContentTypeCollection` | Fetched this content type metadata, which has been saved in `contentTypes.json` |
| `syncMeta` | `{ type: "incremental" | "initial", lastSyncDate: ?Date }` | Ready to synchronise: `type` indicates the type of sync, and when `type` is `incremental` the `lastSyncDate` is the timestamp of the last successful backup |
| `beforeSync` | `void` | About to synchronise entries and assets |
| `syncProgress` | `{ done: number, total: number, rec?: Entry | Asset | DeletedEntry | DeletedAsset  }` | Synchronised `done/total`th of the changes, and just synchronised record `rec`. If `total` is zero there were no changes to synchronise (and `rec` is absent) |
| `afterSync` | `SyncCollection` | Finished synchronisation with this result, and the filesystem is up to date with all changes |
| `done` | `void` | Backup has completed successfully |
| `error` | `Error` | Backup failed at some point with this error |

(In the table, `Space`, `ContentTypeCollection`, `SyncCollection`, `Entry`, `Asset`, `DeletedEntry` and `DeletedAsset` refer to the Contentful data types in their documentation.)

The `syncProgress` event counts a change as any of these:

- New or updated entry
- New or updated asset
- Deleted entry
- Deleted asset


## Maintainer

David Smith (@avaragado)


## Contribute

Bug reports, feature requests and PRs are gratefully received. [Add an issue](https://github.com/avaragado/contentful-backup/issues/new) or submit a PR.

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.


## Licence

[MIT](LICENSE.txt) © David Smith

