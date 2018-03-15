# Flow types

When writing plugins or using `contentful-backup` programmatically, it might be useful to import [flow](https://flow.org) types. Here's an exhaustive list of types you can import:

```ts
import type {
    SpaceConfig,

    PluginName, PluginOptions,
    PluginConfigSimple, PluginConfigStrict, PluginConfig,

    SaveDiskPluginOptions, LogFilePluginOptions, GitCommitPluginOptions,

    FileConfig, ResolvedConfig, BackupConfig,

    Plugin,

    BeforeSleepEvent,
    BeforeRunEvent, AfterRunEvent,
    BeforeSpaceEvent, AfterSpaceEvent,
    BeforeSpaceMetadataEvent, SpaceMetadataEvent, AfterSpaceMetadataEvent,
    BeforeContentTypeMetadataEvent, ContentTypeMetadataEvent, AfterContentTypeMetadataEvent,
    BeforeContentEvent, ContentEvent, ContentRecordEvent, AfterContentEvent,
} from '@avaragado/contentful-backup';
```

If you're reading this, you can probably figure out the rest.
