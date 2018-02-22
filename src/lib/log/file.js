// @flow

import path from 'path';

import winston from 'winston';

import type { BackupSpec } from '../../';
import { ContentfulBackup } from '../../';

const relpathLog = 'contentful-backup.log';

const log = (cfb: ContentfulBackup, spec: BackupSpec) => {
    winston.configure({
        transports: [
            new (winston.transports.File)({
                filename: path.resolve(spec.dir, relpathLog),
                maxsize: 1 * 1024 * 1024,
                maxFiles: 10,
                json: false,
                prettyPrint: true,
                tailable: true,
            }),
        ],
    });

    cfb.on('start', ({ space }) => winston.info(`Backing up ${space}`));

    cfb.on('afterSpace', () => winston.info('Backed up space metadata'));
    cfb.on('afterContentTypes', () => winston.info('Backed up content type metadata'));

    cfb.on('syncMeta', ({ type, lastSyncDate }) => winston.info({
        initial: 'No current backup found: will download entire space',
        incremental: `Backing up changes since ${lastSyncDate}`,
    }[type]));

    cfb.on('syncProgress', (prog) => {
        if (prog.total === 0) {
            return winston.info('Nothing has changed');
        }

        if (prog.rec) {
            return winston.info(
                `${prog.done}/${prog.total}`,
                `${prog.rec.sys.type} id ${prog.rec.sys.id}`,
            );
        }

        return null;
    });

    cfb.on('done', () => winston.info('Done'));

    cfb.on('error', (err) => {
        winston.error('An error occurred', err);
    });

    return cfb;
};

export default log;
