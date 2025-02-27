import { Config, WalletAddress, WalletErrorType, Result } from "../types";
import { Express } from "express";
import { ethers } from "ethers";
import crypto from "crypto";
import { EventEmitter } from "events";
import { Logger } from "../lib";

/**
 * Класс для работы с Express приложением
 */
export class ExpressApp extends Logger {
  private nonces: Map<number, string> = new Map();
  private emitter = new EventEmitter();

  /**
   * Конструктор класса ExpressApp
   * @param config Конфигурация приложения
   * @param app Экземпляр Express приложения
   */
  constructor(
    private config: Config,
    private app: Express,
  ) {
    super();

    // Обработчик для подключения кошелька через браузер
    this.app.get(`/wallet_connect`, (req: any, res: any) => {
      const tgId = Number(req.query.id);
      const uri = atob(req.query.uri);
      const nonce = crypto.randomBytes(16).toString("hex");
      const message = ethers.hexlify(ethers.toUtf8Bytes(`${nonce}`));
      this.nonces.set(tgId, nonce);

      res.setHeader("Content-Type", "text/html");
      res.send(`
          <!DOCTYPE html>
          <script>
            (async () => {
              if (!window.ethereum) {
                window.location.href = \`${uri}\`;
                throw new Error('Please install MetaMask');
              }
              
              try {
                const accounts = await window.ethereum.request({ 
                  method: 'eth_requestAccounts' 
                });
                
                const signature = await window.ethereum.request({
                  method: 'personal_sign',
                  params: [
                    '${message}',
                    accounts[0]
                  ]
                });
      
                window.location.href = \`/verify?address=\${accounts[0]}&signature=\${encodeURIComponent(signature)}&id=${tgId}\`;
                
              } catch (error) {
                console.error('Error:', error);
                alert('Signature required for login');
                window.location.href = \`/verify?id=${tgId}\`;
              }
            })();
          </script>
        `);
    });

    // Обработчик для верификации подписи
    this.app.get("/verify", (req, res) => {
      const { address, signature, id } = req.query;
      const tgId = Number(id);
      const originalMessage = this.nonces.get(tgId);

      if (!originalMessage) {
        res.status(401).send("Invalid signature");
        const result = { error: WalletErrorType.SIGNATURE_NOT_VERIFIED };
        this.emitter.emit("verify", tgId, result);
        return;
      }

      const isValid = this.#verifySignature(
        originalMessage,
        signature as string,
        address as string,
      );
      this.nonces.delete(tgId);

      if (isValid) {
        res.send("Signature verified!");
        const result = { value: { address: address as string } };
        this.emitter.emit("verify", tgId, result);
      } else {
        res.status(401).send("Invalid signature");
        const result = { error: WalletErrorType.SIGNATURE_NOT_VERIFIED };
        this.emitter.emit("verify", tgId, result);
      }
    });
  }

  /**
   * Верифицирует подпись
   * @param message Сообщение
   * @param signature Подпись
   * @param address Адрес
   * @returns true, если подпись верна, иначе false
   */
  #verifySignature(
    message: string,
    signature: string,
    address: string,
  ): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (e) {
      this.error(`Error verifying signature: ${e}`);
      return false;
    }
  }

  /**
   * Запускает сервер
   */
  listen = async (): Promise<void> => {
    this.app.listen(this.config.APP_SERVER_PORT, () => {
      this.info(`Server started on port ${this.config.APP_SERVER_PORT}`);
    });
  };

  /**
   * Устанавливает обработчик для верификации пользователя
   * @param callback Функция обратного вызова
   */
  onVerifyUser(
    callback: (tgId: number, result: Result<WalletAddress, WalletErrorType>) => void,
  ): void {
    this.emitter.on("verify", callback);
  }
} 