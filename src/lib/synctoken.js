// @flow

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import mkdirp from 'mkdirp';

const mkdir = promisify(mkdirp);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

const relpathToken = 'nextSyncToken.txt';
const abspathTokenForDir = dir => path.resolve(dir, relpathToken);

type Loader = (dir: string) => Promise<{ nextSyncToken: ?string, lastSyncDate: ?Date }>;

const load: Loader = async (dir) => {
    const abspath = abspathTokenForDir(dir);

    try {
        const nextSyncToken = await readFile(abspath, { encoding: 'utf-8' });
        const stats = await stat(abspath);

        return {
            nextSyncToken,
            lastSyncDate: stats.mtime,
        };

    } catch (err) {
        return { nextSyncToken: null, lastSyncDate: null };
    }
};

const save = async (dir: string, nextSyncToken: string): Promise<void> => {
    await mkdir(dir);
    await writeFile(abspathTokenForDir(dir), nextSyncToken);
};

export {
    load,
    save,
};
