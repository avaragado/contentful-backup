#!/usr/bin/env node
// @flow

import path from 'path';

import 'babel-polyfill';
import yargs from 'yargs';
import outdent from 'outdent';
import ora from 'ora';
import { bardot } from 'bardot';

import type { Space, Config, BackupSpec } from '../';
import { ContentfulBackup } from '../';

const relpathConfig = 'contentful-backup.config';

const { argv } = yargs
    .usage(outdent`
        $0 [--dir <target>] [--space <id> --token <cda-token>]

        Backs up one or more Contentful spaces into the target directory.

        If you omit --dir, assumes the target directory is the current directory.

        If you specify --space and --token, backs up just this space.

        If you omit --space and --token, reads them from the 'spaces' key in
        ${relpathConfig}.{js,json} in the target directory.
    `)
    .example(
        '$0 --space abcdabcdabcd --token abcdefg',
        'Backs up space abcdabcdabcd to the current directory, using the CDA token supplied.',
    )
    .example(
        '$0 --dir ../my-backups',
        'Backs up spaces according to the configuration file in ../my-backups',
    )
    .options({
        'dir': {
            desc: outdent`
                Directory in which to store the backup. Must already exist, defaults to the current directory
            `,
            default: '.',
            config: true,
            configParser: (dir: string): Config =>
                ({ dir, ...require(path.resolve(dir, relpathConfig)) }),
        },
        'space': {
            desc: outdent`
                Contentful space ID
            `,
            string: true,
            implies: 'token',
        },
        'token': {
            desc: outdent`
                Contentful Content Delivery API token
            `,
            string: true,
            implies: 'space',
        },
    })
    .check((argvv: { dir: string, space?: string, token?: string, spaces?: Array<Space> }) => {
        if (!argvv.space && !argvv.token && !Array.isArray(argvv.spaces)) {
            throw new Error('No spaces/tokens defined either on command line or in config file');
        }

        return true;
    });

// we have all the args.

const spec: BackupSpec = {
    dir: argv.dir,
    spaces: (argv.space && argv.token)
        ? [{ id: argv.space, token: argv.token }]
        : argv.spaces,
};

const spinner = ora();
const bar = bardot.widthFill(5);

const cfb = new ContentfulBackup();

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

cfb.backup(spec);

