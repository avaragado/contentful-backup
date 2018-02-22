// @flow

import ora from 'ora';
import { bardot } from 'bardot';

import { ContentfulBackup } from '../../';

const log = (cfb: ContentfulBackup) => {
    const spinner = ora();
    const bar = bardot.widthFill(5);

    cfb.on('start', ({ space, dir }) => spinner.start(`Starting backup of ${space} to ${dir}...`));

    cfb.on('syncMeta', ({ type, lastSyncDate }) => spinner.succeed().start({
        initial: 'No current backup found: will download entire space',
        incremental: `Backing up changes since ${lastSyncDate}`,
    }[type]));

    cfb.on('beforeSpace', () => spinner.succeed().start('Getting space metadata...'));
    cfb.on('beforeContentTypes', () => spinner.succeed().start('Getting content type metadata...'));
    cfb.on('beforeSync', () => spinner.succeed().start('Syncing...'));

    cfb.on('syncProgress', prog => (prog.total === 0
        ? spinner.start('Nothing has changed')
        : spinner.start(bar.current(prog.done).maximum(prog.total).toString())
    ));

    cfb.on('done', () => spinner.succeed().succeed('OK'));

    cfb.on('error', (err) => {
        spinner.fail('An error occurred');

        console.log(err);
    });

    return cfb;
};

export default log;
