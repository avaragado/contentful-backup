# Using `contentful-backup` programmatically

If you want to completely customise the behaviour of `contentful-backup`, you can ignore the command-line, configuration files and plugins, and import the core `ContentfulBackup` class and drive it yourself.

Much like writing a `contentful-backup` plugin, this mostly involves adding event handlers. In addition, you manually create a `ContentfulBackup` instance and call its `backup` method passing appropriate parameters.

See [Events](./events.md) for details of all events you can subscribe to, and [Flow types](./flow-types.md) for optional static types.


## Installation

```bash
$ yarn add @avaragado/contentful-backup
$ # or
$ npm install @avaragado/contentful-backup
```

## Example

Here's a quick example:

```ts
import type { ContentRecordEvent, BackupConfig } from '@avaragado/contentful-backup';

import { ContentfulBackup } from '@avaragado/contentful-backup';
import somePromiseReturningFunction from 'somewhere';

const cfb = new ContentfulBackup();

// cfb emits events and supports Promises
cfb.on('contentRecord', async (({ ordinal, total, record }: ContentRecordEvent) => {
    if (record) {
        console.log(`Synchronising ${ordinal}/${total} id ${record.sys.id}`);
        await somePromiseReturningFunction(record);
    }
}));

const backup: BackupConfig = {
    dir: 'my-dir',
    spaces: [
        { id: 'abcabcabc', token: 'vbvbvb' },
        { id: 'zxzxzxzx', token: 'cnxncnxn' },
    ],
    every: [1, 60],
};

cfb.backup(backup);
```
