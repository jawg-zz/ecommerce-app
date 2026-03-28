/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Email validation
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }
  
  return { isValid: true }
}

/**
 * Password validation
 */
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

/**
 * Phone number validation (Kenyan format)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  const cleaned = phone.replace(/\D/g, '')
  
  // 0712345678 format
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return { isValid: true }
  }
  
  // 254712345678 format
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return { isValid: true }
  }
  
  // 712345678 format
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    return { isValid: true }
  }
  
  return { isValid: false, error: 'Invalid phone number format (use 0712345678 or 254712345678)' }
}

/**
 * Required field validation
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` }
  }
  return { isValid: true }
}

/**
 * Number validation
 */
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

/**
 * Price validation
 */
export function validatePrice(price: string | number): ValidationResult {
  const result = validateNumber(price, 0.01)
  if (!result.isValid) {
    return { isValid: false, error: 'Price must be greater than 0' }
  }
  return { isValid: true }
}

/**
 * Stock validation
 */
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
