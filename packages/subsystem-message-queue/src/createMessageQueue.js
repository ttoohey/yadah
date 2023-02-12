import MessageQueue from "./MessageQueue.js";

export default function createMessageQueue(knex, logger) {
  return new MessageQueue({ knex, logger });
}
