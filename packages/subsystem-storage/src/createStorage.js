import Storage from "./Storage.js";

function storage(config, adaptors) {
  Storage.config = config;
  Storage.adaptors = adaptors;
  return new Storage();
}

export default storage;
