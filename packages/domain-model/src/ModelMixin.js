import { dedupe, pipe } from "@yadah/mixin";
import IteratorMixin from "@yadah/objection-iterator";
import { ScopeMixin } from "@yadah/objection-scope";
import { ContextMixin } from "@yadah/subsystem-context";
import { KnexMixin, TransactionMixin } from "@yadah/subsystem-knex";
import { stringify } from "csv-stringify";
import { isEqual } from "lodash-es";
import assert from "node:assert";
import { once } from "node:events";
import { Readable } from "node:stream";
import NotUniqueMixin from "./NotUniqueMixin.js";

async function* makeIterable(data) {
  if (data instanceof Function) {
    data = data();
  }
  if (data instanceof Readable) {
    return data.iterator();
  }
  for await (const item of data) {
    yield item;
  }
}

function ModelMixin(superclass, Model) {
  if (!ScopeMixin.extends(Model)) {
    assert.fail(
      `"class ${Model.name}" must inherit Scope mixin from "@yadah/objection-scope"`
    );
  }
  if (!IteratorMixin.extends(Model)) {
    assert.fail(
      `"class ${Model.name}" must inherit Iterator mixin from "@yadah/objection-iterator"`
    );
  }
  if (!NotUniqueMixin.extends(Model)) {
    assert.fail(
      `"class ${Model.name}" must inherit NotUniqueMixin mixin from "@yadah/domain-model"`
    );
  }

  const mixins = pipe(superclass, KnexMixin, ContextMixin, TransactionMixin);
  return class DomainModel extends mixins {
    constructor() {
      super(...arguments);
      Model.knex(this.knex);
    }
    async find(id, options = {}) {
      const { allowNotFound = false } = options;
      if (id instanceof Model) {
        return id;
      }
      const trx = this.transactionOrKnex;
      const query = Model.query(trx);
      if (typeof id === "object") {
        query.where(id).throwIfNotUnique().first();
      } else {
        query.findById(id);
      }
      if (!allowNotFound) {
        query.throwIfNotFound();
      }
      return await query;
    }

    list(criteria = {}) {
      const trx = this.transactionOrKnex;
      return Model.query(trx).scope(criteria);
    }

    one(criteria = {}) {
      const trx = this.transactionOrKnex;
      return Model.query(trx).scope(criteria).first();
    }

    many(list, callback) {
      const trx = this.transactionOrKnex;
      const [first, ...rest] = list;
      const alias = `:${Model.tableName}`;
      const query = Model.query(trx);
      const firstQuery = Model.query();
      query.from(alias).with(alias, callback(firstQuery, first));
      query.context(firstQuery.context());
      for (const item of rest) {
        query.union(callback(Model.query(), item), true);
      }
      return query;
    }

    async count(criteria = {}) {
      const trx = this.transactionOrKnex;
      const [{ count }] = await Model.query(trx).scope(criteria).count();
      return count;
    }

    async sum(field, criteria = {}) {
      const trx = this.transactionOrKnex;
      const [{ sum }] = await Model.query(trx).scope(criteria).sum(field);
      return sum;
    }

    async avg(field, criteria = {}) {
      const trx = this.transactionOrKnex;
      const [{ avg }] = await Model.query(trx).scope(criteria).avg(field);
      return avg;
    }

    async min(field, criteria = {}) {
      const trx = this.transactionOrKnex;
      const [{ min }] = await Model.query(trx).scope(criteria).min(field);
      return min;
    }

    async max(field, criteria = {}) {
      const trx = this.transactionOrKnex;
      const [{ max }] = await Model.query(trx).scope(criteria).max(field);
      return max;
    }

    async create(json, onCreate) {
      return this.transaction(async (trx) => {
        const queryContext = this.context.get("queryContext");
        const model = await (async () => {
          const result = await Model.query(trx)
            .context(queryContext)
            .insert(json)
            .returning("id");
          const model = await this.find(result.$id());
          if (onCreate instanceof Function) {
            return (await onCreate(model, trx)) || model;
          }
          return model;
        })();
        this.emit("created", model);
        return model;
      });
    }

    async copyFrom(data) {
      data = makeIterable(data);
      const firstRecord = await data[Symbol.asyncIterator]().next();
      if (firstRecord.done) {
        return 0;
      }
      const columns = Object.keys(firstRecord.value);
      const stream = stringify({
        columns,
        quoted_string: true,
        cast: {
          date: (value) => value.toISOString(),
        },
      });
      (async () => {
        try {
          if (!stream.write(firstRecord.value)) {
            await once(stream, "drain");
          }
          for await (const record of data) {
            if (!stream.write(record)) {
              await once(stream, "drain");
            }
          }
          stream.end();
        } catch (e) {
          stream.destroy(e);
        }
      })();
      const trx = this.transactionOrKnex;
      return Model.copyFromCsv(stream, columns, trx);
    }

    async update(id, json, onUpdate) {
      return this.transaction(async (trx) => {
        const queryContext = this.context.get("queryContext");
        const [model, oldModel] = await (async () => {
          const oldModel = await this.find(id);
          let model = oldModel;
          const oldJson = oldModel.$toJson();
          if (!isEqual(oldJson, { ...oldJson, ...json })) {
            await model.$clone().$query(trx).context(queryContext).patch(json);
            model = await this.find(model.$id());
          }
          if (!(onUpdate instanceof Function)) {
            return [model, oldModel];
          }
          const result = await onUpdate([model, oldModel], trx);
          if (Boolean(result) === result && result && model === oldModel) {
            model = model.$clone();
          }
          if (Array.isArray(result) && result.length === 2) {
            return result;
          }
          return [model, oldModel];
        })();
        if (model !== oldModel) {
          this.emit("updated", model, oldModel);
        }
        return model;
      });
    }

    async delete(id, onDelete) {
      return this.transaction(async (trx) => {
        const queryContext = this.context.get("queryContext");
        const model = await (async () => {
          const model = await this.find(id);
          await Model.query(trx)
            .context(queryContext)
            .findById(model.$id())
            .delete();
          if (onDelete instanceof Function) {
            const result = await onDelete(model, trx);
            if (result) {
              return result;
            }
          }
          return model;
        })();
        this.emit("deleted", undefined, model);
        return model;
      });
    }

    async upsert(key, json) {
      const model = await this.find(key, { allowNotFound: true });
      return model
        ? await this.update(model, json)
        : await this.create({ ...key, ...json });
    }
  };
}

export default dedupe(ModelMixin);
