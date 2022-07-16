import createMessageQueue, {
  MessageQueueMixin,
} from "@yadah/subsystem-message-queue";
import DataManager, { Domain } from "@yadah/data-manager";
import ListenerMixin from "@yadah/domain-listener";
import createContext from "@yadah/subsystem-context";
import createKnex from "@yadah/subsystem-knex";
import createLogger, { LoggerMixin } from "@yadah/subsystem-logger";
import { pipe } from "@yadah/mixin";

const mixins = pipe(Domain, ListenerMixin, LoggerMixin, MessageQueueMixin);

class MyDomain extends mixins {
  registerListeners() {
    // ensure all superclass listeners are registered
    super.registerListeners();

    // This will listen for the "example" event being emitted on the MyDomain
    // singleton, and create a message queue task named "MyDomain.handleExample".
    // The background service will handle the task by calling the `handleExample`
    // method
    this.queue.on("example").do(this.handleExample);
  }

  handleExample(...payload) {
    this.logger.info("example event handled", ...payload);
  }
}

// create subsystems
const context = createContext();
const knex = createKnex({
  client: "postgresql",
  connection: process.env.DATABASE_URL,
});
const logger = createLogger({ pretty: true });
const mq = createMessageQueue(knex, logger);

// create and boot domains
const dataManager = new DataManager({ context, knex, logger, mq });
const domains = dataManager.boot({ MyDomain });

// start domains and message queue
await dataManager.startup();
await mq.start();

// the 'example' event is handled by the `handleExample` event handler.
// normally this would be done by a separate process so that the work of
// creating a task and processing the task are done by separate workers
domains.MyDomain.emit("example", { data: "example-payload" });
// info: example event handled {timestamp}
// { data: 'example-payload' }

// shutdown message queue and domains
await mq.stop();
await dataManager.shutdown();
await knex.destroy();
