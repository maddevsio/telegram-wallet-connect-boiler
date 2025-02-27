/**
 * Типы ошибок при работе с кошельком
 */
export enum WalletErrorType {
  PROVIDER_NO_ACCOUNTS = "Не удалось получить ни один из аккаунтов",
  SIGNATURE_NOT_VERIFIED = "Ошибка в верификации подписи, вы должны верифицировать подпись только с вашего аккаунта",
  SIGNATURE_TIMEOUT = "Время верификации кошелька истекло, попробуйте еще раз",
  SIGNATURE_REQUEST_ERROR = "Не удалось выполнить подпись через ваш кошелек",
}

/**
 * Информация об адресе кошелька
 */
export type WalletAddress = {
  address: string;
}

/**
 * Результат операции
 */
export type Result<T, E> = {
  value?: T;
  error?: E;
}; 