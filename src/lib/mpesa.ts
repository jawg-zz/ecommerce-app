/**
 * M-Pesa Daraja API Integration
 * Docs: https://developer.safaricom.co.ke/Documentation
 */

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

const MPESA_BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

/**
 * Get OAuth access token
 */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64')

  const response = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token')
  }

  const data: AccessTokenResponse = await response.json()
  return data.access_token
}

/**
 * Generate password for STK Push
 */
function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64')
  return { password, timestamp }
}

/**
 * Initiate STK Push (customer payment prompt)
 */
export async function initiateSTKPush(
  phoneNumber: string,
  amount: number,
  reference: string
): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
  const accessToken = await getAccessToken()
  const { password, timestamp } = generatePassword()

  // Ensure phone number is in 254XXXXXXXXX format
  const formattedPhone = phoneNumber.startsWith('254')
    ? phoneNumber
    : phoneNumber.startsWith('0')
    ? `254${phoneNumber.slice(1)}`
    : `254${phoneNumber}`

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: reference,
    TransactionDesc: `Payment for order ${reference}`,
  }

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`M-Pesa STK Push failed: ${error}`)
  }

  const data: STKPushResponse = await response.json()

  if (data.ResponseCode !== '0') {
    throw new Error(data.ResponseDescription || 'STK Push failed')
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
  }
}

/**
 * Query STK Push status
 */
export async function querySTKStatus(checkoutRequestId: string): Promise<{
  status: 'pending' | 'success' | 'failed'
  resultCode?: string
  resultDesc?: string
}> {
  const accessToken = await getAccessToken()
  const { password, timestamp } = generatePassword()

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  }

  const response = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to query M-Pesa status')
  }

  const data: STKQueryResponse = await response.json()

  // ResultCode: 0 = success, 1032 = cancelled, others = failed
  if (data.ResultCode === '0') {
    return { status: 'success', resultCode: data.ResultCode, resultDesc: data.ResultDesc }
  } else if (data.ResultCode === '1032') {
    return { status: 'failed', resultCode: data.ResultCode, resultDesc: 'Payment cancelled by user' }
  } else if (data.ResponseCode === '0' && !data.ResultCode) {
    return { status: 'pending' }
  } else {
    return { status: 'failed', resultCode: data.ResultCode, resultDesc: data.ResultDesc }
  }
}
