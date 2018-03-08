#!/usr/bin/env node
// @flow

import path from 'path';

import 'babel-polyfill';
import yargs from 'yargs';
import outdent from 'outdent';

import type { Space, CLIConfig, FileConfig, BackupSpec, PluginName, PluginFn, PluginSpec, PluginSpecStrict } from '../';

import { ContentfulBackup } from '../';

import { plugin } from '../lib/plugin';
import * as schema from '../lib/schema';

const relpathConfig = 'contentful-backup.config';

const requireOrNull = (name: string): ?PluginFn => {
    try {
        return require(name);

    } catch (err) {
        return null;
    }
};

const requirePlugin = (name: PluginName, dir: string): ?PluginFn =>
    plugin[name] ||
    requireOrNull(path.join(dir, name)) ||
    requireOrNull(path.join(process.cwd(), name)) ||
    requireOrNull(name);


const { argv } = yargs
    .usage(outdent`
        $0 [--dir <target>]
           [--space <id> <token>]...
           [--every <minutes>]
           [--plugins [log-console | log-file | git-commit | <module>]... ]

        Backs up one or more Contentful spaces into the target directory.

        If you omit --dir, assumes the target directory is the current directory.

        Use --space to specify the space id and CDA token pair of each space you want to back up.

        Use --every to automatically back up the spaces periodically (the app doesn't exit).

        Use --plugins with a list of plugin names to add these plugins, in order. Use a path (absolute, or relative to target or current directory) or module name to add a node module as a plugin.

        Omitted arguments are read from ${relpathConfig}.{js,json} in the target directory.

        Built-in plugins:

        - log-console: log backup events to the console.
        - log-file: log backup events to the file contentful-backup.log in the target directory, rotating log files at 1 MB.
        - git-commit: after a successful or failed backup, check changes into git.

        The git-commit plugin assumes the target directory is a valid git repository in which the user running the app has commit and push permissions on the current branch, and that git is in the PATH. The plugin makes no effort to recover from errors.
    `)
    .example(
        '$0 --space ididididid1 tktktktktk1 --space ididididid2 tktktktktk2 --every 2',
        'Backs up spaces ididididid1 and ididididid2 to the current directory every two minutes.',
    )
    .example(
        '$0 --dir ../my-backups --plugins log-file git-commit git-commit',
        'Backs up spaces according to the configuration file in ../my-backups, and logs to contentful-backup.log in that directory, then checks in all changes.',
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
        'plugins': {
            alias: 'plugin',
            desc: outdent`
                Ordered list of plugins to use with backups. Built-ins: log-console, log-file, git-commit. Use a custom node module by specifying the path (relative to current dir)
            `,
            array: true,
            default: [],
            coerce: (pluginSpecs: Array<PluginSpec>): Array<PluginSpecStrict> =>
                pluginSpecs.map(pluginSpec => (
                    typeof pluginSpec === 'string'
                        ? [pluginSpec, {}]
                        : pluginSpec
                )),
        },
    })
    .check((argvv) => {
        schema.configCLI.validateSync(argvv);

        const missing = argvv.plugins
            .map(([name]) => (requirePlugin(name, argvv.dir) ? false : name))
            .filter(Boolean);

        if (missing.length) {
            throw new Error(`Unable to find plugin(s): ${missing.join(', ')}`);
        }

        return true;
    });

// we have all the args.
(argv: CLIConfig); // eslint-disable-line no-unused-expressions

const backup: BackupSpec = {
    dir: argv.dir,
    spaces: argv.space || argv.spaces,
    every: argv.every || null,
};

const cfb = argv.plugins
    .map(([name, cfg]) => ({ fn: requirePlugin(name, backup.dir), cfg }))
    .reduce(
        (cfbAcc, { fn, cfg }) => fn(cfbAcc, backup, cfg),
        new ContentfulBackup(),
    );

cfb.backup(backup);
