// @flow

import yup from 'yup';

const space = yup.object().shape({
    id: yup.string().required(),
    token: yup.string().required(),
});

const plugin = yup.mixed().test(
    'plugin',
    'Plugin definitions must be a string or [string, object]',
    val => yup.string().isValidSync(val) || yup.array().min(2).max(2)
        .test(
            'tuple',
            'Plugin tuples must be [string, object]',
            tuple => yup.string().isValidSync(tuple[0]) && yup.object().isValidSync(tuple[1]),
        )
        .isValidSync(val),
);

const configFile = yup.object().shape({
    spaces: yup.array().of(space),
    every: yup.number(),
    plugins: yup.array().of(plugin),
});

const configCLI = yup.object().shape({
    dir: yup.string(),
    space: yup.array().of(space),
    spaces: yup.array().of(space),
    every: yup.number(),
    plugins: yup.array().of(yup.array().min(2).max(2).required()
        .test(
            'plugins',
            'No valid plugin function is defined',
            plg => typeof plg[0] === 'function' && yup.object().isValidSync(plg[1]),
        )),
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
