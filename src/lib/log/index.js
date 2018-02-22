// @flow
// the built-in log mechanisms

import none from './none';
import console from './console';
import file from './file';

const log = { none, console, file };

export {
    log,
};
