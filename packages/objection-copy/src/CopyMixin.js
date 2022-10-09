import { dedupe } from "@yadah/mixin";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import pgCopyStreamsPkg from "pg-copy-streams";

const copyFrom = pgCopyStreamsPkg.from;
const pipe = promisify(pipeline);
const repeat = (v, n, s) => Array(n).fill(v).join(s);

function CopyMixin(superclass) {
  return class Copy extends superclass {
    static async copyFromCsv(fromStream, columns, trx) {
      const knex = trx || this.knex();
      const connection = await knex.client.acquireConnection();
      const positionals = repeat("??", columns.length, ", ");
      const bindings = [this.tableName, ...columns];
      const queryText = knex
        .raw(`COPY ?? (${positionals}) FROM STDIN (FORMAT csv)`, bindings)
        .toString();
      const copyStreamQuery = copyFrom(queryText);
      const stdin = connection.query(copyStreamQuery);
      return pipe(fromStream, stdin)
        .then(() => copyStreamQuery.rowCount)
        .finally(() => knex.client.releaseConnection(connection));
    }
  };
}

export default dedupe(CopyMixin);
