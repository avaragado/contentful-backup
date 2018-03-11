// @flow

import path from 'path';

import type { ContentfulClientApi, SyncCollection, Entry, Asset, DeletedEntry, DeletedAsset } from 'contentful';

import { createClient } from 'contentful';

import * as synctoken from './synctoken';

type SyncType = 'initial' | 'incremental';
type RecordSpec = {
    total: number,
    record?: Entry | Asset | DeletedEntry | DeletedAsset,
    recordType?: 'Entry' | 'Asset' | 'DeletedEntry' | 'DeletedAsset',
    dir: string,
    space: string,
    syncType: SyncType,
    lastSyncDate: ?Date,
};

type Emitter = (event: string, arg: Object) => Promise<void>;

type BackupSpace = { emit: Emitter, dir: string, space: string, token: string } => Promise<boolean>;


// we process each record serially, so we don't clobber the contentful API
// with a bunch of parallel requests for asset originals.
const processSyncRecordSpecs = async (emit, ordinal, recordSpecs) => {
    if (recordSpecs.length === 0) {
        return null;
    }

    const [recordSpec, ...recordSpecsRest] = recordSpecs;

    await emit('contentRecord', { ordinal, ...recordSpec });

    return processSyncRecordSpecs(emit, ordinal + 1, recordSpecsRest);
};

const processSyncCollection = async (emit, content, dir, space, syncType, lastSyncDate): Promise<boolean> => {
    const { entries, assets, deletedEntries, deletedAssets } = content;
    const total = [entries, assets, deletedEntries, deletedAssets]
        .reduce((acc, item) => acc + item.length, 0);
    const recordSpecBase: RecordSpec = { total, dir, space, syncType, lastSyncDate };

    if (total === 0) {
        await emit('contentRecord', { ...recordSpecBase, ordinal: 0 });
        return false;
    }

    const recordSpecs = []
        .concat(entries.map(record => ({ ...recordSpecBase, record, recordType: 'Entry' })))
        .concat(assets.map(record => ({ ...recordSpecBase, record, recordType: 'Asset' })))
        .concat(deletedEntries.map(record => ({ ...recordSpecBase, record, recordType: 'DeletedEntry' })))
        .concat(deletedAssets.map(record => ({ ...recordSpecBase, record, recordType: 'DeletedAsset' })));

    await processSyncRecordSpecs(emit, 1, recordSpecs);

    return true;
};

const syncContent = async (emit, cfClient, dir, space): Promise<boolean> => {
    const dirSpace = path.resolve(dir, space);

    const { nextSyncToken, lastSyncDate } = await synctoken.load(dirSpace);

    const syncType = nextSyncToken ? 'incremental' : 'initial';
    const opts = nextSyncToken ? { nextSyncToken } : { initial: true, resolveLinks: false };

    await emit('beforeContent', { dir, space, syncType, lastSyncDate });

    const content: SyncCollection = await cfClient.sync(opts);

    await emit('content', { dir, space, syncType, lastSyncDate, content });

    const didChange = await processSyncCollection(emit, content, dir, space, syncType, lastSyncDate);

    await emit('afterContent', { dir, space });

    await synctoken.save(dirSpace, content.nextSyncToken);

    return didChange;
};

const fetchMetaContentTypes = async (emit, cfClient, dir, space) => {
    await emit('beforeContentTypeMetadata', { dir, space });

    const metadata = await cfClient.getContentTypes();

    await emit('contentTypeMetadata', { dir, space, metadata });
    await emit('afterContentTypeMetadata', { dir, space });
};

const fetchMetaSpace = async (emit, cfClient, dir, space) => {
    await emit('beforeSpaceMetadata', { dir, space });

    const metadata = await cfClient.getSpace();

    await emit('spaceMetadata', { dir, space, metadata });
    await emit('afterSpaceMetadata', { dir, space });
};

const backupSpace: BackupSpace = async ({ emit, dir, space, token }) => {
    await emit('beforeSpace', { dir, space, token });

    const cfClient: ContentfulClientApi = createClient({ space, accessToken: token });

    try {
        await fetchMetaSpace(emit, cfClient, dir, space);
        await fetchMetaContentTypes(emit, cfClient, dir, space);
        const didChange = await syncContent(emit, cfClient, dir, space);

        await emit('afterSpace', { dir, space });

        return didChange;

    } catch (error) {
        await emit('afterSpace', { dir, space, error });
        return true; // next backup will occur quickly if exponential backup configured
    }
};

export {
    backupSpace,
};
