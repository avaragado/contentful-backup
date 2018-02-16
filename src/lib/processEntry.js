// @flow

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import mkdirp from 'mkdirp';

import type { Entry } from 'contentful';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(mkdirp);

const process = async (dir: string, entry: Entry) => {
    const abspath = path.resolve(dir, 'entry', entry.sys.id);

    await mkdir(abspath);
    await writeFile(path.resolve(abspath, 'data.json'), JSON.stringify(entry, null, 4));
};

export {
    process,
};
