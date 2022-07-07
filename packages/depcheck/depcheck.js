import path from "node:path";
import chalk from "chalk";
import depcheck from "depcheck";
import parserBabel from "depcheck-parser-babel";

function importJson(filename) {
  return import(path.resolve(cwd, filename), { assert: { type: "json" } }).then(
    (pkg) => pkg.default
  );
}

const cwd = process.cwd();
const { name: packageName } = await importJson("package.json");
const rc = await importJson(".depcheckrc.json");

const options = {
  ignores: [],
  ...rc,
  parsers: {
    ...rc.parsers,
    "**/*.js": parserBabel,
  },
};
const data = await depcheck(cwd, options);
const ignored = (d) => !options.ignores.includes(d);
const dependencies = data.dependencies.filter(ignored);
const devDependencies = data.devDependencies.filter(ignored);
const missing = Object.entries(data.missing);

const error =
  dependencies.length > 0 || devDependencies.length > 0 || missing.length > 0;
process.exitCode = error ? 1 : 0;

if (process.env.DEPCHECK_JSON) {
  console.log(JSON.stringify(data));
  process.exit();
}

if (!error) {
  process.exit();
}
if (process.env.CI) {
  console.error(
    `[depcheck error]`,
    `${packageName} has missing or unused dependencies`,
    cwd
  );
  process.exit();
}
console.error(
  chalk.redBright(`[depcheck error]`),
  `${packageName} has missing or unused dependencies`,
  chalk.dim(cwd)
);
if (dependencies.length > 0) {
  console.log(chalk.bold("Unused dependencies:"));
  console.log(dependencies.map((name) => `  * ${name}`).join("\n"));
}
if (devDependencies.length > 0) {
  console.log(chalk.bold("Unused devDependencies:"));
  console.log(devDependencies.map((name) => `  * ${name}`).join("\n"));
}
if (missing.length > 0) {
  console.log(chalk.bold("Missing dependencies:"));
  console.log(
    missing
      .map(
        ([name, paths]) =>
          `  * ${name} ${chalk.dim(paths[0].replace(cwd, "."))}`
      )
      .join("\n")
  );
}
