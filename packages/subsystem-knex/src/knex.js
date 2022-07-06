import knex from "knex";
import pg from "pg";

export default function createKnex(config) {
  const knexInstance = knex(config);

  pg.types.setTypeParser(pg.types.builtins.DATE, (val) =>
    val === null ? null : new Date(val)
  );
  pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val) =>
    val === null ? null : Number(val)
  );
  pg.types.setTypeParser(pg.types.builtins.INT8, (val) =>
    val === null ? null : BigInt(val)
  );

  return knexInstance;
}
