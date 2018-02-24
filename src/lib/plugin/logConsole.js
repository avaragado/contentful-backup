// @flow

import ora from 'ora';
import { bardot } from 'bardot';

import { ContentfulBackup } from '../../';

const log = (cfb: ContentfulBackup) => {
    const spinner = ora().start();
    const bar = bardot.widthFill(20);
    const data = {};

    cfb.on('beforeRun', () => {
        spinner.text = 'Starting backup run';
    });

    cfb.on('beforeSpace', ({ space, dir }) => {
        spinner.succeed().start(`${space}: Starting backup to ${dir}...`);
        data.space = space;
    });

    cfb.on('beforeSpaceMetadata', () => {
        spinner.text = `${data.space}: Getting space metadata...`;
    });

    cfb.on('beforeContentTypeMetadata', () => {
        spinner.text = `${data.space}: Getting content type metadata...`;
    });

    cfb.on('beforeContent', ({ type, lastSyncDate }) => {
        spinner.text = {
            initial: `${data.space}: No current backup found: will download entire space`,
            incremental: `${data.space}: Backing up changes since ${lastSyncDate}`,
        }[type];
    });

    cfb.on('progressContent', (prog) => {
        spinner.text = (prog.total === 0
            ? `${data.space}: No changes`
            : `${data.space}: ${bar.current(prog.done).maximum(prog.total).toString()}`
        );
    });

    cfb.on('afterSpace', (err: ?Error) => {
        if (err) {
            spinner.fail(`${data.space}: An error occurred`);
            console.log(err);

        } else {
            spinner.text = `${data.space}: Complete`;
        }
    });

    cfb.on('afterRun', () => spinner.succeed().succeed('End of backup run'));

    return cfb;
};

export default log;
