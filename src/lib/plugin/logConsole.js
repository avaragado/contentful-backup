// @flow

import ora from 'ora';
import { bardot } from 'bardot';

import type { Plugin } from '../../';

const plugin: Plugin = (cfb) => {
    const spinner = ora().start();
    const bar = bardot.widthFill(20);

    cfb.on('beforeRun', () => spinner.stopAndPersist({
        symbol: '▶️ ',
        text: `Starting backup run – ${new Date().toString()}`,
    }));

    cfb.on('beforeSpace', ({ space, dir }) => {
        spinner.start(`${space}: Starting backup to ${dir}...`);
    });

    cfb.on('beforeSpaceMetadata', ({ space }) => {
        spinner.text = `${space}: Getting space metadata...`;
    });

    cfb.on('beforeContentTypeMetadata', ({ space }) => {
        spinner.text = `${space}: Getting content type metadata...`;
    });

    cfb.on('beforeContent', ({ space, syncType, lastSyncDate }) => {
        spinner.text = {
            initial: `${space}: No current backup found: will download entire space`,
            incremental: `${space}: Backing up changes since ${lastSyncDate}`,
        }[syncType];
    });

    cfb.on('contentRecord', ({ ordinal, total, space }) => {
        spinner.text = (total === 0
            ? `${space}: No changes`
            : `${space}: ${bar.current(ordinal).maximum(total).toString()}`
        );
    });

    cfb.on('afterSpace', ({ space, error }: { space: string, error?: Error }) => {
        if (error) {
            spinner.fail(`${space}: An error occurred`);
            console.log(error);

        } else {
            spinner.stopAndPersist({
                symbol: '✅',
            });
        }
    });

    cfb.on('afterRun', () => spinner.stopAndPersist({
        symbol: '⏹ ',
        text: `End of backup run – ${new Date().toString()}`,
    }));

    cfb.on('beforeSleep', ({ didChange, sleep }) => spinner.stopAndPersist({
        symbol: '🕙',
        text: `${didChange ? 'At least one space changed' : 'No spaces changed'} – sleeping for ${sleep} min...`,
    }));

    return cfb;
};

export default plugin;
