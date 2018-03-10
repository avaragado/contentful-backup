// @flow

import path from 'path';

import winston from 'winston';

import type { Plugin } from '../../';

const relpathLog = 'contentful-backup.log';

type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';

type FilePluginConfig = {
    level: LogLevel,
};

const plugin: Plugin = (cfb, backup, opts: FilePluginConfig) => {
    const logger = new (winston.Logger)({
        level: opts.level || 'info',
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

    cfb.on('beforeRun', () => logger.verbose('Starting backup run'));
    cfb.on('beforeSpace', ({ space }) => logger.verbose(`${space} Backup starting`));
    cfb.on('afterSpaceMetadata', ({ space }) => logger.verbose(`${space} Backed up space metadata`));
    cfb.on('afterContentTypeMetadata', ({ space }) => logger.verbose(`${space} Backed up content type metadata`));

    cfb.on('contentRecord', ({ total, ordinal, record, space, syncType, lastSyncDate }) => {
        if (total === 0) {
            return logger.verbose(`Nothing has changed since ${lastSyncDate}`);
        }

        if (ordinal === 0) {
            logger.info({
                initial: `${space} No current backup found: will download entire space`,
                incremental: `${space} Backing up changes since ${lastSyncDate}`,
            }[syncType]);
        }

        if (record) {
            return logger.info(
                space,
                `${ordinal}/${total}`,
                `${record.sys.type} id ${record.sys.id}`,
            );
        }

        return null;
    });

    cfb.on('afterSpace', ({ error }: { error?: Error }) => {
        if (error) {
            logger.error('An error occurred', error);

        } else {
            logger.verbose('Done');
        }
    });

    cfb.on('afterRun', () => logger.verbose('End of backup run'));

    return cfb;
};

export default plugin;
