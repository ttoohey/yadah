# phasis

## Build

```sh
npm install
npm run build
```

For automatic re-builds:

```sh
npm start
```

## Run unit tests

```sh
npm test
```

Or, for individual packages

```sh
npm run -- workspace:core test
npm run -- workspace:core test --watch
```

## Git hook workaround

If using a Git client (eg. `git-gui`) that does not yet support the `core.hookspath`
configuration setting, a workaround is to softlink `.husky` files.

```sh
(cd .git/hooks; find ../../.husky -mindepth 1 -maxdepth 1 -print0 | xargs -0 -i ln -sfb {})
```

Reference: https://github.com/prati0100/git-gui/issues/62
