import * as dotenv from 'dotenv';
import express from 'express';
import { getConfig, Logger } from './lib';
import { TelegramBot } from './telegram';
import { ExpressApp, WalletConnect } from './wallet';

// Загружаем переменные окружения
dotenv.config();

/**
 * Основной класс приложения
 */
class Application extends Logger {
  /**
   * Запускает приложение
   */
  async start(): Promise<void> {
    try {
      // Получаем конфигурацию
      const config = getConfig();
      
      // Создаем экземпляр Express
      const app = express();
      
      // Настраиваем middleware
      app.use(express.json());
      
      // Создаем экземпляр ExpressApp
      const expressApp = new ExpressApp(config, app);
      
      // Создаем экземпляр WalletConnect
      const walletConnect = new WalletConnect(config, expressApp);
      
      // Создаем экземпляр TelegramBot
      const telegramBot = new TelegramBot(config, walletConnect);
      
      // Запускаем сервер
      await expressApp.listen();
      
      // Запускаем бота
      telegramBot.start();
      
      this.info('Application started successfully');
    } catch (error) {
      this.error(`Failed to start application: ${error}`);
      process.exit(1);
    }
  }
}

// Создаем и запускаем приложение
const application = new Application();
application.start(); 