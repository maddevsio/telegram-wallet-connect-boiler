import * as dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

/**
 * Gets a required environment variable
 * @param name Environment variable name
 * @returns Environment variable value
 * @throws Error if the variable is not defined
 */
export function mustEnv<T extends string>(name: string): T {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value as T;
}

/**
 * Gets application configuration from environment variables
 * @returns Application configuration
 */
export function getConfig(): Config {
  return {
    // Telegram
    TELEGRAM_BOT_TOKEN: mustEnv<string>('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_BOT_URL: mustEnv<`https://t.me/${string}`>('TELEGRAM_BOT_URL'),

    // Server
    APP_SERVER_PORT: mustEnv<string>('APP_SERVER_PORT'),
    BACKEND_URL: mustEnv<`https://${string}` | `http://${string}`>('BACKEND_URL'),

    // WalletConnect
    WC_PROJECT_ID: mustEnv<string>('WC_PROJECT_ID'),
    WC_CHAIN_ID: Number(mustEnv<string>('WC_CHAIN_ID')),

    // Logging
    LOG_LEVEL: (mustEnv<string>('LOG_LEVEL') as 'error' | 'warn' | 'info' | 'debug'),
  };
} 