// @flow
// the built-in plugins

import logConsole from './logConsole';
import logFile from './logFile';
import gitCommit from './gitCommit';

const plugin = {
    'log-console': logConsole,
    'log-file': logFile,
    'git-commit': gitCommit,
};

export {
    plugin,
};
