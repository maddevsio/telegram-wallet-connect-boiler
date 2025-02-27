import { format, link, bold, InlineKeyboard } from 'gramio';
import { TelegramCommand } from '../types';

/**
 * Шаблоны сообщений для Telegram бота
 */
export const messages = {
  /**
   * Стартовое сообщение
   */
  start: () => ({
    text: format`
    Привет! Я — бот для подключения Ethereum кошелька. \n
    Для начала работы вам нужно:
    * Установить криптокошелек ${link("https://metamask.io/download/", "Metamask")} как расширение в браузер или приложение для мобильных устройств
    * Привязать кошелек с помощью кнопки ниже
    
    Нажмите кнопку "Привязать кошелек" когда будете готовы начать.
    `,
    parse_mode: "HTML" as const,
    reply_markup: new InlineKeyboard().text(
      "Привязать кошелек",
      TelegramCommand.CONNECT_WALLET,
    ),
  }),

  /**
   * Сообщение с QR-кодом для подключения кошелька
   */
  pairWalletQr: () => 
    format`Отсканируйте QR-код с помощью вашего мобильного кошелька или нажмите кнопку "Connect Wallet" для подключения через браузер.`,

  /**
   * Сообщение об успешном подключении кошелька
   */
  walletConnected: (address: string) => 
    format`✅ Кошелек успешно подключен!\n\nАдрес: ${bold(address)}`,

  /**
   * Сообщение об ошибке при подключении кошелька
   */
  walletError: (error: string) => 
    format`❌ Ошибка при подключении кошелька: ${error}\n\nПопробуйте еще раз.`,
}; 