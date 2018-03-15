// @flow
// main entry point for the lib

import { ContentfulBackup } from './lib/ContentfulBackup';

export type {
    BeforeSleepEvent,
    BeforeRunEvent, AfterRunEvent,
} from './lib/ContentfulBackup';

export type {
    BeforeSpaceEvent, AfterSpaceEvent,
    BeforeSpaceMetadataEvent, SpaceMetadataEvent, AfterSpaceMetadataEvent,
    BeforeContentTypeMetadataEvent, ContentTypeMetadataEvent, AfterContentTypeMetadataEvent,
    BeforeContentEvent, ContentEvent, ContentRecordEvent, AfterContentEvent,
} from './lib/backupSpace';

export type { SaveDiskPluginOptions } from './lib/plugin/saveDisk';
export type { LogFilePluginOptions } from './lib/plugin/logFile';
export type { GitCommitPluginOptions } from './lib/plugin/gitCommit';

export type SpaceConfig = { id: string, token: string };

export type PluginName = "save-disk" | "log-console" | "log-file" | "git-commit" | string;
export type PluginOptions = Object;
export type PluginConfigSimple = PluginName;
export type PluginConfigStrict = [PluginName, PluginOptions];
export type PluginConfig = PluginConfigSimple | PluginConfigStrict;

export type FileConfig = {
    spaces?: Array<SpaceConfig>,
    every?: number | Array<number>,
    plugins?: Array<PluginConfig>,
}

export type ResolvedConfig = {
    dir: string,
    space?: Array<SpaceConfig>,
    spaces?: Array<SpaceConfig>,
    every?: Array<number>,
    plugins: Array<PluginConfigStrict>,
};

export type BackupConfig = {
    dir: string,
    spaces: Array<SpaceConfig>,
    every: Array<number>, // empty if single run
};

export type Plugin = (
    cfb: ContentfulBackup,
    backup: BackupConfig,
    opts: PluginOptions,
) => ContentfulBackup;

export {
    ContentfulBackup,
};
