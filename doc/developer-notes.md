# Developer notes

## Building

The package uses [`nps`](https://www.npmjs.com/package/nps) as a layer above npm scripts. See [`package-scripts.js`](../package-scripts.js) for all the build targets. Common targets:

```bash
$ nps b    # or nps build - full build with linting
$ nps b.q  # or nps build.quick - build without linting
$ nps l    # or nps lint - lint js and check flow types
$ nps l.j  # or nps lint.js - lint js only
$ nps f    # or nps flow - check flow types
$ nps f.t  # or nps flow.typed - update all third-party types via flow-typed
```

## Branches and merging

When merging to master **Squash and Merge**.

In the commit message, follow [conventional-changelog-standard conventions](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md)


## Releasing

When ready to release to npm:

1. `git checkout master`
1. `git pull origin master`
1. `nps release`
1. Engage pre-publication paranoia
1. `git push --follow-tags origin master`
1. `npm publish`
