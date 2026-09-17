import { App } from "@/app";

import { ValidateEnv } from "@utils/validateEnv";
import { disconnect } from "mongoose";

ValidateEnv();

const app = new App();
let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  try {
    await app.close();
    await disconnect();
    console.log(`[${signal}] Server closed cleanly`);
    process.exit(0);
  } catch (error) {
    console.log(`[${signal}] Error while closing server`);
    console.log(error);
    process.exit(1);
  }
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

app
  .init()
  .then(() => {
    app.listen();
  })
  .catch((error) => {
    console.log("Error in starting server");
    console.log(error);
  });
