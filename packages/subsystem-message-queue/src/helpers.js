import v8 from "node:v8";

/**
 * Get the original Javascript object representation from a stringified job payload.
 *
 * @param {string} payload - base64 encoded job payload
 * @returns {unknown}
 */
export function decodeJobPayload(payload) {
  return v8.deserialize(Buffer.from(payload, "base64"));
}

/**
 * Stringifies a job payload from the original Javascript object representation
 *
 * @param {unknown} payload
 * @returns {string} base64 encoded job payload
 */
export function encodeJobPayload(payload) {
  return v8.serialize(payload).toString("base64");
}

/**
 * Replaces the stringified `Job.payload` with the JavaScript object
 * representation
 *
 * @param {unknown} job a message queue job object from database
 * @returns {unknown} the message queue job object with payload decoded
 */
export function decodeJob(job) {
  if (!job?.payload) {
    return job;
  }
  return {
    ...job,
    payload: decodeJobPayload(job.payload),
  };
}

/**
 * Given an object like
 * ```
 *   {
 *     foo: { key1: 'value1', key2: 'value2' },
 *     bar: { key2: 'value2', key3: 'value3' }
 *   }
 * ```
 * returns the set of keys `['key1', 'key2', 'key3']`
 *
 * @param {Record<string,Record<string,unknown>>} obj
 * @return {Set<string>}
 */
export function getChildKeys(obj) {
  const childKeys = new Set();
  for (const key in obj) {
    for (const childKey in obj[key]) {
      childKeys.add(childKey);
    }
  }
  return childKeys;
}

/**
 * Allows registering a function to be called when the query builder is executed.
 *
 * ```
 * // Example
 * const query = knex("table");
 * runAfter(query, (rows) => rows[0]); // get the first result
 * const first = await query;
 * ```
 *
 * _Inspired by https://vincit.github.io/objection.js/api/query-builder/other-methods.html#runafter_
 *
 * @param {Knex.QueryBuilder} query the query builder
 * @param {(result: unknown[]) => unknown} callback the function to call; the return value of the callback is the query's result
 * @returns {Knex.QueryBuilder}
 */
export function runAfter(query, callback) {
  const then = query.then;
  query.then = function (onFulfilled, onRejected) {
    if (this._method !== "select") {
      return then.call(this, onFulfilled, onRejected);
    }
    return then.call(
      this,
      (result) => onFulfilled(callback.call(this, result)),
      onRejected
    );
  }.bind(query);
  return query;
}
