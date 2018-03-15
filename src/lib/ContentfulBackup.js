// @flow

import Emittery from 'emittery';

import type { BackupConfig, SpaceConfig } from '../';

import { backupSpace } from './backupSpace';

type DirSpaces = {|
    dir: string,
    spaces: Array<SpaceConfig>,
|};

export type BeforeSleepEvent = {|
    ...DirSpaces,
    didChange: boolean,
    sleep: number,
|};

export type BeforeRunEvent = DirSpaces;
export type AfterRunEvent = DirSpaces;

const sleep = minutes => new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));

class ContentfulBackup extends Emittery {
    async backupSpaces ({ dir, spaces }: { dir: string, spaces: Array<SpaceConfig> }): Promise<boolean> {
        if (spaces.length === 0) {
            return false;
        }

        const [{ id: space, token }, ...spacesRest] = spaces;

        const didChange = await backupSpace({
            emit: this.emitSerial.bind(this), dir, space, token,
        });

        // NB avoid short cutting the ||
        return (await this.backupSpaces({ dir, spaces: spacesRest })) || didChange;
    }

    async backupRun ({ dir, spaces }: { dir: string, spaces: Array<SpaceConfig> }): Promise<boolean> {
        if (spaces.length === 0) {
            return false;
        }

        await this.emitSerial('beforeRun', ({ dir, spaces }: BeforeRunEvent));
        const didChange = await this.backupSpaces({ dir, spaces });
        await this.emitSerial('afterRun', ({ dir, spaces }: AfterRunEvent));

        return didChange;
    }

    async backup ({ dir, spaces, every }: BackupConfig) {
        if (every.length === 0) {
            await this.backupRun({ dir, spaces });
            return;
        }

        let ix = -1;

        while (true) { // eslint-disable-line no-constant-condition
            // eslint-disable-next-line no-await-in-loop
            const didChange = await this.backupRun({ dir, spaces });

            ix = didChange ? 0 : Math.min(ix + 1, every.length - 1);

            // eslint-disable-next-line no-await-in-loop
            await this.emitSerial('beforeSleep', ({ dir, spaces, didChange, sleep: every[ix] }: BeforeSleepEvent));

            // eslint-disable-next-line no-await-in-loop
            await sleep(every[ix]);
        }
    }
}

export {
    ContentfulBackup,
};
