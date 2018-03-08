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
    async sync (cfClient: ContentfulClientApi, dir: string, space: string) {
        const { nextSyncToken, lastSyncDate } = synctoken.load(dir);

        const type = nextSyncToken ? 'incremental' : 'initial';

        this.emit('beforeContent', { space, type, lastSyncDate });

        const opts = nextSyncToken ? { nextSyncToken } : { initial: true, resolveLinks: false };

        const result = await cfClient.sync(opts);

        await process(dir, result, prog => this.emit('progressContent', { ...prog, space, type, lastSyncDate }));

        this.emit('afterContent', { space, type, lastSyncDate, result });

        synctoken.save(dir, result.nextSyncToken);
    }

    async space (cfClient: ContentfulClientApi, dir: string, space: string) {
        this.emit('beforeSpaceMetadata', { space });

        const result = await cfClient.getSpace();

        await writeFile(path.resolve(dir, 'space.json'), JSON.stringify(result, null, 4));

        this.emit('afterSpaceMetadata', { space, result });
    }

    async contentTypes (cfClient: ContentfulClientApi, dir: string, space: string) {
        this.emit('beforeContentTypeMetadata', { space });

        const result = await cfClient.getContentTypes();

        await writeFile(path.resolve(dir, 'contentTypes.json'), JSON.stringify(result, null, 4));

        this.emit('afterContentTypeMetadata', { space, result });
    }

    async backupSpace ({ dir, space, token }: { dir: string, space: string, token: string }) {
        this.emit('beforeSpace', { dir, space, token });

        const cfClient = createClient({ space, accessToken: token });
        const dirSpace = path.resolve(dir, space);

        try {
            await mkdir(dirSpace);
            await this.space(cfClient, dirSpace, space);
            await this.contentTypes(cfClient, dirSpace, space);
            await this.sync(cfClient, dirSpace, space);

            this.emit('afterSpace', { space });

        } catch (error) {
            this.emit('afterSpace', { space, error });
        }
    }

    async backupSpaces ({ dir, spaces }: { dir: string, spaces: Array<Space> }) {
        if (spaces.length === 0) {
            return true;
        }

        const [{ id: space, token }, ...spacesRest] = spaces;

        await this.backupSpace({ dir, space, token });

        return this.backupSpaces({ dir, spaces: spacesRest });
    }

    async backupAll ({ dir, spaces }: { dir: string, spaces: Array<Space> }) {
        if (spaces.length === 0) {
            return;
        }

        this.emit('beforeRun');
        await this.backupSpaces({ dir, spaces });
        this.emit('afterRun');
    }

    async backup ({ dir, spaces, every }: BackupSpec) {
        if (every) {
            while (true) { // eslint-disable-line no-constant-condition
                await this.backupAll({ dir, spaces }); // eslint-disable-line no-await-in-loop
                await sleep(every); // eslint-disable-line no-await-in-loop
            }
        }

        await this.backupAll({ dir, spaces });
    }
}

export {
    ContentfulBackup,
};
