import { AsyncLocalStorage } from "node:async_hooks";

function createContext() {
  const asyncLocalStorage = new AsyncLocalStorage();
  function context(callback, inherit = false) {
    const store = inherit ? asyncLocalStorage.getStore() : undefined;
    return asyncLocalStorage.run(new Map(store), () =>
      callback(asyncLocalStorage.getStore())
    );
  }
  function set(key, value) {
    const store = asyncLocalStorage.getStore();
    if (value === undefined) {
      store.delete(key);
    } else {
      store.set(key, value);
    }
  }
  function get(key) {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      return undefined;
    }
    return store.get(key);
  }
  context.set = set;
  context.get = get;
  return context;
}

export default createContext;
