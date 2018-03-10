// @flow

import Emittery from 'emittery';

import type { BackupSpec, Space } from '../';

import { backupSpace } from './backupSpace';

const sleep = minutes => new Promise(resolve => setTimeout(resolve, minutes * 60 * 1000));

class ContentfulBackup extends Emittery {
    async backupSpaces ({ dir, spaces }: { dir: string, spaces: Array<Space> }) {
        if (spaces.length === 0) {
            return true;
        }

        const [{ id: space, token }, ...spacesRest] = spaces;

        await backupSpace({ emit: this.emitSerial.bind(this), dir, space, token });

        return this.backupSpaces({ dir, spaces: spacesRest });
    }

    async backupRun ({ dir, spaces }: { dir: string, spaces: Array<Space> }) {
        if (spaces.length === 0) {
            return;
        }

        await this.emitSerial('beforeRun', { dir, spaces });
        await this.backupSpaces({ dir, spaces });
        await this.emitSerial('afterRun', { dir, spaces });
    }

    async backup ({ dir, spaces, every }: BackupSpec) {
        if (every) {
            while (true) { // eslint-disable-line no-constant-condition
                await this.backupRun({ dir, spaces }); // eslint-disable-line no-await-in-loop
                await sleep(every); // eslint-disable-line no-await-in-loop
            }
        }

        await this.backupRun({ dir, spaces });
    }
}

export {
    ContentfulBackup,
};
