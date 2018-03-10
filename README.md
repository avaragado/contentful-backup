# contentful-backup

> A console app and node module for backing up Contentful spaces.

`contentful-backup` backs up:

- Entries
- Assets
- Space metadata
- Content type metadata

## Features

- **Incremental backup of entries and assets** Run the app at any time to keep a backup "topped up". (Space and content type metadata is downloaded in full each time.)
- **Multiple spaces** Back up one or more spaces with a single run of the app.
- **Once or forever** Back up once then exit – or run forever, backing up as frequently as you want.
- **Plugins** Built-in plugins for saving spaces to disk, logging to console and file, and performing post-backup git actions – with the ability to define your own plugins.

**Files are deleted locally too.** When entries or assets are deleted from Contentful, the `contentful-backup` plugin `save-disk` removes the associated files from the local backup. To recover entries or assets accidentally deleted on Contentful, we recommend you use `contentful-backup` and `save-disk` in conjunction with your favourite version control system. For example, run `contentful-backup` with the `save-disk` and `git-commit` plugins to save changes to a git repository and push it to a remote. (Some _mirror-my-disk-to-a-cloud_ services might work too, if they let you time travel and if they haven't silently crashed.)


### Caveats

- This project may have bugs and makes no guarantees. Use it at your own risk.
- This project uses the Contentful JavaScript API, and is subject to the whims of that API.
- This project is not associated with Contentful.
- This project supports Node 8 and above.


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
    [--plugins [save-disk | log-console | log-file | git-commit | <module-name>]...]
```

Backs up the space or spaces specified into the target directory (which must already exist, and defaults to the current directory). A token must be a valid Content Delivery API token for the preceding space id.

Specify `--every` to automatically back up the spaces periodically. In this mode, the app does a backup run, sleeps for the defined period, then repeats: the app never exits.

Specify `--plugins` with a list of plugin names to use these plugins, in order. Use a path (absolute, or relative to the target or current directory) or module name to use a node module as a plugin. See below for the built-in plugins. Defaults to `save-disk log-console`. (Unless you write your own plugin to replace `save-disk`, always include that in your list otherwise nothing gets saved to disk.)

Command-line arguments override options specified in any `contentful-backup` configuration file found in the target directory. In that configuration file you can also define plugin-specific options.


### Configuration file

You can store default configuration in a file named `contentful-backup.config.js` or `contentful-backup.config.json` in the target directory. Command-line arguments override this configuration.

The configuration file must export or define an object complying with the type `FileConfig`:

```ts
type Space = { id: string, token: string };
type PluginName = "save-disk" | "log-console" | "log-file" | "git-commit" | string;
type PluginConfig = Object;
type PluginSpecLoose = PluginName;
type PluginSpecStrict = [PluginName, PluginConfig];
type PluginSpec = PluginSpecLoose | PluginSpecStrict;

type FileConfig = {
    spaces?: Array<Space>,
    every?: number,
    plugins?: Array<PluginSpec>,
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
    "plugins": [
        "save-disk",
        "log-file",
        ["git-commit", { "push": true }]
    ]
}
```

### Examples

```bash
$ contentful-backup --space ididididid1 tktktktktk1 --space ididididid2 tktktktktk2 --every 2
```

Backs up spaces `ididididid1` and `ididididid2` to the current directory every two minutes. Other configuration (here, plugins) would be read from a configuration file in the current directory.

```bash
$ contentful-backup --dir ../my-backups --plugins save-disk log-file git-commit
```

Backs up spaces to `../my-backups`, logs to `contentful-backup.log` in that directory, then checks in all changes. Other configuration (here, the spaces and any `every` setting) would be read from a configuration file in `../my-backups`.


## Plugins

These are the built-in plugins (see later for how to write your own plugin):

| Name | Options | Description |
|---|---|---|
| `save-disk` | – | Save space and content type metadata, plus entries and assets, to disk. |
| `log-console` | – | Log backup events to the console. |
| `log-file` | `{ level: 'error' \| 'warn' \| 'info' \| 'verbose' \| 'debug' \| 'silly' }` | Log backup events to the file `contentful-backup.log` in the target directory, rotating log files at 1 MB. The configuration option `level` indicates how verbose the messages should be (default: `info`). |
| `git-commit` | `{ push: boolean \| string }` | After a backup run, check changes into git, then optionally push the branch to a remote. The configuration option `push` can be `true` (push to the default remote), `false` (don't push, the default), or the name of a remote (push to that remote). |

Plugin options are defined in the configuration file, as an object: see the example in the section above.

The `git-commit` plugin assumes:

- The target directory is a valid git repository
- The user running the app has commit and push permissions on the current branch in that repository
- `git` is in the `PATH`.

The plugin makes no effort to recover from errors.


## Files written

`contentful-backup` writes these files and directories in the target directory, if the plugin shown is active:

| File/directory | Plugin | Description |
|---|---|
| `contentful-backup.log` | log-file | Audit trail of backup runs |
| `<space-id>/space.json` | save-disk | Space metadata |
| `<space-id>/contentTypes.json` | save-disk | Content types metadata |
| `<space-id>/asset/<id>/data.json` | save-disk | Data for a single asset |
| `<space-id>/asset/<id>/<locale>/<filename>` | save-disk | An asset file |
| `<space-id>/entry/<id>/data.json` | save-disk | Data for a single entry |
| `<space-id>/nextSyncToken.txt` | _always_ | The Contentful token indicating the most recent successful synchronisation |


## Errors

- Any error that occurs during the backup of a space, such as a network glitch, skips the rest of the backup for that space but doesn't exit the app. For example, imagine you've configured `contentful-backup` to back up two spaces in each backup run, and perform a backup run `--every 60` minutes. If an error occurs while fetching the content type information of the first space, then the app won't try to back up entries and assets for that space. Instead, it'll skip to backing up the second space, then wait 60 minutes before starting another backup run for both spaces.
- Use the `log-file` and/or `log-console` plugins to record details of any errors.
- Use the `git-commit` plugin to include error details in the commit log.
- You could write a plugin to notify a human or friendly droid when an error occurs.
- If an error occurs before `contentful-backup` finishes synchronising entries and assets, the app doesn't save the next synchronisation token. This means the next backup run reruns the synchronisation that failed (in other words, you shouldn't lose anything).
- If you don't trust a particular incremental backup, remove the `<space-id>` subdirectory of the target directory: the next backup run will trigger a full backup of that space.


## Node module usage

You can use `contentful-backup` programmatically as a node module. In this case, install as a standard dependency (`yarn add @avaragado/contentful-backup` or `npm install @avaragado/contentful-backup`). Then import the module and use it like this:

```js
import { ContentfulBackup } from '@avaragado/contentful';
import somePromiseReturningFunction from 'somewhere';

const cfb = new ContentfulBackup();

// cfb emits events and supports Promises: see below for all events.
// Here's an example:
cfb.on('contentRecord', async ({ ordinal, total, record } => {
    console.log(`Synchronising ${ordinal}/${total} id ${record.sys.id}`);
    await somePromiseReturningFunction(record);
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

During a backup run, a `ContentfulBackup` instance emits events indicating what's going on, using [emittery](https://www.npmjs.com/package/emittery). This provides an interface like `EventEmitter` that supports both synchronous and asynchronous event handlers.

| Event | Parameter | For each | Description |
|---|---|---|---|
| `beforeRun` | `{ dir: string, spaces: Array<{ id: string, token: string }>` | run | About to start a backup run to back up all spaces |
| `beforeSpace` | `{ dir: string, space: string, token: string }` | space | About to back up a space, with these parameters |
| `beforeSpaceMetadata` | `{ dir: string, space: string }` | space | About to fetch metadata for the space id in the parameter |
| `spaceMetadata` | `{ dir: string, space: string, metadata: Space }` | space | Fetched space metadata |
| `afterSpaceMetadata` | `{ dir: string, space: string }` | space | Finished processing space metadata |
| `beforeContentTypeMetadata` | `{ dir: string, space: string }` | space | About to fetch content type metadata for the space id in the parameter |
| `contentTypeMetadata` | `{ dir: string, space: string, metadata: ContentTypeCollection }` | space | Fetched content type metadata` |
| `afterContentTypeMetadata` | `{ dir: string, space: string }` | space | Finished processing content type metadata |
| `beforeContent` | `{ dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date }` | space | About to synchronise entries and assets for the space id in the parameter. `type` indicates the type of sync, and when `type` is `incremental` the `lastSyncDate` is the timestamp of the last successful backup of this space. |
| `content` | `{ dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date, content: SyncCollection }` | space | Synchronisation returned this content. `space`, `type` and `lastSyncDate` are as for the `beforeContent` event. |
| `contentRecord` | `{ ordinal: number, total: number, record?: Entry \| Asset \| DeletedEntry \| DeletedAsset, recordType?: "Entry" \| "Asset" | "DeletedEntry" \| "DeletedAsset", dir: string, space: string, syncType: "incremental" \| "initial", lastSyncDate: ?Date }` | space | Processing record `record` of type `recordType`, the `ordinal`th of `total` records. (If `total` is zero there were no changes to synchronise and `record` and `recordType` are absent.) `space`, `type` and `lastSyncDate` are as for the `beforeContent` event. |
| `afterContent` | `{ dir: string, space: string }` | space | Finished processing space content |
| `afterSpace` | `{ dir: string, space: string, error?: Error }` | space | Finished backup of a space, and possibly failed with an error |
| `afterRun` | `{ dir: string, spaces: Array<{ id: string, token: string }>` | run | Finished a backup run |

In the table:

- `dir` is always the target directory.
- `space` is always a space id.
- `Space`, `ContentTypeCollection`, `SyncCollection`, `Entry`, `Asset`, `DeletedEntry` and `DeletedAsset` refer to the Contentful data types in their documentation.

The `contentRecord` event counts a change as any of these:

- New or updated entry
- New or updated asset
- Deleted entry
- Deleted asset


## Questions

### What's a good value for `--every`?

It's up to you. If your CMS is changing constantly, you may want a smaller value for `--every`.

Bear in mind that every backup downloads space and content type metadata in full: even if your CMS entries and assets change rarely, each backup may still result in a hefty chunk of download.

Also, every backup contributes to your API usage, as measured by Contentful.


### How do I define my own plugin?

A plugin is a standard node module. It must export a function. Before starting the backup, the `contentful-backup` app calls this function, passing a `ContentfulBackup` instance and other data, and the function must return a `ContentfulBackup` instance.

Essentially, plugins add event handlers to the `ContentfulBackup` instance and then return it. Here's an example plugin:

```js
const shortlog = (cfb, { dir, spaces, every }, opts) => {
    cfb.on('beforeSpace', ({ space, dir }) =>
        console.log(`Starting backup of ${space} to ${dir}...`));

    cfb.on('afterSpace', ({ error }) =>
        console.log(error ? error.toString() : 'OK'));

    return cfb;
};

module.exports = shortlog;
```

If you save this plugin to, say, `~/shortlog.js`, you can select it by passing the argument `--plugins ~/shortlog.js` to `contentful-backup`.

Plugins must conform to the `Plugin` type:

```ts
import { ContentfulBackup } from '@avaragado/contentful';

type Space = { id: string, token: string };
type PluginConfig = Object;

type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
    every: ?number,
};

type Plugin = (
    cfb: ContentfulBackup,
    backup: BackupSpec,
    config: PluginConfig,
) => ContentfulBackup;
```

The third parameter to the plugin is the configuration object defined for the plugin in the configuration file, if any. It defaults to `{}`.

`contentful-backup` creates one `ContentfulBackup` instance for the lifetime of the app process. The same instance is used for each space in a single backup run, and for every backup run (if you use `--every`). If your plugin saves any state internally, be sure to initialise properly on the `beforeRun` and/or `beforeSpace` events, and clean up after yourself on `afterSpace` and/or `afterRun`.

You configure plugins by defining an ordered list. The plugins are registered in that order, which means each `ContentBackup` event handler is invoked in the same order. Event handlers can return promises (or use `async`/`await`) if they need to be asynchronous. Handlers are always invoked serially: a handler must finish, even if it's async, before the next one starts.

Because plugins bind to `ContentfulBackup` events, some occur for each space separately. Only the `beforeRun` and `afterRun` events fire once for all spaces as a group (once per backup run, so once every `--every` period).


## Maintainer

David Smith (@avaragado)


## Contribute

Bug reports, feature requests and PRs are gratefully received. [Add an issue](https://github.com/avaragado/contentful-backup/issues/new) or submit a PR.

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.


## Licence

[MIT](LICENSE.txt) © David Smith

