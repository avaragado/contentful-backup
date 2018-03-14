// @flow

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import rimrafCB from 'rimraf';
import mkdirp from 'mkdirp';

import type { DeletedEntry } from 'contentful';
import type { SaveDiskPluginOptions } from '.';

const rename = promisify(fs.rename);
const rimraf = promisify(rimrafCB);
const mkdir = promisify(mkdirp);

const process = async (dir: string, entry: DeletedEntry, opts: SaveDiskPluginOptions, timestamp: string) => {
    const opt = opts.onDeletetEntry || 'move';
    const abspathSource = path.resolve(dir, 'entry', entry.sys.id);

    if (opt === 'delete') {
        await rimraf(abspathSource);

    } else {
        const abspathTarget = path.resolve(dir, 'deleted', timestamp, 'entry', entry.sys.id);

        await mkdir(path.dirname(abspathTarget));
        await rename(abspathSource, abspathTarget);
    }
};

export {
    process,
};
