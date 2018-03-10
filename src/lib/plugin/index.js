// @flow
// the built-in plugins

import saveDisk from './saveDisk';
import logConsole from './logConsole';
import logFile from './logFile';
import gitCommit from './gitCommit';

const plugin = {
    'save-disk': saveDisk,
    'log-console': logConsole,
    'log-file': logFile,
    'git-commit': gitCommit,
};

export {
    plugin,
};
