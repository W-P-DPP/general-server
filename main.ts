import dotenv from 'dotenv';
import path from 'path';
import express from "express";
import type { Response, Request } from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { RequestLogger, ErrorLogger, Logger } from "./utils/index.ts";
import router from './src/index.ts';
import RedisService from "./utils/Redis.ts";
import initDataBase from "./utils/mysql.ts";
import "./eventRegister.ts";
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';


async function injectEnv() {
  const env = process.env.NODE_ENV || 'development';

  dotenv.config({
    path: path.resolve(process.cwd(), `.env.${env}`)
  });

  console.log('ENV:', env);
  console.log('PORT:', process.env.PORT);
}



// import eventEmitter from "./utils/EventEmitter.ts";
async function initApp() {
  const app = express();
  const logger = Logger.getInstance();
  app.use(cors());
  app.use('/zwpstatic', express.static("public"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.text({ type: 'text/xml' }));

  app.use(RequestLogger.middleware());
  app.use(responseMiddleware)
  app.use('/api', router);
  app.get("/", (req: Request, res: Response) => {
    logger.info("Root endpoint accessed");
    logger.warn("This is a warning message");
    logger.error("This is an error message");
    // // 测试事件触发
    //   eventEmitter.emit("testEvent", { message: "Hello, World!" });
    res.send("Hello, World!");
  });

  app.use(ErrorLogger.middleware());

  const PORT = process.env.PORT || 30010;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

async function bootstrap() {
  try {
    await injectEnv()
    await initApp();
    const redis = RedisService.getInstance();
    await redis.connect();
    await initDataBase();
  } catch (err) {
    console.error('Bootstrap error:', err);
    process.exit(1);
  }
}
bootstrap();
