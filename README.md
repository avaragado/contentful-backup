# contentful-backup

> A console app and node module for backing up Contentful spaces.

`contentful-backup` backs up:

- Entries
- Assets
- Space metadata
- Content type metadata

## Features

- **Incremental backup of entries and assets** Run the app at any time to keep the backup "topped up". (Space and content type metadata is downloaded in full each time.)
- **Multiple spaces** Back up one or more spaces with a single run of the app.
- **Once or forever** Back up once then exit – or run forever, backing up as frequently as you want.
- **Logging** Customisable logging of backup events, with built-in defaults for console and file (with rotation).

**Files are deleted locally too.** When entries or assets are deleted from Contentful, `contentful-backup` removes the associated files from the local backup. To recover entries or assets accidentally deleted on Contentful, we recommend you use `contentful-backup` in conjunction with your favourite version control system. For example: run `contentful-backup`, then commit any changes made to git. (Some _mirror-my-disk-to-a-cloud_ services might work too, if they let you time travel and if they haven't silently crashed.)


### Caveats

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

```bash
$ contentful-backup
    [--dir <target-dir>]
    [--space <space-id> <cda-token>]...
    [--every <minutes>]
    [--log console | file | <module-name>]
```

Backs up the space or spaces specified into the target directory (which must already exist, and defaults to the current directory). A token must be a valid Content Delivery API token for the preceding space id.

Specify `--every` to automatically back up the spaces periodically. In this mode, the app doesn't exit.

Specify `--log console` to log backup events to the console, `--log file` to write logs to `contentful-backup.log` in the target directory (rotating log files at 1 MB), or `--log <module-name>` to use a custom node module (relative to the current directory). If you omit `--log`, there's no log output.

Command-line arguments override options specified in the configuration file in the target directory.


### Configuration file

You can store default configuration in a file named `contentful-backup.config.js` or `contentful-backup.config.json` in the target directory. Command-line arguments override this configuration.

The configuration file must export or define an object with this structure:

```ts
{
    spaces?: Array<{ id: string, token: string }>,
    every?: number,
    log?: "none" | "console" | "file" | string,
}
```

Example configuration file `contentful-backup.config.json`:

```json
{
    "spaces": [
        { "id": "abcdabcdabcd", "token": "abcdabcdabcdabcdabcdabcd" },
        { "id": "zxzxzxzxzxzx", "token": "zxzxzxzxzxzxzxzxzxzxzxzx" },
    ],
    "every": 10,
    "log": "file",
}
```

### Examples

```bash
$ contentful-backup --space ididididid1 tktktktktk1 --space ididididid2 tktktktktk2 --every 2
```

Backs up spaces `ididididid1` and `ididididid2` to the current directory every two minutes.

```bash
$ contentful-backup --dir ../my-backups --log file
```

Backs up spaces according to the configuration file in `../my-backups`, logging to `contentful-backup.log` in that directory.


## Files written

`contentful-backup` writes these files and directories in the target directory:

| File/directory | Description |
|---|---|
| `contentful-backup.log` | Audit trail of backup runs, if `--log file` is specified |
| `<space-id>/space.json` | Space metadata |
| `<space-id>/contentTypes.json` | Content types metadata |
| `<space-id>/asset/<id>/data.json` | Data for a single asset |
| `<space-id>/asset/<id>/<locale>/<filename>` | An asset file |
| `<space-id>/entry/<id>/data.json` | Data for a single entry |
| `<space-id>/nextSyncToken.txt` | The Contentful token indicating the most recent successful synchronisation |


## Errors

Any error that occurs during a backup, for example a network failure, stops the backup at that point. This might not be too much of a problem: simply run `contentful-backup` again.

With `--every`, `contentful-backup` exits on error. You might want to add your own error handling to notify interested parties of the error and then restart `contentful-backup`.

- If an error occurs before synchronisation is complete, the app doesn't save the next synchronisation token. This means the next run of the app reruns the synchronisation that failed (in other words, you shouldn't lose anything).
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
    every: 60,
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

The console app and your own code can use these events for logging.


## Questions

### What's a good value for `--every`?

It's up to you. If your CMS is changing constantly, you may want a smaller value for `--every`.

Bear in mind that every backup downloads space and content type metadata in full: even if your CMS entries and assets change rarely, each backup may still result in a hefty chunk of download.

Also, every backup contributes to your API usage, as measured by Contentful.


### How do I define a custom logging module?

A logging module is a standard node module. It must export a function. The `contentful-backup` app calls this function, passing a `ContentfulBackup` instance and other data, and the function must return a `ContentfulBackup` instance.

Essentially, logging functions add event handlers to the `ContentfulBackup` instance and then return it. Here's an example module:

```js
const log = (cfb, { dir, spaces, every }) => {
    cfb.on('start', ({ space, dir }) =>
        console.log(`Starting backup of ${space} to ${dir}...`));

    cfb.on('done', () =>
        console.log('done'));

    return cfb;
};

module.exports = log;
```

If you save this module to, say, `~/my-logger.js`, you can select it by passing the argument `--log ~/my-logger.js` to `contentful-backup`.

The second parameter to the logging function matches the type `BackupSpec`:

```ts
type Space = { id: string, token: string };
type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
    every: ?number,
};
```

Note that the same `ContentfulBackup` instance is used for all backups in the same run of the app: if you specify multiple spaces and/or the `--every` option, for example. If your logging module saves any state internally, be sure to initialise properly on the `start` event and clean up after yourself on `done` and `error`.


## Maintainer

David Smith (@avaragado)


## Contribute

Bug reports, feature requests and PRs are gratefully received. [Add an issue](https://github.com/avaragado/contentful-backup/issues/new) or submit a PR.

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.


## Licence

[MIT](LICENSE.txt) © David Smith

