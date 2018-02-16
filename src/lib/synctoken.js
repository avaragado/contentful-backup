// @flow

import path from 'path';
import fs from 'fs';

const relpathToken = 'nextSyncToken.txt';

type Loader = (dir: string) => { nextSyncToken: ?string, lastSyncDate: ?Date };

const load: Loader = (dir) => {
    const abspath = path.resolve(dir, relpathToken);

    try {
        const nextSyncToken = fs.readFileSync(abspath, { encoding: 'utf-8' });
        const stats = fs.statSync(abspath);

        return {
            nextSyncToken,
            lastSyncDate: stats.mtime,
        };

    } catch (err) {
        return { nextSyncToken: null, lastSyncDate: null };
    }
};

const save = (dir: string, nextSyncToken: string): void => {
    fs.writeFileSync(path.resolve(dir, relpathToken), nextSyncToken);
};

export {
    load,
    save,
};
