# depcheck

A wrapper around [depcheck](https://www.npmjs.com/package/depcheck) to handle
custom babel configuration (using [depcheck-parser-babel](https://www.npmjs.com/package/depcheck-parser-babel))

## Usage

In `package.json`

```json
{
  "scripts": {
    "depcheck": "node --no-warnings --input-type=module --eval 'import \"@yadah/depcheck\"'"
  }
}
```

```sh
npm run depcheck
```

JSON output can be produced by setting the environment variable `DEPCHECK_JSON`

```sh
DEPCHECK_JSON=1 npm run depcheck
```
