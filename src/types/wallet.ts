/**
 * Wallet error types
 */
export enum WalletErrorType {
  PROVIDER_NO_ACCOUNTS = "Failed to get any accounts",
  SIGNATURE_NOT_VERIFIED = "Signature verification error, you must verify the signature only with your account",
  SIGNATURE_TIMEOUT = "Wallet verification time expired, please try again",
  SIGNATURE_REQUEST_ERROR = "Failed to sign with your wallet",
}

/**
 * Wallet address information
 */
export type WalletAddress = {
  address: string;
}

/**
 * Operation result
 */
export type Result<T, E> = {
  value?: T;
  error?: E;
}; 