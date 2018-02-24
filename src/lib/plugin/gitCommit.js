// @flow

import { execSync } from 'child_process';

import type { BackupSpec } from '../../';
import { ContentfulBackup } from '../../';

const execDir = cwd => cmd => execSync(cmd, { cwd }).toString('utf-8').trim();

type GitPluginConfig = {
    push?: boolean | string,
};

const plugin = (cfb: ContentfulBackup, backup: BackupSpec, opts: GitPluginConfig) => {
    const exec = execDir(backup.dir);
    let errors = [];

    cfb.on('beforeRun', () => {
        errors = [];
    });

    cfb.on('afterSpace', (err: ?Error) => {
        if (err) {
            errors.push(err);
        }
    });

    // we delay the git actions to allow any filesystem changes (eg from logging) to flush
    // (using setImmediate or process.nextTick isn't enough)
    cfb.on('afterRun', () => {
        setTimeout(() => {
            exec('git add -A');

            const hasChanges = exec('git status --short').length > 0;

            if (hasChanges) {
                const error = errors.map(err => err.stack).join('\n\n');

                const msg = errors.length
                    ? `Errors in backup (${errors.length})\n\n${error}`
                    : 'Good backup';

                exec(`git commit -m '${msg}'`);

                if (opts.push) {
                    exec(`git push ${opts.push === true ? '' : opts.push}`);
                }
            }
        }, 500);
    });

    return cfb;
};

export default plugin;
