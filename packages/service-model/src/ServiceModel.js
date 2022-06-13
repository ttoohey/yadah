import { once } from "node:events";
import { stringify } from "csv-stringify";

async function* makeIterable(data) {
  if (data instanceof Function) {
    data = data();
  }
  for await (const item of data) {
    yield item;
  }
}

export default (Model) => (Service) =>
  class extends Service {
    constructor(context = {}) {
      super(context);
      if (context.knex) {
        Model.knex(context.knex);
      }
    }
    async find(id, options = {}) {
      const { allowNotFound, transaction } = {
        allowNotFound: false,
        ...options,
      };
      if (id instanceof Model) {
        return id;
      }
      const query = Model.query(transaction);
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

    list(scope = {}, options = {}) {
      return Model.query(options.transaction).scope(scope);
    }

    one(scope = {}, options = {}) {
      return Model.query(options.transaction).scope(scope).first();
    }

    many(list, callback, options = {}) {
      const [first, ...rest] = list;
      const alias = `:${Model.tableName}`;
      const query = Model.query(options.transaction);
      const firstQuery = Model.query();
      query.from(alias).with(alias, callback(firstQuery, first));
      query.context(firstQuery.context());
      for (const item of rest) {
        query.union(callback(Model.query(), item), true);
      }
      return query;
    }

    async count(scope = {}, options = {}) {
      return await Model.query(options.transaction)
        .scope(scope)
        .count()
        .then(([{ count }]) => parseInt(count, 10));
    }

    async sum(scope = {}, field, options = {}) {
      const [{ sum }] = await Model.query(options.transaction)
        .scope(scope)
        .sum(field);
      return sum === null ? null : Number(sum);
    }

    async avg(scope = {}, field, options = {}) {
      const [{ avg }] = await Model.query(options.transaction)
        .scope(scope)
        .avg(field);
      return avg === null ? null : Number(avg);
    }

    async min(fieldName, scope = {}) {
      const [{ min }] = await Model.query().scope(scope).min(fieldName);
      return min;
    }

    async max(fieldName, scope = {}) {
      const [{ max }] = await Model.query().scope(scope).max(fieldName);
      return max;
    }

    async create(json, options) {
      return this.transaction(options, async (options) => {
        const { onCreate, transaction } = options;
        options.onCreate = null;
        const node = await (async () => {
          const result = await Model.query(transaction)
            .context(options.context)
            .insert(json)
            .returning("id");
          const node = await this.find(result.id, options);
          if (onCreate instanceof Function) {
            await onCreate(node, options);
          }
          return node;
        })();
        options.mq.emit("created", node);
        options.onCreate = onCreate;
        return node;
      });
    }

    async copyFrom(data, options) {
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
      return Model.copyFromCsv(stream, columns, options?.transaction);
    }

    async update(id, json, options = {}) {
      return this.transaction(options, async (options) => {
        const { onUpdate, transaction } = options;
        options.onUpdate = null;
        const [node, oldNode] = await (async () => {
          const oldNode = await this.find(id, options);
          let node = oldNode;
          if (!(await node.$isMatch(json))) {
            await node
              .$clone()
              .$query(transaction)
              .context(options.context)
              .patch(json);
            node = await this.find(node.id, options);
          }
          if (!(onUpdate instanceof Function)) {
            return [node, oldNode];
          }
          const result = await onUpdate([node, oldNode], options);
          if (Boolean(result) === result && result && node === oldNode) {
            node = node.$clone();
          }
          if (Array.isArray(result) && result.length === 2) {
            return result;
          }
          return [node, oldNode];
        })();
        options.onUpdate = onUpdate;
        if (node !== oldNode) {
          options.mq.emit("updated", node, oldNode);
        }
        return node;
      });
    }

    async delete(ids, options = {}) {
      if (!Array.isArray(ids)) {
        ids = [ids];
      }
      if (ids.length === 0) {
        return ids;
      }
      return this.transaction(options, async (options) => {
        const { onDelete, transaction } = options;
        options.onDelete = null;
        const nodes = await (async () => {
          const nodes = await Model.query(transaction).whereIn(
            Model.idColumn,
            ids
          );
          await Model.query(transaction)
            .whereIn(Model.idColumn, ids)
            .context(options.context)
            .delete();
          if (onDelete instanceof Function) {
            const result = await onDelete(nodes, options);
            if (Array.isArray(result)) {
              return result;
            }
          }
          return nodes;
        })();
        options.onDelete = onDelete;
        nodes.forEach((node) => options.mq.emit("deleted", undefined, node));
        return nodes.map((node) => node.$id());
      });
    }

    async upsert(key, json, options = {}) {
      const node = await this.find(key, { ...options, allowNotFound: true });
      return node
        ? await this.update(node.id, json, options)
        : await this.create({ ...key, ...json }, options);
    }
  };
