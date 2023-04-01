export const isStringRegEx = /^([^:]+):([^/]+)\/(.+)$/;
export const isContainerStringRegEx = /^([^:]+):([^/]+)$/;
export const isSpaceStringRegEx = /^([^:]+)$/;

export function isUrl(value) {
  return value instanceof URL;
}

export function isString(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.match(isStringRegEx);
}

export function isContainerString(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.match(isContainerStringRegEx);
}

export function isSpaceString(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.match(isSpaceStringRegEx);
}

export function isUrlString(value) {
  if (typeof value !== "string") {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch (e) {
    return false;
  }
}

export function isJson(value) {
  if (typeof value !== "object") {
    return false;
  }
  if (value.space && typeof value.space !== "string") {
    return false;
  }
  if (typeof value.container !== "string" && value.container !== null) {
    return false;
  }
  if (typeof value.object !== "string" && value.object !== null) {
    return false;
  }
  if (value.container === null && value.object !== null) {
    return false;
  }
  return true;
}

export function isTuple(value) {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length !== 2 && value.length !== 3) {
    return false;
  }
  const [container, object] = value.slice(-2);
  if (typeof container !== "string" && container !== null) {
    return false;
  }
  if (typeof object !== "string" && object !== null) {
    return false;
  }
  if (container === null && object !== null) {
    return false;
  }
  return true;
}

export const thenable = (it) => {
  const _then = async (resolve, reject) => {
    try {
      const result = [];
      for await (const data of it()) {
        result.push(data);
      }
      return resolve(result);
    } catch (err) {
      if (reject instanceof Function) {
        return reject(err);
      }
      throw err;
    }
  };
  const _catch = async (reject) => _then((result) => result, reject);
  const _finallly = async (cb) => _then((result) => result).finally(cb);
  return {
    then: _then,
    catch: _catch,
    finally: _finallly,
    [Symbol.asyncIterator]: it,
  };
};
