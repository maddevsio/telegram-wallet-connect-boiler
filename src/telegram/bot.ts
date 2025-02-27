import { Bot, CallbackQueryContext, MediaUpload, SendMessageParams, SendPhotoParams } from "gramio";
import QRCode from "qrcode";
import { Readable } from "stream";
import { Logger } from "../lib";
import { Config, TelegramCommand } from "../types";
import { WalletConnect } from "../wallet/wallet-connect";
import { messages } from "./messages";

/**
 * Класс для работы с Telegram ботом
 */
export class TelegramBot extends Logger {
  private bot: Bot;
  private sendQueue: (SendMessageParams | SendPhotoParams)[] = [];
  
  /**
   * Конструктор класса TelegramBot
   * @param config Конфигурация приложения
   * @param walletConnect Экземпляр WalletConnect
   */
  constructor(
    private config: Config,
    private walletConnect: WalletConnect,
  ) {
    super();
    
    this.bot = new Bot(config.TELEGRAM_BOT_TOKEN);
    
    // Настройка команд бота
    this.#setupCommands();
    
    // Настройка обработчиков событий
    this.#setupEventHandlers();
    
    // Запуск очереди сообщений
    this.#startQueue();
  }
  
  /**
   * Настраивает команды бота
   */
  #setupCommands = (): void => {
    // Устанавливаем меню команд
    this.bot.api.setMyCommands({
      commands: [
        {
          command: TelegramCommand.START,
          description: "Начать работу с ботом",
        },
      ],
    });
    
    // Обработчик команды /start
    this.bot.command(TelegramCommand.START, (ctx) => {
      this.sendQueue.push({
        ...messages.start(),
        chat_id: ctx.from!.id,
      });
    });
  }
  
  /**
   * Настраивает обработчики событий
   */
  #setupEventHandlers = (): void => {
    // Обработчик callback-запросов (нажатий на кнопки)
    this.bot.on("callback_query", this.#onCallback);
    
    // Обработчик события присоединения пользователя к боту
    this.bot.on("my_chat_member", (ctx) => {
      if (ctx.newChatMember.status === "member") {
        this.sendQueue.push({
          ...messages.start(),
          chat_id: ctx.from.id,
        });
      }
    });
  }
  
  /**
   * Запускает очередь сообщений
   */
  #startQueue = (): void => {
    (async function sendLoop(thisBot: TelegramBot) {
      const nextMessage = thisBot.sendQueue.shift();

      if (!nextMessage) {
        setImmediate(() => sendLoop(thisBot));
        return;
      }

      if ("photo" in nextMessage) {
        await thisBot.bot.api
          .sendPhoto(nextMessage)
          .catch((e) => thisBot.error(e));
      } else {
        await thisBot.bot.api
          .sendMessage({
            ...nextMessage,
            parse_mode: "HTML",
          })
          .catch((e) => thisBot.error(e));
      }

      setImmediate(() => sendLoop(thisBot));
    })(this);
  }
  
  /**
   * Обработчик callback-запросов
   */
  #onCallback = async (ctx: CallbackQueryContext<Bot>): Promise<void> => {
    const data = ctx.data;
    
    if (data === TelegramCommand.CONNECT_WALLET) {
      await this.#pairWallet(ctx.from.id);
    } else if (data === TelegramCommand.RETRY) {
      await this.#pairWallet(ctx.from.id);
    }
  }
  
  /**
   * Подключает кошелек пользователя
   */
  #pairWallet = async (tgId: number): Promise<void> => {
    try {
      // Получаем URI для подключения кошелька
      const uri = await this.walletConnect.connect(tgId);
      
      if (!uri) {
        this.sendQueue.push({
          text: messages.walletError("Не удалось создать сессию подключения"),
          chat_id: tgId,
        });
        return;
      }
      
      // Отправляем QR-код и ссылку для подключения
      await this.#sendWalletQR(tgId, uri);
      
      // Ожидаем результат верификации
      const result = await this.walletConnect.getVerifyUser(tgId);
      
      if (result?.value) {
        // Успешное подключение
        this.sendQueue.push({
          text: messages.walletConnected(result.value.address),
          chat_id: tgId,
        });
      } else if (result?.error) {
        // Ошибка подключения
        this.sendQueue.push({
          text: messages.walletError(result.error),
          chat_id: tgId,
        });
      }
    } catch (error) {
      this.error(`Error pairing wallet: ${error}`);
      this.sendQueue.push({
        text: messages.walletError("Произошла неизвестная ошибка"),
        chat_id: tgId,
      });
    }
  }
  
  /**
   * Отправляет QR-код для подключения кошелька
   */
  #sendWalletQR = async (tgId: number, uri: string): Promise<void> => {
    try {
      const qr = await QRCode.toDataURL(uri, { errorCorrectionLevel: "H" });
      const baseuri = qr.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(baseuri, "base64");
      const file = await MediaUpload.stream(
        Readable.from(buffer),
        `qr_${tgId}.png`,
      );
      
      // Формируем URL для подключения через браузер
      const walletConnectUrl = `${this.config.BACKEND_URL}/wallet_connect?id=${tgId}&uri=${btoa(uri)}`;
      
      // Проверяем, начинается ли URI с https
      const isHttpsUri = uri.startsWith('https://');
      
      // Отправляем QR-код и ссылку для подключения
      this.sendQueue.push({
        chat_id: tgId,
        photo: file,
        caption: isHttpsUri 
          ? messages.pairWalletQr() 
          : `${messages.pairWalletQr()}\n\nИли скопируйте эту ссылку в ваш кошелек:\n<code>${uri}</code>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: isHttpsUri ? [
            [
              {
                text: "Connect Wallet",
                url: walletConnectUrl,
              },
            ],
          ] : [],
        },
      });
    } catch (error) {
      this.error(`Error sending wallet QR: ${error}`);
      this.sendQueue.push({
        text: messages.walletError("Ошибка при генерации QR-кода"),
        chat_id: tgId,
      });
    }
  }
  
  /**
   * Запускает бота
   */
  start = (): void => {
    this.bot.start();
    this.info("Telegram bot started");
  }
} 