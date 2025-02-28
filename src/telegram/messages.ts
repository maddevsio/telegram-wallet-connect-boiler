import { format, link, bold, InlineKeyboard } from 'gramio';
import { TelegramCommand } from '../types';

/**
 * Message templates for the Telegram bot
 */
export const messages = {
  /**
   * Start message
   */
  start: () => ({
    text: format`
    Hello! I am a bot for connecting Ethereum wallets. \n
    To get started, you need to:
    * Install a crypto wallet like ${link("https://metamask.io/download/", "Metamask")} as a browser extension or mobile app
    * Connect your wallet using the button below
    
    Click the "Connect Wallet" button when you're ready to start.
    `,
    parse_mode: "HTML" as const,
    reply_markup: new InlineKeyboard().text(
      "Connect Wallet",
      TelegramCommand.CONNECT_WALLET,
    ),
  }),

  /**
   * Message with QR code for wallet connection
   */
  pairWalletQr: () => 
    format`Scan the QR code with your mobile wallet or click the "Connect Wallet" button to connect via browser.`,

  /**
   * Message about successful wallet connection
   */
  walletConnected: (address: string) => 
    format`✅ Wallet successfully connected!\n\nAddress: ${bold(address)}`,

  /**
   * Message about error during wallet connection
   */
  walletError: (error: string) => 
    format`❌ Error connecting wallet: ${error}\n\nPlease try again.`,
}; 