import { logError, logInfo } from './logger'

interface ErrorContext {
  userId?: string
  orderId?: string
  action: string
  [key: string]: unknown
}

interface StructuredErrorLog extends ErrorContext {
  errorMessage: string
  stack?: string
  timestamp: string
}

export function logStructuredError(message: string, context: ErrorContext, error?: Error) {
  const structuredLog: StructuredErrorLog = {
    ...context,
    errorMessage: message,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  }
  
  logError(message, structuredLog)
}

export function logStructuredInfo(message: string, context: Omit<ErrorContext, 'action'>, action: string) {
  logInfo(message, {
    ...context,
    action,
    timestamp: new Date().toISOString(),
  })
}

export function logCheckoutError(error: Error, userId: string, orderId?: string) {
  logStructuredError('Checkout error', {
    userId,
    orderId,
    action: 'checkout',
    errorType: error.constructor.name,
  }, error)
}

export function logPaymentError(error: Error, orderId: string, userId?: string) {
  logStructuredError('Payment error', {
    userId,
    orderId,
    action: 'payment_processing',
    errorType: error.constructor.name,
  }, error)
}

export function logCallbackError(error: Error, checkoutRequestId?: string) {
  logStructuredError('M-Pesa callback error', {
    orderId: checkoutRequestId,
    action: 'mpesa_callback',
    errorType: error.constructor.name,
  }, error)
}

export function logValidationError(context: ErrorContext, validationErrors: unknown) {
  logError('Validation error', {
    ...context,
    validationErrors,
    timestamp: new Date().toISOString(),
  })
}

export function logApiError(endpoint: string, error: Error, context?: Record<string, unknown>) {
  logStructuredError(`API error in ${endpoint}`, {
    action: `api_${endpoint}`,
    ...context,
  }, error)
}
