#!/usr/bin/env node
// @flow

import fs from 'fs';
import path from 'path';

import 'babel-polyfill';
import yargs from 'yargs';
import outdent from 'outdent';
import ora from 'ora';
import { bardot } from 'bardot';

import { ContentfulBackup } from '../';

const relpathConfig = 'contentful-backup.config';

const { argv } = yargs
    .usage(outdent`
        $0 [--dir <target>] [--space <id>] [--token <token>]

        Backs up the Contentful space into the target directory, using the
        Content Delivery API token.

        If you omit --dir, assumes the target directory is the current directory.

        If you omit --space and/or --token, reads them from ${relpathConfig}.{js,json}
        in the target directory.
    `)
    .example(
        '$0 --space abcdabcdabcd',
        'Backs up space abcdabcdabcd to the current directory, using a CDA token from a configuration file in the current directory.',
    )
    .options({
        'dir': {
            desc: outdent`
                Directory into which the backup is stored. Must already exist, defaults to the current directory
            `,
            default: '.',
            string: true,
            normalize: true,
            coerce: (arg: string) => path.resolve(arg),
        },

        'space': {
            desc: outdent`
                Contentful space ID
            `,
            string: true,
        },
        'token': {
            desc: outdent`
                Contentful Content Delivery API token
            `,
            string: true,
        },
    })
    .check((argvv: { dir: string, space?: string, token?: string }) => {
        try {
            // eslint-disable-next-line no-bitwise
            fs.accessSync(argvv.dir, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK);

        } catch (err) {
            throw new Error(`Unable to access ${argvv.dir}`);
        }

        const stats = fs.statSync(argvv.dir);

        if (!stats.isDirectory()) {
            throw new Error(`Not a directory: ${argvv.dir}`);
        }

        let config = { space: argvv.space, token: argvv.token };

        if (!argvv.space || !argvv.token) {
            const pathConfig = path.resolve(argvv.dir, relpathConfig);

            try {
                config = {
                    ...config,
                    ...require(pathConfig),
                };

            } catch (err) {
                throw new Error(`Expected config file at ${pathConfig}.{js,json}`);
            }
        }

        if (!config.space) {
            throw new Error('No space ID defined');
        }

        if (!config.token) {
            throw new Error('No CDA token defined');
        }

        // I am a bad person.
        argvv.space = config.space;
        argvv.token = config.token;

        return true;
    });

// we have all the args.

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

cfb.backup({ dir: argv.dir, space: argv.space, token: argv.token });

