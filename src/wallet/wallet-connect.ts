import { EthereumProvider as ProviderBuilder } from "@walletconnect/ethereum-provider";
import { ethers } from "ethers";
import { Logger } from "../lib";
import { Config, WalletAddress, WalletErrorType, Result } from "../types";
import { WC_METADATA } from "../constants";
import { ExpressApp } from "./express-app";

/**
 * Класс для работы с WalletConnect
 */
export class WalletConnect extends Logger {
  private pendingUsers: Map<number, InstanceType<typeof ProviderBuilder>> = new Map();
  private verifyUsers: Map<number, Result<WalletAddress, WalletErrorType>> = new Map();
  private timeout: number = 300000; // 5 минут

  /**
   * Конструктор класса WalletConnect
   * @param config Конфигурация приложения
   * @param express Экземпляр Express приложения
   */
  constructor(
    private config: Config,
    private express: ExpressApp,
  ) {
    super();

    this.express.onVerifyUser((tgId, result) => {
      this.verifyUsers.set(tgId, result);
    });
    
    // Устанавливаем глобальный обработчик необработанных исключений
    this.#setupGlobalErrorHandlers();
  }

  /**
   * Инициализирует провайдер WalletConnect
   * @returns Провайдер WalletConnect
   */
  #initProvider = () =>
    ProviderBuilder.init({
      projectId: this.config.WC_PROJECT_ID,
      metadata: WC_METADATA,
      client: undefined,
      showQrModal: false,
      optionalChains: [this.config.WC_CHAIN_ID],
    });

  /**
   * Подключает кошелек пользователя через WalletConnect
   * @param tgId Идентификатор пользователя в Telegram
   * @returns URI для подключения кошелька или undefined, если пользователь уже подключен
   */
  connect = async (tgId: number): Promise<string | undefined> => {
    if (this.pendingUsers.has(tgId)) {
      return undefined;
    }

    const provider = await this.#initProvider();

    let uri: string | undefined;

    provider.on("display_uri", (connectUri) => (uri = connectUri));

    provider.on("connect", async () => {
      if (!provider.accounts) {
        this.verifyUsers.set(tgId, { error: WalletErrorType.PROVIDER_NO_ACCOUNTS });
        return;
      }

      const account: string = provider.accounts[0];
      const pureParams: string = ethers.hexlify(ethers.toUtf8Bytes(`${tgId}`));
      const params: string = ethers.hexlify(ethers.toUtf8Bytes(pureParams));
      const payload: string[] = [params, account];

      const resultReq = provider.request({
        method: "personal_sign",
        params: payload,
      });

      const result = await resultReq.catch((e) => {
        this.error(`Wallet connect failed to confirm request ${e}`);
        this.verifyUsers.set(tgId, {
          error: WalletErrorType.SIGNATURE_REQUEST_ERROR,
        });
      });

      if (!result) {
        return;
      }

      const verified = ethers.verifyMessage(pureParams, result as string);

      if (verified.toLowerCase() !== account.toLowerCase()) {
        this.verifyUsers.set(tgId, {
          error: WalletErrorType.SIGNATURE_NOT_VERIFIED,
        });
        return;
      }

      this.verifyUsers.set(tgId, { value: { address: account } });
    });

    provider.connect().catch((error) => {
      this.error(`Wallet connect failed to connect ${error}`);
      this.verifyUsers.set(tgId, {
        error: WalletErrorType.SIGNATURE_REQUEST_ERROR,
      });
      return;
    });

    while (!uri) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    this.pendingUsers.set(tgId, provider);

    this.#waitUser(tgId);

    return uri;
  };

  /**
   * Ожидает подключения кошелька пользователя
   * @param tgId Идентификатор пользователя в Telegram
   */
  #waitUser = async (tgId: number): Promise<void> => {
    const startTime = Date.now();
    while (
      !this.verifyUsers.has(tgId) &&
      Date.now() - startTime < this.timeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!this.verifyUsers.has(tgId)) {
      this.verifyUsers.set(tgId, { error: WalletErrorType.SIGNATURE_TIMEOUT });
    }
  }

  /**
   * Получает результат верификации пользователя
   * @param tgId Идентификатор пользователя в Telegram
   * @returns Результат верификации пользователя
   */
  getVerifyUser = async (tgId: number): Promise<Result<WalletAddress, WalletErrorType> | undefined> => {
    while (!this.verifyUsers.has(tgId)) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    this.pendingUsers.delete(tgId);
    const account = this.verifyUsers.get(tgId);
    this.verifyUsers.delete(tgId);
    return account;
  };

  /**
   * Устанавливает глобальные обработчики ошибок для перехвата ошибок WalletConnect
   */
  #setupGlobalErrorHandlers = (): void => {
    // Перехватываем необработанные исключения
    process.on('uncaughtException', (error: Error) => {
      // Проверяем, связана ли ошибка с WalletConnect proposals
      if (error.message && (
          error.message.includes('Proposal expired') || 
          error.message.includes('walletconnect') ||
          error.message.includes('proposal')
      )) {
        this.error(`[GLOBAL ERROR] Caught WalletConnect proposal error: ${error.message}`);
        
        // Логируем стек вызовов для отладки
        if (error.stack) {
          this.error(`[GLOBAL ERROR] Stack trace: ${error.stack}`);
        }
      } else {
        // Для других ошибок просто логируем, но позволяем процессу продолжить работу
        this.error(`[GLOBAL ERROR] Uncaught exception: ${error.message}`);
        
        // Логируем стек вызовов для отладки
        if (error.stack) {
          this.error(`[GLOBAL ERROR] Stack trace: ${error.stack}`);
        }
      }
    });
    
    // Перехватываем необработанные отклонения промисов
    process.on('unhandledRejection', (reason: any) => {
      // Проверяем, связана ли ошибка с WalletConnect proposals
      if (reason && reason.message && (
          reason.message.includes('Proposal expired') || 
          reason.message.includes('walletconnect') ||
          reason.message.includes('proposal')
      )) {
        this.error(`[GLOBAL ERROR] Caught WalletConnect proposal rejection: ${reason.message}`);
        
        // Логируем стек вызовов для отладки
        if (reason.stack) {
          this.error(`[GLOBAL ERROR] Stack trace: ${reason.stack}`);
        }
      } else {
        // Для других ошибок просто логируем, но позволяем процессу продолжить работу
        this.error(`[GLOBAL ERROR] Unhandled rejection: ${reason}`);
      }
    });
    
    this.info(`[GLOBAL ERROR] Global error handlers set up successfully`);
  }
} 