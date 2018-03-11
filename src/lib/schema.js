// @flow

import yup from 'yup';

const space = yup.object().shape({
    id: yup.string().required(),
    token: yup.string().required(),
});

const pluginLoose = yup.string();

const pluginStrict = yup.array().min(2).max(2)
    .test(
        'tuple',
        'Plugin tuples must be [string, object]',
        ([name, cfg]) => yup.string().isValidSync(name) && yup.object().isValidSync(cfg),
    );

const plugin = yup.mixed().test(
    'plugin',
    'Plugin definitions must be a string or [string, object]',
    val => pluginLoose.isValidSync(val) || pluginStrict.isValidSync(val),
);

const every = yup.mixed().test(
    'every',
    'The "every" setting must be a number or a list of numbers',
    val => yup.number().isValidSync(val) || yup.array().of(yup.number()),
);

const configFile = yup.object().shape({
    spaces: yup.array().of(space),
    every,
    plugins: yup.array().of(plugin),
});

const configCLI = yup.object().shape({
    dir: yup.string(),
    space: yup.array().of(space),
    spaces: yup.array().of(space),
    every: yup.array().of(yup.number()),
    plugins: yup.array().of(pluginStrict),
}).test(
    'spaces',
    'No spaces defined either on command line or in config file (is config file valid?)',
    cfg => (cfg.space && cfg.space.length) || (cfg.spaces && cfg.spaces.length),
);

export {
    space,
    configFile,
    configCLI,
};
