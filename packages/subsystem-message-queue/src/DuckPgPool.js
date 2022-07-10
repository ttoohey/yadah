import pg from "pg";

export default class DuckPgPool extends pg.Pool {
  constructor(knexPool) {
    super({ max: 0 });
    this.knexPool = knexPool;
    this.knexPool.on("acquireSuccess", (eventId, resource) =>
      resource.promise.then((client) => this.emit("acquire", client))
    );
    this.knexPool.on("createSuccess", (eventId, resource) =>
      resource.promise.then((client) => this.emit("connect", client))
    );
  }

  connect(callback) {
    const pool = this.knexPool;
    const acquire = pool.acquire();
    const release = function (err) {
      pool.release(this);
      if (err) {
        this.emit("error", err, this);
      }
    };
    return acquire.promise
      .then((client) => {
        client.release = release.bind(client);
        return client;
      })
      .then((client) => {
        if (callback instanceof Function) {
          callback(null, client, release.bind(client));
        }
        return client;
      })
      .catch((e) => {
        if (callback instanceof Function) {
          callback(e);
        } else {
          throw e;
        }
      });
  }

  async query() {
    const client = await this.connect();
    try {
      return await client.query(...arguments);
    } finally {
      client.release();
    }
  }

  end() {
    throw new Error("Attempted to end a DuckPool");
  }

  get totalCount() {
    return this.knexPool.numUsed();
  }

  get idleCount() {
    return this.knexPool.numFree();
  }

  get waitingCount() {
    return this.knexPool.numPendingAcquires();
  }
}
