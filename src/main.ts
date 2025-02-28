import * as dotenv from 'dotenv';
import express from 'express';
import { getConfig, Logger } from './lib';
import { TelegramBot } from './telegram';
import { ExpressApp, WalletConnect } from './wallet';

// Load environment variables
dotenv.config();

/**
 * Main application class
 */
class Application extends Logger {
  /**
   * Starts the application
   */
  async start(): Promise<void> {
    try {
      // Get configuration
      const config = getConfig();
      
      // Create Express instance
      const app = express();
      
      // Configure middleware
      app.use(express.json());
      
      // Create ExpressApp instance
      const expressApp = new ExpressApp(config, app);
      
      // Create WalletConnect instance
      const walletConnect = new WalletConnect(config, expressApp);
      
      // Create TelegramBot instance
      const telegramBot = new TelegramBot(config, walletConnect);
      
      // Start the server
      await expressApp.listen();
      
      // Start the bot
      telegramBot.start();
      
      this.info('Application started successfully');
    } catch (error) {
      this.error(`Failed to start application: ${error}`);
      process.exit(1);
    }
  }
}

// Create and start the application
const application = new Application();
application.start(); 