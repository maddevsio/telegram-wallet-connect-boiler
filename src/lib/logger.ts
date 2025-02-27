import winston from 'winston';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Настройка логгера приложения
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
 * Базовый класс для логирования
 */
export class Logger {
  /**
   * Логирование информационного сообщения
   */
  protected info(message: string): void {
    logger.info(message);
  }

  /**
   * Логирование предупреждения
   */
  protected warn(message: string): void {
    logger.warn(message);
  }

  /**
   * Логирование ошибки
   */
  protected error(message: string | Error): void {
    if (message instanceof Error) {
      logger.error(`${message.message}\n${message.stack}`);
    } else {
      logger.error(message);
    }
  }

  /**
   * Логирование отладочной информации
   */
  protected debug(message: string): void {
    logger.debug(message);
  }
} 