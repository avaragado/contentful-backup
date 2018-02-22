// @flow

import EventEmitter from 'events';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import type { ContentfulClientApi } from 'contentful';
import { createClient } from 'contentful';
import mkdirp from 'mkdirp';

import type { BackupSpec, Space } from '../';
import * as synctoken from './synctoken';
import { process } from './process';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(mkdirp);

const sleep = minutes => new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));

class ContentfulBackup extends EventEmitter {
    async sync (cfClient: ContentfulClientApi, dir: string) {
        const { nextSyncToken, lastSyncDate } = synctoken.load(dir);

        this.emit('syncMeta', {
            type: nextSyncToken ? 'incremental' : 'initial',
            lastSyncDate,
        });

        const opts = nextSyncToken ? { nextSyncToken } : { initial: true, resolveLinks: false };

        this.emit('beforeSync');

        const response = await cfClient.sync(opts);

        await process(dir, response, prog => this.emit('syncProgress', prog));

        this.emit('afterSync', response);

        synctoken.save(dir, response.nextSyncToken);
    }

    async space (cfClient: ContentfulClientApi, dir: string) {
        this.emit('beforeSpace');
        const response = await cfClient.getSpace();

        await writeFile(path.resolve(dir, 'space.json'), JSON.stringify(response, null, 4));

        this.emit('afterSpace', response);
    }

    async contentTypes (cfClient: ContentfulClientApi, dir: string) {
        this.emit('beforeContentTypes');
        const response = await cfClient.getContentTypes();

        await writeFile(path.resolve(dir, 'contentTypes.json'), JSON.stringify(response, null, 4));

        this.emit('afterContentTypes', response);
    }

    async backupSpace ({ dir, space, token }: { dir: string, space: string, token: string }) {
        this.emit('start', { dir, space, token });

        const cfClient = createClient({ space, accessToken: token });
        const dirSpace = path.resolve(dir, space);

        try {
            await mkdir(dirSpace);
            await this.space(cfClient, dirSpace);
            await this.contentTypes(cfClient, dirSpace);
            await this.sync(cfClient, dirSpace);

            this.emit('done');

        } catch (err) {
            this.emit('error', err);
        }
    }

    async backupAll ({ dir, spaces }: { dir: string, spaces: Array<Space> }) {
        if (spaces.length === 0) {
            return true;
        }

        const [{ id: space, token }, ...spacesRest] = spaces;

        await this.backupSpace({ dir, space, token });

        return this.backupAll({ dir, spaces: spacesRest });
    }

    async backup ({ dir, spaces, every }: BackupSpec) {
        if (every) {
            while (true) { // eslint-disable-line no-constant-condition
                await this.backupAll({ dir, spaces }); // eslint-disable-line no-await-in-loop
                await sleep(every); // eslint-disable-line no-await-in-loop
            }
        }

        return this.backupAll({ dir, spaces });
    }
}

export {
    ContentfulBackup,
};
