// @flow

import path from 'path';

import winston from 'winston';

import type { BackupSpec } from '../../';
import { ContentfulBackup } from '../../';

const relpathLog = 'contentful-backup.log';

const log = (cfb: ContentfulBackup, backup: BackupSpec) => {
    winston.configure({
        transports: [
            new (winston.transports.File)({
                filename: path.resolve(backup.dir, relpathLog),
                maxsize: 1 * 1024 * 1024,
                maxFiles: 10,
                json: false,
                prettyPrint: true,
                tailable: true,
            }),
        ],
    });

    cfb.on('beforeRun', () => winston.info('Starting backup run'));

    cfb.on('beforeSpace', ({ space }) => winston.info(`Backing up ${space}`));

    cfb.on('afterSpaceMetadata', () => winston.info('Backed up space metadata'));
    cfb.on('afterContentTypeMetadata', () => winston.info('Backed up content type metadata'));

    cfb.on('beforeContent', ({ type, lastSyncDate }) => winston.info({
        initial: 'No current backup found: will download entire space',
        incremental: `Backing up changes since ${lastSyncDate}`,
    }[type]));

    cfb.on('progressContent', (prog) => {
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

    cfb.on('afterSpace', (err: ?Error) => {
        if (err) {
            winston.error('An error occurred', err);

        } else {
            winston.info('Done');
        }
    });

    cfb.on('afterRun', () => winston.info('End of backup run'));

    return cfb;
};

export default log;
