import winston from 'winston';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Application logger configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Base class for logging
 */
export class Logger {
  /**
   * Log information message
   */
  protected info(message: string): void {
    logger.info(message);
  }

  /**
   * Log warning
   */
  protected warn(message: string): void {
    logger.warn(message);
  }

  /**
   * Log error
   */
  protected error(message: string | Error): void {
    if (message instanceof Error) {
      logger.error(`${message.message}\n${message.stack}`);
    } else {
      logger.error(message);
    }
  }

  /**
   * Log debug information
   */
  protected debug(message: string): void {
    logger.debug(message);
  }
} 