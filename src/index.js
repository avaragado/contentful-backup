// @flow
// main entry point for the lib

import { ContentfulBackup } from './lib/ContentfulBackup';

export type Space = { id: string, token: string };

export type Config = {
    spaces: Array<Space>,
};

export type BackupSpec = {
    dir: string,
    spaces: Array<Space>,
};

export {
    ContentfulBackup,
};
