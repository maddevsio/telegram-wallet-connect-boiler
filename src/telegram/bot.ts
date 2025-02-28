import { Bot, CallbackQueryContext, MediaUpload, SendMessageParams, SendPhotoParams } from "gramio";
import QRCode from "qrcode";
import { Readable } from "stream";
import { Logger } from "../lib";
import { Config, TelegramCommand } from "../types";
import { WalletConnect } from "../wallet/wallet-connect";
import { messages } from "./messages";

/**
 * Class for working with the Telegram bot
 */
export class TelegramBot extends Logger {
  private bot: Bot;
  private sendQueue: (SendMessageParams | SendPhotoParams)[] = [];
  
  /**
   * TelegramBot class constructor
   * @param config Application configuration
   * @param walletConnect WalletConnect instance
   */
  constructor(
    private config: Config,
    private walletConnect: WalletConnect,
  ) {
    super();
    
    this.bot = new Bot(config.TELEGRAM_BOT_TOKEN);
    
    // Set up bot commands
    this.#setupCommands();
    
    // Set up event handlers
    this.#setupEventHandlers();
    
    // Start the message queue
    this.#startQueue();
  }
  
  /**
   * Sets up bot commands
   */
  #setupCommands = (): void => {
    // Set up the command menu
    this.bot.api.setMyCommands({
      commands: [
        {
          command: TelegramCommand.START,
          description: "Start working with the bot",
        },
      ],
    });
    
    // /start command handler
    this.bot.command(TelegramCommand.START, (ctx) => {
      this.sendQueue.push({
        ...messages.start(),
        chat_id: ctx.from!.id,
      });
    });
  }
  
  /**
   * Set up event handlers
   */
  #setupEventHandlers = (): void => {
    // Callback query handler (button clicks)
    this.bot.on("callback_query", this.#onCallback);
    
    // Event handler for user joining the bot
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
   * Start the message queue
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
   * Callback query handler
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
   * Pair the user's wallet
   */
  #pairWallet = async (tgId: number): Promise<void> => {
    try {
      // Get the URI for connecting the wallet
      const uri = await this.walletConnect.connect(tgId);
      
      if (!uri) {
        this.sendQueue.push({
          text: messages.walletError("Failed to create connection session"),
          chat_id: tgId,
        });
        return;
      }
      
      // Send QR code and connection link
      await this.#sendWalletQR(tgId, uri);
      
      // Wait for verification result
      const result = await this.walletConnect.getVerifyUser(tgId);
      
      if (result?.value) {
        // Successful connection
        this.sendQueue.push({
          text: messages.walletConnected(result.value.address),
          chat_id: tgId,
        });
      } else if (result?.error) {
        // Connection error
        this.sendQueue.push({
          text: messages.walletError(result.error),
          chat_id: tgId,
        });
      }
    } catch (error) {
      this.error(`Error pairing wallet: ${error}`);
      this.sendQueue.push({
        text: messages.walletError("Unknown error occurred"),
        chat_id: tgId,
      });
    }
  }
  
  /**
   * Send QR code for connecting the wallet
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
      
      // Form URL for connecting through browser
      const walletConnectUrl = `${this.config.BACKEND_URL}/wallet_connect?id=${tgId}&uri=${btoa(uri)}`;
      
      // Check if URI starts with https
      const isHttpsUri = uri.startsWith('https://');
      
      // Send QR code and connection link
      this.sendQueue.push({
        chat_id: tgId,
        photo: file,
        caption: isHttpsUri 
          ? messages.pairWalletQr() 
          : `${messages.pairWalletQr()}\n\nOr copy this link to your wallet:\n<code>${uri}</code>`,
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
        text: messages.walletError("Error generating QR code"),
        chat_id: tgId,
      });
    }
  }
  
  /**
   * Start the bot
   */
  start = (): void => {
    this.bot.start();
    this.info("Telegram bot started");
  }
} 