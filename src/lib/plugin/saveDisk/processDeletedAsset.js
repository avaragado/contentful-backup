// @flow

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import rimrafCB from 'rimraf';
import mkdirp from 'mkdirp';

import type { DeletedAsset } from 'contentful';
import type { SaveDiskPluginOptions } from '.';

const rename = promisify(fs.rename);
const rimraf = promisify(rimrafCB);
const mkdir = promisify(mkdirp);

const process = async (dir: string, asset: DeletedAsset, opts: SaveDiskPluginOptions, timestamp: string) => {
    const opt = opts.onDeletedAsset || 'move';
    const abspathSource = path.resolve(dir, 'asset', asset.sys.id);

    if (opt === 'delete') {
        await rimraf(abspathSource);

    } else {
        const abspathTarget = path.resolve(dir, 'deleted', timestamp, 'asset', asset.sys.id);

        await mkdir(path.dirname(abspathTarget));
        await rename(abspathSource, abspathTarget);
    }
};

export {
    process,
};
