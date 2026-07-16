import { CREDENTIALS, LOG_FORMAT, NODE_ENV, ORIGIN } from "@config";
import { dbConnection } from "@database";
import { Routes } from "@interfaces/routes.interface";

import { AuthMiddleware } from "@middlewares/auth.middleware";
import { logger, stream } from "@utils/logger";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import helmet from "helmet";
import hpp from "hpp";
import { Server } from "http";
import { connect, set } from "mongoose";
import morgan from "morgan";
import { AddressInfo } from "net";
import "reflect-metadata";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { ErrorMiddleware } from "./middlewares/error.middleware";
import {
  seedDistricts,
  seedKulamCompatibility,
  seedKulams,
  seedMembershipPlans,
} from "./scripts/seed";

export class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  private server?: Server;

  constructor() {
    this.app = express();
    this.env = process.env.NODE_ENV || "development";
    this.port = Number(process.env.PORT) || 3000;
  }

  public async init(routes: Routes[]) {
    await this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeRoutes(routes);

    this.initializeErrorHandling();
  }

  public listen() {
    this.server = this.app.listen(Number(this.port), () => {
      const sAddress = this.server?.address() as AddressInfo | string | null;
      const activePort =
        sAddress && typeof sAddress === "object" ? sAddress.port : this.port;

      this.port = activePort;
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${activePort}`);
      logger.info(`=================================`);
      console.log(
        `[${NODE_ENV}]  Server running on http://localhost:${activePort}/`,
      );
    });

    this.server.on("error", (error: NodeJS.ErrnoException) => {
      logger.error(
        `Error occurred while starting the server: ${error.message}`,
      );
      throw error;
    });

    return this.server;
  }

  public async close() {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.server = undefined;
  }

  public getServer() {
    return this.app;
  }

  private async connectToDatabase() {
    if (this.env !== "production") {
      set("debug", true);
    }

    try {
      const dbUrl = dbConnection.url;
      if (!dbUrl) {
        throw new Error("Database connection URL is not defined");
      }

      await connect(dbUrl);
      //MongoDB initial value seeders
      await this.seedInitialValues();
    } catch (error) {
      logger.error(`Error connecting to the database: ${error}`);
    }
  }
  async seedInitialValues() {
    await seedDistricts();
    await seedKulams();
    await seedKulamCompatibility();
    await seedMembershipPlans();
  }
  private initializeMiddlewares() {
    const logFormat = LOG_FORMAT ?? "combined";

    if (this.env === "production") {
      this.app.use(morgan(logFormat, { stream }));
      this.app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }));
      this.app.use(helmet({ contentSecurityPolicy: false }));
    } else {
      this.app.use(helmet({ contentSecurityPolicy: false }));
      this.app.use(morgan("dev", { stream }));
      this.app.use(cors({ origin: true, credentials: true }));
    }

    this.app.use(hpp());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    this.app.get("/health", (req, res) => {
      res.status(200).send("OK");
    });
    this.app.get("/", (req, res) => {
      res.status(200).send("OK");
    });

    // Initialize other routes
    routes.forEach((route) => {
      this.app.use("/", AuthMiddleware, route.router);
    });
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: "REST API",
          version: "1.0.0",
          description: "Example docs",
        },
      },
      apis: ["swagger.yaml"],
    };

    const specs = swaggerJSDoc(options);
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }
}

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Service healthy",
      data: { status: "ok", timestamp: new Date().toISOString() },
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      errors: [],
    });
  });

  return app;
}
