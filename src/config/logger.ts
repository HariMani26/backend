import winston from 'winston';

import { isProduction } from './env';

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});
