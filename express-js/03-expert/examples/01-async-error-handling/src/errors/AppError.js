export class AppError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {{ code?: string, details?: unknown, isOperational?: boolean }} [options]
   */
  constructor(status, message, { code = 'APP_ERROR', details, isOperational = true } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
  }
}
