# Telegram Ethereum Boilerplate

[![Developed by Mad Devs](https://maddevs.io/badge-dark.svg)](https://maddevs.io?utm_source=github&utm_medium=madboiler)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Boilerplate for creating a Telegram bot with Ethereum wallet integration. This project allows users to connect their Ethereum wallets to a Telegram bot via WalletConnect or directly through a browser extension (e.g., MetaMask).

## Features

- Creating a Telegram bot using the gramio library
- Connecting an Ethereum wallet via WalletConnect (QR code)
- Connecting an Ethereum wallet via browser extension (window.ethereum)
- Wallet ownership verification through message signing
- Reliable message sending through a queue
- Logging with configurable detail level

## Requirements

- Node.js 18+
- npm or yarn
- Telegram Bot Token (get from [@BotFather](https://t.me/BotFather))
- WalletConnect Project ID (get from [WalletConnect Cloud](https://cloud.walletconnect.com/))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd telegram-ethereum-boilerplate
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your `.env` file with your data:
```
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_URL=https://t.me/your_bot_username

# Server
APP_SERVER_PORT=3000
BACKEND_URL=http://localhost:3000

# WalletConnect
WC_PROJECT_ID=your_walletconnect_project_id
WC_CHAIN_ID=1 # Ethereum Mainnet

# Logging
LOG_LEVEL=info
```

## Running

### Development Mode

```bash
npm run dev
```

### Build and Run in Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── constants.ts           # Application constants
├── lib/                   # Helper functions and classes
│   ├── logger.ts          # Logger
│   └── utils.ts           # Utilities
├── main.ts                # Application entry point
├── telegram/              # Module for working with Telegram
│   ├── bot.ts             # Telegram bot class with message queue
│   └── messages.ts        # Message templates
├── types/                 # Types and interfaces
│   ├── config.ts          # Configuration type
│   ├── telegram.ts        # Types for Telegram
│   └── wallet.ts          # Types for wallet operations
└── wallet/                # Module for wallet operations
    ├── express-app.ts     # Express application
    └── wallet-connect.ts  # Class for working with WalletConnect
```

## Implementation Features

### Message Queue

The boilerplate uses a message queue for reliable message sending to Telegram. This allows:
- Avoiding Telegram API rate limits for message sending
- Guaranteeing message delivery even with temporary connection issues
- Centralized handling of sending errors

### WalletConnect Error Handling

Global error handling for WalletConnect is implemented, which prevents the application from crashing when errors occur in the WalletConnect library.

## Production Setup

For production deployment, it is recommended to:

1. Set up HTTPS using Nginx or another proxy server
2. Update `BACKEND_URL` in the `.env` file to your domain with HTTPS
3. Register your domain in the WalletConnect Dashboard for verification

## Extending Functionality

The boilerplate provides basic functionality for wallet connection. You can extend it by adding:

- Saving user data to a database
- Integration with smart contracts
- Additional commands and functions for the Telegram bot
- Multilingual support using i18n

## Getting the Required Keys and Tokens

### Getting a Telegram Bot Token

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send the `/newbot` command
3. Follow BotFather's instructions to create a new bot:
   - Specify the bot name (e.g., "My Ethereum Bot")
   - Specify the bot username (must end with "bot", e.g., "my_ethereum_bot")
4. After successful bot creation, BotFather will provide you with a bot token that looks something like: `123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ`
5. Copy this token to your `.env` file in the `TELEGRAM_BOT_TOKEN` field

### Getting a WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Register or log in to an existing account
3. Click the "Create New Project" button
4. Enter a project name (e.g., "Telegram Ethereum Bot")
5. After creating the project, you will receive a Project ID
6. Copy the Project ID to your `.env` file in the `WC_PROJECT_ID` field
7. In the project settings on WalletConnect Cloud, add the domains from which requests will be accepted (for development, you can use `localhost`)