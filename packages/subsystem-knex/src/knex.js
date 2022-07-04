import knex from "knex";
import pg from "pg";

export default function createKnex(options) {
  const { config, Model } = options;
  const knexInstance = knex(config);

  pg.types.setTypeParser(pg.types.builtins.DATE, (val) =>
    val === null ? null : new Date(val)
  );
  pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val) =>
    val === null ? null : parseFloat(val)
  );

  if (Model) {
    Model.knex(knexInstance);
  }

  return knexInstance;
}
