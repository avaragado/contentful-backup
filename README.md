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
- **Configurable backoff** Back up more frequently when spaces are changing.
- **Plugins** Built-in plugins for saving spaces to disk, logging to console and file, and performing post-backup git actions – with the ability to define your own plugins.


### Caveats

- This project may have bugs and makes no guarantees. Use it at your own risk.
- This project uses the Contentful JavaScript API, and is subject to the whims of that API. In particular, the synchronisation API only retrieves published entries and assets, and not those in draft, changed/updated or archived states.
- This project is not associated with Contentful.
- This project supports Node 8 and above.


## Why?

- **Recover from accidental deletions** The main goal of the Contentful product is to store your content and let you fetch it easily for presentation. Contentful supports versioning and makes its own backups, but those backups aren't accessible to customers. If you accidentally delete an entry or an asset in the Contentful UI, you can't undo that. Given sufficient quantities of fingers, an accident is guaranteed to happen. `contentful-backup` aims to help you recover from these accidents.
- **Keep a timeline of changes** It can be useful to track the history of content ("when did we change that product name?"). Contentful lets you examine past versions of an entry, but doesn't place that in context (what else changed then?), and Contentful doesn't keep past versions of assets. `contentful-backup` snapshots entire spaces. (This is imperfect – there are no details of who made the changes.)


## Overview

You can use `contentful-backup` in several ways:

- Put your settings in a configuration file in a directory, run `contentful-backup`, and leave it forever or run it whenever you wish. You can use command-line arguments to override certain settings in the configuration file.
- As above, [adding your own plugins](./doc/plugins.md) to change or augment built-in behaviour.
- [Write your own node-based interface](./doc/node-module.md) and call `contentful-backup` programmatically with full control over its behaviour.

The core of `contentful-backup` is concerned with managing the overall flow of data: for each space to back up, calling the Contentful API and storing necessary tokens for incremental backups. `contentful-backup` triggers events with the appropriate data, and then plugins – both built-in plugins and ones you write yourself – make all the interesting things happen (saving, logging, gitting).

This README covers usage as a console app with the built-in plugins.


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
    [--every <minutes>...]
    [--plugins [save-disk | log-console | log-file | git-commit | <module-name>]...]
```

Backs up one or more spaces.

`--dir` is the path to the directory in which `contentful-backup` stores backup data, and where it looks for a configuration file. This directory must already exist. It defaults to the current directory.

`--space` identifies a space to back up, and must be followed by a space ID and then a Content Delivery API token. Specify `--space` multiple times to back up multiple spaces in a single backup run. All spaces are backed up in sequence on every run.

`--every` runs `contentful-backup` forever, periodically performing a backup run. In this mode, `contentful-backup` does a backup run, sleeps for a time, then repeats. If omitted, `contentful-backup` performs a single backup run and then exits.

- With one number (example: `--every 60`): `contentful-backup` always sleeps that number of minutes between backup runs.
- With multiple numbers (example: `--every 1 2 10 60`): `contentful-backup` uses a form of exponential backoff. When content changes in a backup run, the first number in the sequence is used for the sleep period. For each backup run where content doesn't change, the next number is used, eventually repeating the last number. In this way, backup runs occur more frequently when content seems to be changing.

`--plugins` identifies the `contentful-backup` plugins to use for each backup run, in order. If omitted, defaults to `save-disk log-console`.

- Use a built-in name (`save-disk`, `log-console`, `log-file`, `git-commit`) to use that plugin
- Use a path (absolute, or relative to the target directory or current directory) to use your own node module as a custom plugin
- Use a node module name to require that module as a custom plugin

Unless you write your own plugin to replace `save-disk`, always include that in your list otherwise nothing gets saved to disk.

Some plugins accept configuration options. To set these, specify plugins in a configuration file: you can't set plugin options on the command line.


## Configuration file

Define default `contentful-backup` configuration in a file named `contentful-backup.config.js` or `contentful-backup.config.json` in the target directory. Command-line arguments override this configuration.

The configuration file must export or define an object of type `FileConfig`:

```ts
type SpaceConfig = { id: string, token: string };
type PluginName = "save-disk" | "log-console" | "log-file" | "git-commit" | string;
type PluginOptions = Object;
type PluginConfigSimple = PluginName;
type PluginConfigStrict = [PluginName, PluginOptions];
type PluginConfig = PluginConfigSimple | PluginConfigStrict;

