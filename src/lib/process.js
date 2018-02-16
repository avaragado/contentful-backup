// @flow

import path from 'path';

import { promisify } from 'util';

import type { SyncCollection } from 'contentful';
import mkdirp from 'mkdirp';

import { process as processEntry } from './processEntry';
import { process as processAsset } from './processAsset';
import { process as processDeletedEntry } from './processDeletedEntry';
import { process as processDeletedAsset } from './processDeletedAsset';

type Progress = {
    done: number,
    total: number,
};

type Emitter = (prog: Progress) => any;

const mkdir = promisify(mkdirp);

// we process each entry/asset/deletion serially, so we don't clobber the contentful API
// with a bunch of parallel requests for asset originals.
const applySerially = async (progress, dir, emit, specs) => {
    if (specs.length === 0) {
        return null;
    }

    const [spec, ...specsRest] = specs;

    await spec.fn(dir, spec.rec);

    progress.done += 1;
    emit(progress);

    return applySerially(progress, dir, emit, specsRest);
};

const process = async (dir: string, response: SyncCollection, emit: Emitter) => {
    const { entries, assets, deletedEntries, deletedAssets } = response;
    const total = [entries, assets, deletedEntries, deletedAssets]
        .reduce((acc, item) => acc + item.length, 0);

    const progress: Progress = { done: 0, total };

    emit(progress);

    if (total === 0) {
        return;
    }

    await mkdir(path.resolve(dir, 'entry'));
    await mkdir(path.resolve(dir, 'asset'));

    const specs = []
        .concat(entries.map(rec => ({ rec, fn: processEntry })))
        .concat(assets.map(rec => ({ rec, fn: processAsset })))
        .concat(deletedEntries.map(rec => ({ rec, fn: processDeletedEntry })))
        .concat(deletedAssets.map(rec => ({ rec, fn: processDeletedAsset })));

    await applySerially(progress, dir, emit, specs);
};

export {
    process,
};
