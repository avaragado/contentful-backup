// @flow

import ora from 'ora';
import { bardot } from 'bardot';

import { ContentfulBackup } from '../../';

const log = (cfb: ContentfulBackup) => {
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

    cfb.on('beforeContent', ({ space, type, lastSyncDate }) => {
        spinner.text = {
            initial: `${space}: No current backup found: will download entire space`,
            incremental: `${space}: Backing up changes since ${lastSyncDate}`,
        }[type];
    });

    cfb.on('progressContent', ({ done, total, space }) => {
        spinner.text = (total === 0
            ? `${space}: No changes`
            : `${space}: ${bar.current(done).maximum(total).toString()}`
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

    return cfb;
};

export default log;
