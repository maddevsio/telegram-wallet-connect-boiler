import { Config, WalletAddress, WalletErrorType, Result } from "../types";
import { Express } from "express";
import { ethers } from "ethers";
import crypto from "crypto";
import { EventEmitter } from "events";
import { Logger } from "../lib";

/**
 * Class for working with Express application
 */
export class ExpressApp extends Logger {
  private nonces: Map<number, string> = new Map();
  private emitter = new EventEmitter();

  /**
   * ExpressApp class constructor
   * @param config Application configuration
   * @param app Express application instance
   */
  constructor(
    private config: Config,
    private app: Express,
  ) {
    super();

    // Handler for connecting wallet through browser
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

    // Handler for verifying signature
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
   * Verifies signature
   * @param message Message
   * @param signature Signature
   * @param address Address
   * @returns true if signature is valid, otherwise false
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
   * Starts server
   */
  listen = async (): Promise<void> => {
    this.app.listen(this.config.APP_SERVER_PORT, () => {
      this.info(`Server started on port ${this.config.APP_SERVER_PORT}`);
    });
  };

  /**
   * Sets handler for verifying user
   * @param callback Callback function
   */
  onVerifyUser(
    callback: (tgId: number, result: Result<WalletAddress, WalletErrorType>) => void,
  ): void {
    this.emitter.on("verify", callback);
  }
} 