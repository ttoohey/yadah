# yadah examples

These example files rely on a test Postgres database running.

To run:

```sh
# cwd: packages/yadah

# set DATABASE_URL to point to your test database
export DATABASE_URL="postgresql://localhost/example"

# run each example file
node examples/message-queue.js
node examples/pubsub.js
node examples/schedule.js
```
