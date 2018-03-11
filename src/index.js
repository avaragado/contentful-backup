// @flow
// main entry point for the lib

import { ContentfulBackup } from './lib/ContentfulBackup';

export type Space = { id: string, token: string };
export type PluginName = "save-disk" | "log-console" | "log-file" | "git-commit" | string;
export type PluginConfig = Object;
export type PluginSpecLoose = PluginName;
export type PluginSpecStrict = [PluginName, PluginConfig];
export type PluginSpec = PluginSpecLoose | PluginSpecStrict;

export type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
    every: Array<number>, // empty if single run
};

export type Plugin = (
    cfb: ContentfulBackup,
    backup: BackupSpec,
    config: PluginConfig,
) => ContentfulBackup;

export type FileConfig = {
    spaces?: Array<Space>,
    every?: number | Array<number>,
    plugins?: Array<PluginSpec>,
}

export type CLIConfig = {
    dir: string,
    space?: Array<Space>,
    spaces?: Array<Space>,
    every?: Array<number>,
    plugins: Array<PluginSpecStrict>,
};

export {
    ContentfulBackup,
};
