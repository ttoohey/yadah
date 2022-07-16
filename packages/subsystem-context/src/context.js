import { AsyncLocalStorage } from "node:async_hooks";

const CONTEXT = Symbol("CONTEXT");
const rootStore = new Map();
rootStore.set(CONTEXT, []);

function createContext() {
  const asyncLocalStorage = new AsyncLocalStorage();
  function context(callback) {
    const store = asyncLocalStorage.getStore() || rootStore;
    const newStore = new Map(store);
    newStore.set(CONTEXT, []);
    const result = asyncLocalStorage.run(newStore, async () => {
      const result = callback(asyncLocalStorage.getStore());
      await Promise.all(get(CONTEXT).concat(result));
      return result;
    });
    store.set(CONTEXT, store.get(CONTEXT).concat(result));
    return result;
  }
  function set(key, value) {
    const store = asyncLocalStorage.getStore() || rootStore;
    if (value === undefined) {
      store.delete(key);
    } else {
      store.set(key, value);
    }
  }
  function get(key) {
    const store = asyncLocalStorage.getStore() || rootStore;
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
