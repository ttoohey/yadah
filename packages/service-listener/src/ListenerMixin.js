import dedupe from "@yadah/dedupe-mixin";

function ListenerMixin(superclass) {
  return class Listener extends superclass {
    boot() {
      super.boot(...arguments);
      this.registerListeners();
    }
    async shutdown() {
      await super.shutdown();
      this.removeAllListeners();
    }

    /**
     * hook for derived classes to register event listeners
     * this is called during the boot process after the context has been setup
     * so derived classes will have access to other services and the pubsub
     * and message queue providers
     */
    registerListeners() {}
  };
}

export default ListenerMixin |> dedupe(%);
