// @flow

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import mkdirp from 'mkdirp';

import type { Plugin } from '../../../';

import { process as processEntry } from './processEntry';
import { process as processAsset } from './processAsset';
import { process as processDeletedEntry } from './processDeletedEntry';
import { process as processDeletedAsset } from './processDeletedAsset';

type DeleteOption = 'delete' | 'move';

export type SaveDiskPluginOptions = {
    onDeletedEntry?: DeleteOption,
    onDeletedAsset?: DeleteOption,
};

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(mkdirp);

const serialise = data => JSON.stringify(data, null, 4);

const processor = {
    'Entry': processEntry,
    'Asset': processAsset,
    'DeletedEntry': processDeletedEntry,
    'DeletedAsset': processDeletedAsset,
};

const plugin: Plugin = (cfb, backup, opts: SaveDiskPluginOptions) => {
    let timestamp;

    cfb.on('beforeRun', async () => {
        timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, -5);
    });

    cfb.on('beforeSpace', async ({ dir, space }) => {
        const dirSpace = path.resolve(dir, space);

        await mkdir(path.resolve(dir, space));
        await mkdir(path.resolve(dirSpace, 'entry'));
        await mkdir(path.resolve(dirSpace, 'asset'));
    });

    cfb.on('spaceMetadata', async ({ dir, space, metadata }) => writeFile(path.resolve(dir, space, 'space.json'), serialise(metadata)));
    cfb.on('contentTypeMetadata', async ({ dir, space, metadata }) => writeFile(path.resolve(dir, space, 'contentTypes.json'), serialise(metadata)));

    cfb.on('contentRecord', async ({ dir, space, record, recordType }) => {
        if (record) {
            await processor[recordType](path.resolve(dir, space), record, opts, timestamp);
        }
    });

    return cfb;
};

export default plugin;
