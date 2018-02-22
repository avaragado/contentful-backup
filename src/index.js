// @flow
// main entry point for the lib

import { ContentfulBackup } from './lib/ContentfulBackup';

export type Space = { id: string, token: string };
export type LogName = "none" | "console" | "file" | string;

export type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
    every: ?number,
};

export type LogFn = (cfb: ContentfulBackup, spec?: BackupSpec) => ContentfulBackup

export type FileConfig = {
    spaces?: Array<Space>,
    every?: number,
    log?: LogName,
}

export type CLIConfig = {
    dir: string,
    space?: Array<Space>,
    spaces?: Array<Space>,
    every?: number,
    log: LogFn,
};

export {
    ContentfulBackup,
};
