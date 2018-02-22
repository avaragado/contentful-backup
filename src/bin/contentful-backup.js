#!/usr/bin/env node
// @flow

import path from 'path';

import 'babel-polyfill';
import yargs from 'yargs';
import outdent from 'outdent';

import type { Space, CLIConfig, FileConfig, BackupSpec, LogFn } from '../';

import { ContentfulBackup } from '../';

import { log } from '../lib/log';
import * as schema from '../lib/schema';

const relpathConfig = 'contentful-backup.config';

const { argv } = yargs
    .usage(outdent`
        $0 [--dir <target>]
           [--space <id> <token>]...
           [--every <minutes>]
           [--log console | file | <module>]

        Backs up one or more Contentful spaces into the target directory.

        If you omit --dir, assumes the target directory is the current directory.

        Use --space to specify the space id and CDA token pair of each space you want to back up.

        Use --every to automatically back up the spaces periodically (the app doesn't exit).

        Use --log console to log backup events to the console, --log file to write logs to contentful-backup.log in the target directory (rotating log files at 1 MB), or --log <module> to use a custom node module (relative to cwd). If you omit --log, there's no log output.

        Omitted arguments are read from ${relpathConfig}.{js,json} in the target directory.
    `)
    .example(
        '$0 --space ididididid1 tktktktktk1 --space ididididid2 tktktktktk2 --every 2',
        'Backs up spaces ididididid1 and ididididid2 to the current directory every two minutes.',
    )
    .example(
        '$0 --dir ../my-backups --log file',
        'Backs up spaces according to the configuration file in ../my-backups, and log to contentful-backup.log in that directory',
    )
    .options({
        'dir': {
            desc: outdent`
                Directory in which to store the backup. Must already exist, defaults to the current directory
            `,
            default: '.',
            config: true,
            configParser: (dir: string) => {
                let cfg: FileConfig;

                try {
                    cfg = require(path.resolve(dir, relpathConfig));

                } catch (err) {
                    return { dir };
                }

                schema.configFile.validateSync(cfg);

                // merge file content into the options: they'll be evaluated
                // as if part of the command line. (no idea if this is wise
                // or not.)
                return { dir, ...cfg };
            },
        },
        'space': {
            desc: outdent`
                Contentful space id and Content Delivery API token
            `,
            array: true,
            nargs: 2,
            coerce: (parts: Array<string>): Array<Space> => {
                if (parts.length % 2 !== 0) {
                    throw new Error('You must supply a token for every space id');
                }

                return parts.reduce(
                    (spaces, part, ix) => (ix % 2 === 0
                        ? spaces.concat({ id: part, token: parts[ix + 1] })
                        : spaces),
                    [],
                );
            },
        },
        'every': {
            desc: outdent`
                How frequently to back up, in minutes (app never exits)
            `,
            number: true,
        },
        'log': {
            desc: outdent`
                Log to console (--log console), to contentful-backup.log in target directory (--log file), or using a custom node module (--log path/to/module/from/current/dir)
            `,
            string: true,
            default: 'none',
            coerce: (logname: string): LogFn => {
                if (log[logname]) {
                    return log[logname];
                }

                return require(logname);
            },
        },
    })
    .check((argvv) => {
        schema.configCLI.validateSync(argvv);

        return true;
    });

// we have all the args.
(argv: CLIConfig); // eslint-disable-line no-unused-expressions

const spec: BackupSpec = {
    dir: argv.dir,
    spaces: argv.space || argv.spaces,
    every: argv.every || null,
};

console.log('argv', JSON.stringify(argv, null, 4));
console.log('spec', JSON.stringify(spec, null, 4));

const cfb = argv.log(new ContentfulBackup(), spec);

cfb.backup(spec);