type FileConfig = {
    spaces?: Array<SpaceConfig>,
    every?: number | Array<number>,
    plugins?: Array<PluginConfig>,
}
```

Example configuration file `contentful-backup.config.json`:

```json
{
    "spaces": [
        { "id": "abcdabcdabcd", "token": "abcdabcdabcdabcdabcdabcd" },
        { "id": "zxzxzxzxzxzx", "token": "zxzxzxzxzxzxzxzxzxzxzxzx" },
    ],
    "every": [1, 10, 100],
    "plugins": [
        "save-disk",
        "log-file",
        ["git-commit", { "push": true }]
    ]
}
```


## Built-in plugins

`contentful-backup` ships with some built-in plugins to perform actions such as storing retrieved files, and logging. Without plugins, `contentful-backup` doesn't do anything useful.


### save-disk

Saves space and content type metadata, plus entries and assets. All data is stored in a subdirectory (whose name is the space ID) of the target directory.

In the configuration file, you can specify a plugin options object matching this type:

```ts
type SaveDiskPluginOptions = {
    onDeletedEntry?: 'delete' | 'move',
    onDeletedAsset?: 'delete' | 'move',
};
```

- `onDeletedEntry` and `onDeletedAsset` indicate the action the plugin should take for `DeletedEntry` and `DeletedAsset` records in Contentful's synchronisation response. Use `move` (the default) to move deleted entries and assets to a `deleted` subdirectory, with a timestamp of deletion. Use `delete` to simply delete the local files (best used in conjunction with the `git-commit` plugin, so each commit reflects the state of the space at that time).

Note that in the Contentful synchronisation API, "deleted" entries or assets include those whose state changes from 'published' to 'draft' or 'archived'. If you archive an entry or asset, the next `contentful-backup` run will delete it or move it to the `deleted` subdirectory according to the appropriate plugin option. If you then republish the entry or asset, the next backup run will recreate it as if new (leaving the `deleted` directory unchanged: the record remains there).


### log-console

Logs backup events to the console. This output is intended for human consumption.

_No plugin options_


### log-file

Logs backup events to the file `contentful-backup.log` in the target directory. These log files are rotated when they reach 1 MB.

In the configuration file, you can specify a plugin options object matching this type:

```ts
type LogFilePluginOptions = {
    level?: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly',
};
```

- `level` indicates how verbose the messages should be. Default: `info`.


### git-commit

After a backup run, checks changes into git, then optiohnally pushes the branch to a remote.

In the configuration file, you can specify a plugin options object matching this type:

```ts
type GitCommitPluginOptions = {
    push?: boolean | string,
};
```

- `push` can be `false` (the default) to mean "don't push", `true` to mean "push to the default remote", or the name of a remote to mean "push to this remote".

The `git-commit` plugin assumes:

- The target directory is a valid git repository
- The user running the app has commit and push permissions on the current branch in that repository
- `git` is in the `PATH`.

The plugin makes no effort to recover from errors.


## Examples

```bash
$ contentful-backup --space ididididid1 tktktktktk1 --space ididididid2 tktktktktk2 --every 2 30
```

Backs up spaces `ididididid1` and `ididididid2` to the current directory. While content is changing, backups occur every two minutes. When content isn't changing, backups occur every 30 minutes. Other configuration (here, plugins) would be read from a configuration file in the current directory.

```bash
$ contentful-backup --dir ../my-backups --plugins save-disk log-file git-commit
```

Backs up spaces to `../my-backups`, logs to `contentful-backup.log` in that directory, then checks in all changes. Other configuration (here, the spaces and any `every` setting) would be read from a configuration file in `../my-backups`.


## Errors

- Any error that occurs during the backup of a space, such as a network glitch, skips the rest of the backup for that space but doesn't exit the app. For example, imagine you've configured `contentful-backup` to back up two spaces in each backup run, and perform a backup run `--every 60` minutes. If an error occurs while fetching the content type information of the first space, then the app won't try to back up entries and assets for that space. Instead, it'll skip to backing up the second space, then wait 60 minutes before starting another backup run for both spaces.
- Use the `log-file` and/or `log-console` plugins to record details of any errors.
- Use the `git-commit` plugin to include error details in the commit log.
- You could write a plugin to notify a human or friendly droid when an error occurs.
- If an error occurs before `contentful-backup` finishes synchronising entries and assets, the app doesn't save the next synchronisation token. This means the next backup run reruns the synchronisation that failed (in other words, you shouldn't lose anything).
- If you don't trust a particular incremental backup, remove the `<space-id>` subdirectory of the target directory: the next backup run will trigger a full backup of that space.


## Questions

### What files are written?

`contentful-backup` writes these files and directories in the target directory, if the plugin shown is in use:

| File/directory | Plugin | Description |
|---|---|---|
| `contentful-backup.log` | `log-file` | Audit trail of backup runs |
| `<space-id>/space.json` | `save-disk` | Space metadata |
| `<space-id>/contentTypes.json` | `save-disk` | Content types metadata |
| `<space-id>/asset/<id>/data.json` | `save-disk` | Data for a single asset |
| `<space-id>/asset/<id>/<locale>/<filename>` | `save-disk` | An asset file |
| `<space-id>/entry/<id>/data.json` | `save-disk` | Data for a single entry |
| `<space-id>/deleted/<yyyy-mm-ddThh-mm-ss>/...` | `save-disk` | When moving deleted entries/assets, data deleted at the timestamp |
| `<space-id>/nextSyncToken.txt` | _always_ | The Contentful token indicating the most recent successful synchronisation |


### What value should I use for `--every`?

It's up to you. Something like `--every 1 1 2 5 10 30 60` covers many bases:

- While content is changing constantly, backup runs take place every minute.
- As soon as content stops changing, backup runs take place less frequently: after two minutes, then five, then ten, and so on.
- When content starts changing again, backup runs will occur every minute once more.

Bear in mind that every backup downloads space and content type metadata in full: even if your CMS entries and assets change rarely, each backup may still result in a hefty chunk of download.

Also, every backup contributes to your API usage, as measured by Contentful.


## Maintainer

David Smith (@avaragado)


## Contribute

Bug reports, feature requests and PRs are gratefully received. [Add an issue](https://github.com/avaragado/contentful-backup/issues/new) or submit a PR.

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.


## Licence

[MIT](LICENSE.txt) © David Smith
