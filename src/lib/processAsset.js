// @flow

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import mkdirp from 'mkdirp';
import fetch from 'node-fetch';

import type { Asset } from 'contentful';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(mkdirp);

// we process each asset file serially, so we don't clobber the contentful API
// with a bunch of parallel requests.
const applySerially = async (specs) => {
    if (specs.length === 0) {
        return null;
    }

    const [spec, ...specsRest] = specs;

    await mkdir(path.dirname(spec.abspath));

    const res = await fetch(spec.url);
    const dest = fs.createWriteStream(spec.abspath);
    res.body.pipe(dest);

    return applySerially(specsRest);
};


const process = async (dir: string, asset: Asset) => {
    const abspath = path.resolve(dir, 'asset', asset.sys.id);

    await mkdir(abspath);
    await writeFile(path.resolve(abspath, 'data.json'), JSON.stringify(asset, null, 4));

    const objFile = asset.fields.file;

    const specs = Object.keys(objFile).map(locale => ({
        url: `https:${objFile[locale].url}`, // contentful assets omit the protocol
        abspath: path.resolve(abspath, locale, objFile[locale].fileName),
    }));

    await applySerially(specs);
};

export {
    process,
};
