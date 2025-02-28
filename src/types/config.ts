/**
 * Application configuration
 */
export type Config = {
  // Telegram
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_URL: `https://t.me/${string}`;

  // Server
  APP_SERVER_PORT: string;
  BACKEND_URL: `https://${string}` | `http://${string}`;

  // WalletConnect
  WC_PROJECT_ID: string;
  WC_CHAIN_ID: number;

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}; 