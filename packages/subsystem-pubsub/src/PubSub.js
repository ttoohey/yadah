import assert from "node:assert";
import v8 from "node:v8";
import { Hash } from "node:crypto";
import { once } from "node:events";
import { Readable } from "node:stream";
import { Mutex } from "async-mutex";

const toClassid = (val) => {
  if (typeof val === "number") {
    return val;
  }
  const md5 = Hash("md5");
  md5.write(val);
  return md5.digest().slice(-4).readInt32BE();
};

export default class PubSub {
  #mutex;
  constructor(knex, { lockId, schema = "pubsub", channelPrefix = "pubsub" }) {
    assert.equal(
      knex.client.config.client,
      "postgresql",
      "pubsub: knex client must use postgresql adapter"
    );
    this.knex = knex;
    this.classid = toClassid(lockId || this.constructor.name);
    this.schema = schema;
    this.channelPrefix = channelPrefix;
    this.#mutex = new Mutex();
  }

  async listen() {
    return await this.#mutex.runExclusive(async () => {
      const knex = this.knex;
      const classid = this.classid;
      const schema = this.schema;
      const prefix = this.channelPrefix;
      if (this.connection) {
        return [this.connection, this.id];
      }
      const connection = await knex.client.acquireRawConnection();
      const result = await connection.query(
        `INSERT INTO "${schema}".listeners (channels) VALUES (ARRAY[]::text[]) RETURNING id`
      );
      const { id } = result.rows[0];
      await connection.query(`SELECT pg_advisory_lock($1, $2)`, [classid, id]);
      await connection.query(`LISTEN "${prefix}${id}"`);
      this.connection = connection;
      this.id = id;
      return [connection, id];
    });
  }

  async unlisten() {
    return await this.#mutex.runExclusive(async () => {
      if (!this.connection) {
        return;
      }
      const knex = this.knex;
      const classid = this.classid;
      const connection = this.connection;
      const schema = this.schema;
      delete this.connection;
      delete this.id;
      await connection.end();
      await knex.client.releaseConnection(connection);
      await knex.raw(
        `DELETE FROM "${schema}".listeners WHERE pg_try_advisory_xact_lock(?,id)`,
        [classid]
      );
    });
  }

  #subscriptions = new Map();
  async #addSubscription(stream, channel) {
    const [connection, id] = await this.listen();
    const map = this.#subscriptions;
    const schema = this.schema;
    return await this.#mutex.runExclusive(async () => {
      if (!map.has(channel)) {
        map.set(channel, []);
        await connection.query(
          `UPDATE "${schema}".listeners SET channels=$1 WHERE id=$2`,
          [Array.from(map.keys()), id]
        );
      }
      map.set(channel, map.get(channel).concat(stream));
      stream.emit("pubsub:ready");
    });
  }
  async #removeSubscription(stream, channel) {
    try {
      const [connection, id] = [this.connection, this.id];
      if (!connection) {
        return;
      }
      const map = this.#subscriptions;
      const schema = this.schema;
      if (!map.has(channel)) {
        return;
      }
      const streams = map.get(channel).filter((s) => s !== stream);
      if (streams.length === 0) {
        map.delete(channel);
      } else {
        map.set(channel, streams);
      }
      if (map.size === 0) {
        await this.unlisten();
      } else {
        await this.#mutex.runExclusive(() =>
          connection.query(
            `UPDATE "${schema}".listeners SET channels=$1 WHERE id=$2`,
            [Array.from(map.keys()), id]
          )
        );
      }
    } finally {
      stream.emit("pubsub:end");
    }
  }

  /**
   * @param {string} channel
   * @param {ReadableOptions} options
   * @return {Readable}
   */
  subscribe(channel, options = undefined) {
    const self = this;
    let reading = false;
    const stream = new Readable({
      ...options,
      objectMode: true,
      async construct(cb) {
        const [connection] = await self.listen();
        connection.on("notification", (msg) => {
          const { channel: msgChannel, data } = v8.deserialize(
            Buffer.from(msg.payload, "base64")
          );
          if (msgChannel !== channel) {
            return;
          }
          if (this.readable && reading) {
            reading = this.push(data);
          }
        });
        connection.on("close", () => this.readable && this.push(null));
        connection.on("error", (err) => this.destroy(err));
        await self.#addSubscription(this, channel);
        cb();
      },
      async read() {
        reading = true;
      },
    });
    stream.on("close", () => this.#removeSubscription(stream, channel));
    stream.on("error", () => this.#removeSubscription(stream, channel));
    const iteratorFn = stream.iterator;
    stream.iterator = () => {
      const iterator = iteratorFn.call(stream);
      const addBindings = (thisArg, bindings) => {
        for (const [key, fn] of Object.entries(bindings)) {
          thisArg[key] = fn.bind(thisArg);
        }
        return thisArg;
      };
      const bindings = {
        async return(value) {
          await self.unsubscribe(stream);
          return { done: true, value };
        },
        push(...payload) {
          stream.push(payload);
          return this;
        },
        map(mapper) {
          const iterator = this;
          const mappedIterator = (async function* () {
            for await (const payload of iterator) {
              try {
                const mappedPayload = await mapper(...payload);
                if (!Array.isArray(mappedPayload)) {
                  continue;
                }
                yield mappedPayload;
              } catch (err) {
                stream.destroy(err);
              }
            }
          })();
          return addBindings(mappedIterator, bindings);
        },
      };
      return addBindings(iterator, bindings);
    };
    return stream;
  }

  /**
   *
   * @param {Readable} stream
   * @returns {Promise<void>}
   */
  unsubscribe(stream) {
    stream.push(null);
    return once(stream, "pubsub:end");
  }

  async publish(channel, data, transactionOrKnex) {
    assert(Array.isArray(data), "`data` must be an array");
    const classid = this.classid;
    const schema = this.schema;
    const prefix = this.channelPrefix;
    const knex = transactionOrKnex || this.knex;
    const payload = v8.serialize({ channel, data }).toString("base64");
    await knex.raw(
      `
        SELECT pg_notify(
            :prefix::text || id::text,
            :payload::text
        ) FROM "${schema}".listeners
        WHERE
            NOT pg_try_advisory_xact_lock(:classid, id)
            AND :channel = ANY(channels)
      `,
      { prefix, channel, payload, classid }
    );
  }

  async status() {
    const knex = this.knex;
    const schema = this.schema;
    const classid = this.classid;
    const {
      rows: [{ count: listeners }],
    } = await knex.raw(
      `SELECT count(*) FROM "${schema}".listeners WHERE NOT pg_try_advisory_xact_lock(:classid, id)`,
      { classid }
    );
    return { listeners };
  }

  async migrate() {
    const knex = this.knex;
    const schema = this.schema;
    await knex.raw(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await knex.raw(
      `CREATE TABLE IF NOT EXISTS "${schema}".listeners (id serial, channels text[])`
    );
  }
}
