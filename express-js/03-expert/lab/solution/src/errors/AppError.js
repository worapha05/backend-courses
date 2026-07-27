export class AppError extends Error {
  constructor(status, message, { code = 'APP_ERROR', details, isOperational = true } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
  }
}
