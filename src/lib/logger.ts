import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ecommerce-app' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

export function logInfo(message: string, meta?: Record<string, unknown>) {
  logger.info(message, meta)
}

export function logError(message: string, meta?: Record<string, unknown>) {
  logger.error(message, meta)
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  logger.warn(message, meta)
}

export function logDebug(message: string, meta?: Record<string, unknown>) {
  logger.debug(message, meta)
}
