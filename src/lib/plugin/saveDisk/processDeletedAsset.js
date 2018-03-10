// @flow

import path from 'path';
import { promisify } from 'util';
import rimrafCB from 'rimraf';

import type { Asset } from 'contentful';

const rimraf = promisify(rimrafCB);

const process = async (dir: string, asset: Asset) => {
    const abspath = path.resolve(dir, 'asset', asset.sys.id);

    await rimraf(abspath);
};

export {
    process,
};
