// @flow

import yup from 'yup';

const space = yup.object().shape({
    id: yup.string().required(),
    token: yup.string().required(),
});

const configFile = yup.object().shape({
    spaces: yup.array().of(space),
    every: yup.number(),
    log: yup.string(),
});

const configCLI = yup.object().shape({
    dir: yup.string(),
    space: yup.array().of(space),
    spaces: yup.array().of(space),
    every: yup.number(),
    log: yup.mixed().required().test(
        'log',
        'No valid log function is defined',
        log => typeof log === 'function',
    ),
}).test(
    'spaces',
    'No spaces defined either on command line or in config file',
    cfg => (cfg.space && cfg.space.length) || (cfg.spaces && cfg.spaces.length),
);

export {
    space,
    configFile,
    configCLI,
};
