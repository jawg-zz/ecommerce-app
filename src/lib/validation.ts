export interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}

export function validatePassword(password: string): ValidationResult & { strength?: 'weak' | 'medium' | 'strong' } {
  if (!password) {
    return { isValid: false, error: 'Password is required' }
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters', strength: 'weak' }
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  let score = 0
  
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  if (score >= 3) strength = 'strong'
  else if (score >= 2) strength = 'medium'
  
  return { isValid: true, strength }
}

export function getPasswordStrength(password: string): {
  score: number
  percentage: number
  label: string
  color: string
} {
  let score = 0
  
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const percentage = Math.min(100, (score / 6) * 100)
  
  let label = 'Very Weak'
  let color = 'bg-red-500'
  
  if (score <= 1) {
    label = 'Very Weak'
    color = 'bg-red-500'
  } else if (score <= 2) {
    label = 'Weak'
    color = 'bg-red-400'
  } else if (score <= 3) {
    label = 'Fair'
    color = 'bg-yellow-500'
  } else if (score <= 4) {
    label = 'Good'
    color = 'bg-green-400'
  } else {
    label = 'Strong'
    color = 'bg-green-500'
  }

  return { score, percentage, label, color }
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return { isValid: true }
  }
  
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return { isValid: true }
  }
  
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return { isValid: true }
  }
  
  return { isValid: false, error: 'Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)' }
}

export function validatePhoneForDisplay(phone: string): boolean {
  if (!phone) return false
  
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('0') && cleaned.length === 10) return true
  if (cleaned.startsWith('254') && cleaned.length === 12) return true
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) return true
  
  return false
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` }
  }
  return { isValid: true }
}

export function validateNumber(value: string | number, min?: number, max?: number): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Must be a valid number' }
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, error: `Must be at least ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, error: `Must be at most ${max}` }
  }
  
  return { isValid: true }
}

export function validatePrice(price: string | number): ValidationResult {
  const num = typeof price === 'string' ? parseFloat(price) : price
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Price must be a valid number' }
  }
  
  if (num < 1) {
    return { isValid: false, error: 'Price must be at least 1 KES' }
  }
  
  if (!Number.isInteger(num)) {
    return { isValid: false, error: 'Price must be a whole number' }
  }
  
  return { isValid: true }
}

export function validateStock(stock: string | number): ValidationResult {
  const result = validateNumber(stock, 0)
  if (!result.isValid) {
    return { isValid: false, error: 'Stock must be 0 or greater' }
  }
  
  const num = typeof stock === 'string' ? parseFloat(stock) : stock
  if (!Number.isInteger(num)) {
    return { isValid: false, error: 'Stock must be a whole number' }
  }
  
  return { isValid: true }
}

export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    error.message.includes('Failed to fetch')
  )
}

export const mpesaErrorMessages: Record<string, string> = {
  'INS': 'Insufficient funds. Please check your M-Pesa balance and try again.',
  'PB': 'Your payment request has been rejected. Please try again.',
  'MF': 'M-Pesa service is temporarily unavailable. Please try again later.',
  'RT': 'The transaction was rejected. Please contact M-Pesa or try again.',
  'DC': 'Your account is not enabled for M-Pesa. Please register for M-Pesa.',
  'BC': 'Business not registered. Please contact customer care.',
  'LO': 'Transaction limit exceeded. Please try with a smaller amount.',
  'WL': 'Too many requests. Please wait and try again.',
  'WS': 'Service not available. Please try again later.',
  'CM': 'Invalid phone number format. Please check and try again.',
  'TIMEOUT': 'The request timed out. Please try again.',
  'CANCEL': 'Payment was cancelled.',
  '2001': 'Wrong PIN entered. Please try again with the correct M-Pesa PIN.',
  '1032': 'Payment cancelled by user.',
  '1': 'Insufficient balance. Please top up your M-Pesa account.',
  '17': 'Wrong PIN entered too many times. Please try again later.',
  '26': 'System busy. Please try again in a moment.',
}

const mpesaResultCodeMessages: Record<number, string> = {
  0: 'Payment successful',
  1: 'Insufficient balance. Please top up your M-Pesa account.',
  2: 'Invalid MSISDN. Please check your phone number.',
  3: 'Invalid amount. Please try again.',
  4: 'Invalid reference. Please try again.',
  5: 'Invalid callback URL. Contact support.',
  17: 'Wrong PIN entered too many times. Please try again later.',
  26: 'System busy. Please try again in a moment.',
  1032: 'Payment cancelled by user.',
  1037: 'Session timeout. Please try again.',
  2001: 'Wrong PIN entered. Please try again with the correct M-Pesa PIN.',
  2002: 'Invalid request. Please try again.',
  2010: 'M-Pesa account blocked. Please contact Safaricom.',
  9999: 'System error. Please try again later.',
}

export function getMpesaErrorMessage(errorCode: string): string {
  if (mpesaErrorMessages[errorCode]) {
    return mpesaErrorMessages[errorCode]
  }
  const numericCode = parseInt(errorCode, 10)
  if (!isNaN(numericCode) && mpesaResultCodeMessages[numericCode]) {
    return mpesaResultCodeMessages[numericCode]
  }
  return 'Payment failed. Please try again or contact support.'
}
