/**
 * M-Pesa Daraja API Integration
 * Docs: https://developer.safaricom.co.ke/Documentation
 */

import { env, getValidatedEnv } from './env'
import { redis } from './redis'
import { logInfo, logError } from './logger'

interface AccessTokenResponse {
  access_token: string
  expires_in: string
}

interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface STKQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value: string | number }>
      }
    }
  }
}

interface TokenCache {
  token: string
  expiresAt: number
}

const MPESA_BASE_URL = env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

const TOKEN_BUFFER_MS = 5 * 60 * 1000

let tokenCache: TokenCache | null = null

function validateEnvVars(): void {
  const validated = getValidatedEnv()
  if (!validated.MPESA_CONSUMER_KEY || !validated.MPESA_CONSUMER_SECRET || 
      !validated.MPESA_SHORTCODE || !validated.MPESA_PASSKEY || !validated.MPESA_CALLBACK_URL) {
    throw new Error('Missing required M-Pesa environment variables')
  }
}

function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitive = ['Password', 'access_token', 'Authorization', 'password', 'Passkey']
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

function logRequest(endpoint: string, payload: Record<string, unknown>): void {
  logInfo(`M-Pesa REQUEST: ${endpoint}`, sanitizeForLog(payload))
}

function logResponse(endpoint: string, status: number, data: unknown): void {
  logInfo(`M-Pesa RESPONSE: ${endpoint} [${status}]`, sanitizeForLog(data as Record<string, unknown>))
}

function logMpesaError(endpoint: string, error: unknown): void {
  logError(`M-Pesa ERROR: ${endpoint}`, { error: String(error) })
}

const retryableStatuses = [408, 429, 500, 502, 503, 504]

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const status = response.status
        if (status >= 400 && status < 500) {
          const errorText = await response.text()
          throw new Error(`Client error (${status}): ${errorText}`)
        }
        if (!retryableStatuses.includes(status)) {
          throw new Error(`Server error (${status})`)
        }
        throw new Error(`Retryable error (${status})`)
      }

      return await response.json()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        logInfo(`M-Pesa Retry ${attempt + 1}/${maxRetries} after ${delay}ms`, {})
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

function getAccessTokenFromCache(): string | null {
  if (!tokenCache) return null
  if (Date.now() >= tokenCache.expiresAt - TOKEN_BUFFER_MS) {
    tokenCache = null
    return null
  }
  return tokenCache.token
}

function setAccessTokenCache(token: string, expiresIn: string): void {
  const expiresInMs = parseInt(expiresIn, 10) * 1000
  tokenCache = {
    token,
    expiresAt: Date.now() + expiresInMs,
  }
}

async function getAccessToken(): Promise<string> {
  validateEnvVars()

  const cachedToken = getAccessTokenFromCache()
  if (cachedToken) {
    return cachedToken
  }

  const auth = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const endpoint = `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`
  logRequest(endpoint, { grant_type: 'client_credentials' })

  try {
    const response = await fetchWithRetry<AccessTokenResponse>(
      endpoint,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    )

    logResponse(endpoint, 200, response)
    setAccessTokenCache(response.access_token, response.expires_in)
    return response.access_token
  } catch (error) {
    logError('Failed to get M-Pesa access token', { error: String(error) })
    throw new Error('Failed to get M-Pesa access token')
  }
}

function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
  const password = Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64')
  return { password, timestamp }
}

export async function initiateSTKPush(
  phoneNumber: string,
  amount: number,
  reference: string
): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
  validateEnvVars()

  const idempotencyKey = `stk:${reference}`
  const existingRequest = await redis.get(idempotencyKey)
  if (existingRequest) {
    const parsed = JSON.parse(existingRequest)
    return {
      checkoutRequestId: parsed.checkoutRequestId,
      merchantRequestId: parsed.merchantRequestId,
    }
  }

  const accessToken = await getAccessToken()
  const { password, timestamp } = generatePassword()

  const formattedPhone = phoneNumber.startsWith('254')
    ? phoneNumber
    : phoneNumber.startsWith('0')
    ? `254${phoneNumber.slice(1)}`
    : `254${phoneNumber}`

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: reference,
    TransactionDesc: `Payment for order ${reference}`,
  }

  const endpoint = `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`
  logRequest(endpoint, payload)

  try {
    const response = await fetchWithRetry<STKPushResponse>(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    logResponse(endpoint, 200, response)

    if (response.ResponseCode !== '0') {
      throw new Error(`${response.ResponseDescription} (Code: ${response.ResponseCode})`)
    }

    const result = {
      checkoutRequestId: response.CheckoutRequestID,
      merchantRequestId: response.MerchantRequestID,
    }

    await redis.set(idempotencyKey, JSON.stringify(result), 'EX', 3600)

    return result
  } catch (error) {
    logError('M-Pesa STK Push failed', { error: String(error), reference })
    if (error instanceof Error && !error.message.includes('M-Pesa')) {
      throw new Error(`M-Pesa STK Push failed: ${error.message}`)
    }
    throw error
  }
}

export async function querySTKStatus(checkoutRequestId: string): Promise<{
  status: 'pending' | 'success' | 'failed'
  resultCode?: string
  resultDesc?: string
}> {
  validateEnvVars()

  const accessToken = await getAccessToken()
  const { password, timestamp } = generatePassword()

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const endpoint = `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`
  logRequest(endpoint, payload)

  try {
    const response = await fetchWithRetry<STKQueryResponse>(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    logResponse(endpoint, 200, response)

    // ResultCode '0' = Success
    if (response.ResultCode === '0') {
      return { status: 'success', resultCode: response.ResultCode, resultDesc: response.ResultDesc }
    }
    
    // Known failure codes
    if (['1032', '1037', '2001'].includes(response.ResultCode)) {
      return { 
        status: 'failed', 
        resultCode: response.ResultCode, 
        resultDesc: response.ResultDesc 
      }
    }
    
    // ResultCode '4999' = Still processing (wait for callback)
    if (response.ResultCode === '4999') {
      return { status: 'pending' }
    }
    
    // No ResultCode yet = Still processing
    if (response.ResponseCode === '0' && !response.ResultCode) {
      return { status: 'pending' }
    }
    
    // Any other ResultCode = Failed
    return { status: 'failed', resultCode: response.ResultCode, resultDesc: response.ResultDesc }
  } catch (error) {
    logError('Failed to query M-Pesa status', { error: String(error), checkoutRequestId })
    throw new Error('Failed to query M-Pesa status')
  }
}
