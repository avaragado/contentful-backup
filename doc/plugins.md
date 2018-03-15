# Writing custom plugins

You can write your own plugin to replace or augment the built-in plugins.

A plugin is a standard node module. It must export a function. Before starting the backup, the `contentful-backup` app calls this function, passing a `ContentfulBackup` instance and other data, and the function must return a `ContentfulBackup` instance.

Essentially, plugins add event handlers to the `ContentfulBackup` instance and then return it. See [Events](./events.md) for details of all events you can subscribe to, and [Flow types](./flow-types.md) for optional static types.


## Types

Plugins must conform to the `Plugin` type. Here's how that type is built from other types:

```ts
import { ContentfulBackup } from '@avaragado/contentful';

type SpaceConfig = { id: string, token: string };
type PluginOptions = Object;

type BackupConfig = {
    dir: string,
    spaces: Array<SpaceConfig>,
    every: Array<number>, // empty if single run
};

type Plugin = (
    cfb: ContentfulBackup,
    backup: BackupConfig,
    opts: PluginOptions,
) => ContentfulBackup;
```

The third parameter to the plugin is the plugin options object defined in the `contentful-backup` configuration file, if any. It defaults to `{}`. You can declare a more specific type in your plugin code, as shown in the example below.


## Example

```ts
import type { Plugin } from '@avaragado/contentful';

type ShortlogPluginOptions = {
    prefix: string,
};

const shortlog: Plugin = (cfb, { dir, spaces, every }, opts: ShortlogPluginOptions) => {
    cfb.on('beforeSpace', ({ space, dir }) =>
        console.log(`${opts.prefix || '[log]'} Starting backup of ${space} to ${dir}...`));

    cfb.on('afterSpace', ({ error }) =>
        console.log(error ? error.toString() : 'OK'));

    return cfb;
};

module.exports = shortlog;
```

If you save this plugin to, say, `~/shortlog.js`, you can select it by passing the argument `--plugins ~/shortlog.js` to `contentful-backup`. However, this doesn't let you set the plugin options object.

To set plugin options, add your plugin to your `contentful-backup` configuration file. For example:

```json
{
    "plugins": [
        "save-disk",
        ["~/shortlog.js", { "prefix": "¯\_(ツ)_/¯" }]
    ]
}
```


## Lifecycle

`contentful-backup` creates one `ContentfulBackup` instance for the lifetime of the app process. The same instance is used for each space in a single backup run, and for every backup run (if you use `--every`). If your plugin saves any state internally, be sure to initialise properly on the `beforeRun` and/or `beforeSpace` events, and clean up after yourself on `afterSpace` and/or `afterRun`.

You configure plugins by defining an ordered list. The plugins are registered in that order, which means each `ContentBackup` event handler is invoked in the same order. Event handlers can return promises (or use `async`/`await`) if they need to be asynchronous. Handlers are always invoked serially: a handler must finish, even if it's async, before the next one starts.

Because plugins bind to `ContentfulBackup` events, some occur for each space separately. Only the `beforeRun` and `afterRun` events fire once for all spaces as a group (once per backup run, so once every `--every` period).
