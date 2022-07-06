import PubSub from "./PubSub.js";

function createPubSub(knex, config = {}) {
  return new PubSub(knex, config);
}

export default createPubSub;
