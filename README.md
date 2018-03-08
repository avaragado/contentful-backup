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
- **Plugins** Built-in plugins for logging to console and file, and to perform post-backup git actions, with the ability to define your own plugins.

**Files are deleted locally too.** When entries or assets are deleted from Contentful, `contentful-backup` removes the associated files from the local backup. To recover entries or assets accidentally deleted on Contentful, we recommend you use `contentful-backup` in conjunction with your favourite version control system. For example, run `contentful-backup` with the built-in `git-commit` plugin to save changes to a git repository and push it to a remote. (Some _mirror-my-disk-to-a-cloud_ services might work too, if they let you time travel and if they haven't silently crashed.)


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
    [--plugins [log-console | log-file | git-commit | <module-name>]...]
```

Backs up the space or spaces specified into the target directory (which must already exist, and defaults to the current directory). A token must be a valid Content Delivery API token for the preceding space id.

Specify `--every` to automatically back up the spaces periodically. In this mode, the app does a backup run, sleeps for the defined period, then repeats: the app never exits.

Specify `--plugins` with a list of plugin names to add these plugins, in order. Use a path (absolute, or relative to the current directory) to add a node module as a plugin. See below for the built-in plugins.

Command-line arguments override options specified in any `contentful-backup` configuration file found in the target directory. In that configuration file you can also define plugin-specific options.


### Configuration file

You can store default configuration in a file named `contentful-backup.config.js` or `contentful-backup.config.json` in the target directory. Command-line arguments override this configuration.

The configuration file must export or define an object complying with the type `FileConfig`:

```ts
type Space = { id: string, token: string };
type PluginName = "log-console" | "log-file" | "git-commit" | string;
type PluginConfig = Object;
type PluginSpec = PluginName | [PluginName, PluginConfig];

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
$ contentful-backup --dir ../my-backups --plugins log-file git-commit
```

Backs up spaces to `../my-backups`, logs to `contentful-backup.log` in that directory, then checks in all changes. Other configuration (here, the spaces and any `every` setting) would be read from a configuration file in `../my-backups`.


## Plugins

These are the built-in plugins (see later for how to write your own plugin):

| Name | Options | Description |
|---|---|---|
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

`contentful-backup` writes these files and directories in the target directory:

| File/directory | Description |
|---|---|
| `contentful-backup.log` | Audit trail of backup runs, if the plugin `log-file` is specified |
| `<space-id>/space.json` | Space metadata |
| `<space-id>/contentTypes.json` | Content types metadata |
| `<space-id>/asset/<id>/data.json` | Data for a single asset |
| `<space-id>/asset/<id>/<locale>/<filename>` | An asset file |
| `<space-id>/entry/<id>/data.json` | Data for a single entry |
| `<space-id>/nextSyncToken.txt` | The Contentful token indicating the most recent successful synchronisation |


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

const cfb = new ContentfulBackup();

// cfb is an EventEmitter instance: see below for all events.
// Here's an example:
cfb.on('progressContent', ({ done, total } => {
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

During a backup run, a `ContentfulBackup` instance emits events indicating what's going on.


| Event | Parameter | For each | Description |
|---|---|---|---|
| `beforeRun` | `void` | run | About to start a backup run to back up all configured spaces |
| `beforeSpace` | `{ dir: string, space: string, token: string }` | space | About to back up a space, with these parameters |
| `beforeSpaceMetadata` | `{ space: string }` | space | About to fetch metadata for the space id in the parameter |
| `afterSpaceMetadata` | `{ space: string, result: Space }` | space | Fetched space metadata, which has been saved in `space.json` |
| `beforeContentTypeMetadata` | `{ space: string }` | space | About to fetch content type metadata for the space id in the parameter |
| `afterContentTypeMetadata` | `{ space: string, result: ContentTypeCollection }` | space | Fetched content type metadata, which has been saved in `contentTypes.json` |
| `beforeContent` | `{ space: string, type: "incremental" \| "initial", lastSyncDate: ?Date }` | space | About to synchronise entries and assets for the space id in the parameter. `type` indicates the type of sync, and when `type` is `incremental` the `lastSyncDate` is the timestamp of the last successful backup of this space. |
| `progressContent` | `{ done: number, total: number, rec?: Entry \| Asset \| DeletedEntry \| DeletedAsset, space: string, type: "incremental" \| "initial", lastSyncDate: ?Date }` | space | Synchronised `done/total`th of the changes, and just synchronised record `rec`. If `total` is zero there were no changes to synchronise (and `rec` is absent). `space`, `type` and `lastSyncDate` are as for the `beforeContent` event. |
| `afterContent` | `{ space: string, type: "incremental" \| "initial", lastSyncDate: ?Date, result: SyncCollection }` | space | Finished synchronisation with this result, and the filesystem is up to date with all changes. `space`, `type` and `lastSyncDate` are as for the `beforeContent` event (and the date value is the same as in that event). |
| `afterSpace` | `{ space: string, error?: Error }` | space | Finished backup of a space, and possibly failed with an error |
| `afterRun` | `void` | run | Finished a backup run |

(In the table, `Space`, `ContentTypeCollection`, `SyncCollection`, `Entry`, `Asset`, `DeletedEntry` and `DeletedAsset` refer to the Contentful data types in their documentation.)

The `progressContent` event counts a change as any of these:

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

The second parameter to the plugin matches the type `BackupSpec`:

```ts
type Space = { id: string, token: string };
type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
    every: ?number,
};
```

The third parameter to the plugin is the configuration object defined for the plugin in the configuration file, if any. It defaults to `{}`.

`contentful-backup` creates one `ContentfulBackup` instance for the lifetime of the app process. The same instance is used for each space in a single backup run, and for every backup run (if you use `--every`). If your plugin saves any state internally, be sure to initialise properly on the `beforeRun` and/or `beforeSpace` events, and clean up after yourself on `afterSpace` and/or `afterRun`.

You configure plugins by defining an ordered list. The plugins are registered in that order, which means each `ContentBackup` event handler is invoked in the same order.

Because plugins bind to `ContentfulBackup` events, some occur for each space separately. Only the `beforeRun` and `afterRun` events fire once for all spaces as a group (once per backup run, so once every `--every` period).


## Maintainer

David Smith (@avaragado)


## Contribute

Bug reports, feature requests and PRs are gratefully received. [Add an issue](https://github.com/avaragado/contentful-backup/issues/new) or submit a PR.

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.


## Licence

[MIT](LICENSE.txt) © David Smith

