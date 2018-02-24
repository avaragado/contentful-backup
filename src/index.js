// @flow
// main entry point for the lib

import { ContentfulBackup } from './lib/ContentfulBackup';

export type Space = { id: string, token: string };
export type PluginName = "log-console" | "log-file" | "git-commit" | string;
export type PluginConfig = Object;
export type PluginSpec = PluginName | [PluginName, PluginConfig];

export type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
    every: ?number,
};

export type PluginFn = (
    cfb: ContentfulBackup,
    backup: BackupSpec,
    config: PluginConfig,
) => ContentfulBackup;

export type PluginFnSpec = [PluginFn, PluginConfig];

export type FileConfig = {
    spaces?: Array<Space>,
    every?: number,
    plugins?: Array<PluginSpec>,
}

export type CLIConfig = {
    dir: string,
    space?: Array<Space>,
    spaces?: Array<Space>,
    every?: number,
    plugins: Array<PluginFnSpec>,
};

export {
    ContentfulBackup,
};
