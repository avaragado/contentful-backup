// @flow

import path from 'path';

import type { ContentfulClientApi, Space, ContentTypeCollection, SyncCollection, Entry, Asset, DeletedEntry, DeletedAsset } from 'contentful';

import { createClient } from 'contentful';

import * as synctoken from './synctoken';

type SyncType = 'initial' | 'incremental';

type DirSpace = {|
    dir: string,
    space: string,
|};

export type BeforeSpaceEvent = {|
    ...DirSpace,
    token: string,
|};

export type AfterSpaceEvent = {|
    ...DirSpace,
    error?: Error,
|};

export type BeforeSpaceMetadataEvent = DirSpace;

export type SpaceMetadataEvent = {|
    ...BeforeSpaceMetadataEvent,
    metadata: Space,
|};

export type AfterSpaceMetadataEvent = BeforeSpaceMetadataEvent;

export type BeforeContentTypeMetadataEvent = DirSpace;

export type ContentTypeMetadataEvent = {|
    ...BeforeContentTypeMetadataEvent,
    metadata: ContentTypeCollection,
|};

export type AfterContentTypeMetadataEvent = BeforeContentTypeMetadataEvent;

export type BeforeContentEvent = {|
    ...DirSpace,
    syncType: SyncType,
    lastSyncDate: ?Date,
|};

export type ContentEvent = {|
    ...BeforeContentEvent,
    content: SyncCollection,
|};

export type ContentRecordEvent = {|
    ordinal: number,
    total: number,
    dir: string,
    space: string,
    syncType: SyncType,
    lastSyncDate: ?Date,
    record?: Entry | Asset | DeletedEntry | DeletedAsset,
    recordType?: 'Entry' | 'Asset' | 'DeletedEntry' | 'DeletedAsset',
|};

export type AfterContentEvent = BeforeContentEvent;

type Emitter = (event: string, arg: Object) => Promise<void>;

type BackupSpace = { emit: Emitter, dir: string, space: string, token: string } => Promise<boolean>;


// we process each record serially, so we don't clobber the contentful API
// with a bunch of parallel requests for asset originals.
const processSyncRecordSpecs = async (emit, ordinal, recordSpecs) => {
    if (recordSpecs.length === 0) {
        return null;
    }

    const [recordSpec, ...recordSpecsRest] = recordSpecs;

    await emit('contentRecord', ({ ordinal, ...recordSpec }: ContentRecordEvent));

    return processSyncRecordSpecs(emit, ordinal + 1, recordSpecsRest);
};

const processSyncCollection = async (emit, content, dir, space, syncType, lastSyncDate): Promise<boolean> => {
    const { entries, assets, deletedEntries, deletedAssets } = content;
    const total = [entries, assets, deletedEntries, deletedAssets]
        .reduce((acc, item) => acc + item.length, 0);

    if (total === 0) {
        await emit('contentRecord', ({ ordinal: 0, total, dir, space, syncType, lastSyncDate }: ContentRecordEvent));
        return false;
    }

    const recordSpecs = []
        .concat(entries.map(record => ({ total, dir, space, syncType, lastSyncDate, record, recordType: 'Entry' })))
        .concat(assets.map(record => ({ total, dir, space, syncType, lastSyncDate, record, recordType: 'Asset' })))
        .concat(deletedEntries.map(record => ({ total, dir, space, syncType, lastSyncDate, record, recordType: 'DeletedEntry' })))
        .concat(deletedAssets.map(record => ({ total, dir, space, syncType, lastSyncDate, record, recordType: 'DeletedAsset' })));

    await processSyncRecordSpecs(emit, 1, recordSpecs);

    return true;
};

const syncContent = async (emit, cfClient, dir, space): Promise<boolean> => {
    const dirSpace = path.resolve(dir, space);

    const { nextSyncToken, lastSyncDate } = await synctoken.load(dirSpace);

    const syncType: SyncType = nextSyncToken ? 'incremental' : 'initial';
    const opts = nextSyncToken ? { nextSyncToken } : { initial: true, resolveLinks: false };

    await emit('beforeContent', ({ dir, space, syncType, lastSyncDate }: BeforeContentEvent));

    const content: SyncCollection = await cfClient.sync(opts);

    await emit('content', ({ dir, space, syncType, lastSyncDate, content }: ContentEvent));

    const didChange = await processSyncCollection(emit, content, dir, space, syncType, lastSyncDate);

    await emit('afterContent', ({ dir, space, syncType, lastSyncDate }: AfterContentEvent));

    await synctoken.save(dirSpace, content.nextSyncToken);

    return didChange;
};

const fetchMetaContentTypes = async (emit, cfClient, dir, space) => {
    await emit('beforeContentTypeMetadata', ({ dir, space }: BeforeContentTypeMetadataEvent));

    const metadata = await cfClient.getContentTypes();

    await emit('contentTypeMetadata', ({ dir, space, metadata }: ContentTypeMetadataEvent));
    await emit('afterContentTypeMetadata', ({ dir, space }: AfterContentTypeMetadataEvent));
};

const fetchMetaSpace = async (emit, cfClient, dir, space) => {
    await emit('beforeSpaceMetadata', ({ dir, space }: BeforeSpaceMetadataEvent));

    const metadata: Space = await cfClient.getSpace();

    await emit('spaceMetadata', ({ dir, space, metadata }: SpaceMetadataEvent));
    await emit('afterSpaceMetadata', ({ dir, space }: AfterSpaceMetadataEvent));
};

const backupSpace: BackupSpace = async ({ emit, dir, space, token }) => {
    await emit('beforeSpace', ({ dir, space, token }: BeforeSpaceEvent));

    const cfClient: ContentfulClientApi = createClient({ space, accessToken: token });

    try {
        await fetchMetaSpace(emit, cfClient, dir, space);
        await fetchMetaContentTypes(emit, cfClient, dir, space);
        const didChange = await syncContent(emit, cfClient, dir, space);

        await emit('afterSpace', ({ dir, space }: AfterSpaceEvent));

        return didChange;

    } catch (error) {
        await emit('afterSpace', ({ dir, space, error }: AfterSpaceEvent));
        return true; // next backup will occur quickly if exponential backup configured
    }
};

export {
    backupSpace,
};
