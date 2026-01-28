// src/logger/Logger.ts
import winston, { Logger as WinstonLogger } from 'winston';
import path from 'path';
import fs from 'fs';

export class Logger {
  private static instance: WinstonLogger;

  public static getInstance(): WinstonLogger {
    if (!Logger.instance) {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }

      const isProd = process.env.NODE_ENV === 'production';

      const { combine, timestamp, printf, colorize, json } = winston.format;

      const devFormat = printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} [${level}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ''
        }`;
      });

      Logger.instance = winston.createLogger({
        level: 'info',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          isProd ? json() : devFormat
        ),
        transports: [
          new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
          }),
          new winston.transports.File({
            filename: path.join(logDir, 'app.log')
          })
        ]
      });

      if (!isProd) {
        Logger.instance.add(
          new winston.transports.Console({
            format: combine(colorize(), devFormat)
          })
        );
      }
    }

    return Logger.instance;
  }
}
