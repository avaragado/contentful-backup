// @flow

import path from 'path';
import { promisify } from 'util';
import rimrafCB from 'rimraf';

import type { Entry } from 'contentful';

const rimraf = promisify(rimrafCB);

const process = async (dir: string, entry: Entry) => {
    const abspath = path.resolve(dir, 'entry', entry.sys.id);

    await rimraf(abspath);
};

export {
    process,
};
