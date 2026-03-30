"use strict";
/**
 * M-Pesa Daraja API Integration
 * Docs: https://developer.safaricom.co.ke/Documentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateSTKPush = initiateSTKPush;
exports.querySTKStatus = querySTKStatus;
exports.validateCallback = validateCallback;
exports.parseCallback = parseCallback;
exports.isSuccessfulCallback = isSuccessfulCallback;
const env_1 = require("./env");
const MPESA_BASE_URL = env_1.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
const TOKEN_BUFFER_MS = 5 * 60 * 1000;
let tokenCache = null;
function validateEnvVars() {
    const validated = (0, env_1.getValidatedEnv)();
    if (!validated.MPESA_CONSUMER_KEY || !validated.MPESA_CONSUMER_SECRET ||
        !validated.MPESA_SHORTCODE || !validated.MPESA_PASSKEY || !validated.MPESA_CALLBACK_URL) {
        throw new Error('Missing required M-Pesa environment variables');
    }
}
function sanitizeForLog(obj) {
    const sensitive = ['Password', 'access_token', 'Authorization', 'password', 'Passkey'];
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (sensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
            sanitized[key] = '***REDACTED***';
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeForLog(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
function logRequest(endpoint, payload) {
    console.log(`[M-Pesa] REQUEST: ${endpoint}`, JSON.stringify(sanitizeForLog(payload)));
}
function logResponse(endpoint, status, data) {
    console.log(`[M-Pesa] RESPONSE: ${endpoint} [${status}]`, JSON.stringify(sanitizeForLog(data)));
}
function logError(endpoint, error) {
    console.error(`[M-Pesa] ERROR: ${endpoint}`, error);
}
const retryableStatuses = [408, 429, 500, 502, 503, 504];
async function fetchWithRetry(url, options, maxRetries = 3, baseDelay = 1000) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const status = response.status;
                if (status >= 400 && status < 500) {
                    const errorText = await response.text();
                    throw new Error(`Client error (${status}): ${errorText}`);
                }
                if (!retryableStatuses.includes(status)) {
                    throw new Error(`Server error (${status})`);
                }
                throw new Error(`Retryable error (${status})`);
            }
            return await response.json();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`[M-Pesa] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}
function getAccessTokenFromCache() {
    if (!tokenCache)
        return null;
    if (Date.now() >= tokenCache.expiresAt - TOKEN_BUFFER_MS) {
        tokenCache = null;
        return null;
    }
    return tokenCache.token;
}
function setAccessTokenCache(token, expiresIn) {
    const expiresInMs = parseInt(expiresIn, 10) * 1000;
    tokenCache = {
        token,
        expiresAt: Date.now() + expiresInMs,
    };
}
async function getAccessToken() {
    validateEnvVars();
    const cachedToken = getAccessTokenFromCache();
    if (cachedToken) {
        return cachedToken;
    }
    const auth = Buffer.from(`${env_1.env.MPESA_CONSUMER_KEY}:${env_1.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const endpoint = `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
    logRequest(endpoint, { grant_type: 'client_credentials' });
    try {
        const response = await fetchWithRetry(endpoint, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        logResponse(endpoint, 200, response);
        setAccessTokenCache(response.access_token, response.expires_in);
        return response.access_token;
    }
    catch (error) {
        logError('getAccessToken', error);
        throw new Error('Failed to get M-Pesa access token');
    }
}
function generatePassword() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${env_1.env.MPESA_SHORTCODE}${env_1.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
    return { password, timestamp };
}
async function initiateSTKPush(phoneNumber, amount, reference) {
    validateEnvVars();
    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();
    const formattedPhone = phoneNumber.startsWith('254')
        ? phoneNumber
        : phoneNumber.startsWith('0')
            ? `254${phoneNumber.slice(1)}`
            : `254${phoneNumber}`;
    const payload = {
        BusinessShortCode: env_1.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: env_1.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: env_1.env.MPESA_CALLBACK_URL,
        AccountReference: reference,
        TransactionDesc: `Payment for order ${reference}`,
    };
    const endpoint = `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`;
    logRequest(endpoint, payload);
    try {
        const response = await fetchWithRetry(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        logResponse(endpoint, 200, response);
        if (response.ResponseCode !== '0') {
            throw new Error(`${response.ResponseDescription} (Code: ${response.ResponseCode})`);
        }
        return {
            checkoutRequestId: response.CheckoutRequestID,
            merchantRequestId: response.MerchantRequestID,
        };
    }
    catch (error) {
        logError('initiateSTKPush', error);
        if (error instanceof Error && !error.message.includes('M-Pesa')) {
            throw new Error(`M-Pesa STK Push failed: ${error.message}`);
        }
        throw error;
    }
}
async function querySTKStatus(checkoutRequestId) {
    validateEnvVars();
    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();
    const payload = {
        BusinessShortCode: env_1.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
    };
    const endpoint = `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`;
    logRequest(endpoint, payload);
    try {
        const response = await fetchWithRetry(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        logResponse(endpoint, 200, response);
        if (response.ResultCode === '0') {
            return { status: 'success', resultCode: response.ResultCode, resultDesc: response.ResultDesc };
        }
        else if (response.ResultCode === '1032') {
            return { status: 'failed', resultCode: response.ResultCode, resultDesc: 'Payment cancelled by user' };
        }
        else if (response.ResponseCode === '0' && !response.ResultCode) {
            return { status: 'pending' };
        }
        else {
            return { status: 'failed', resultCode: response.ResultCode, resultDesc: response.ResultDesc };
        }
    }
    catch (error) {
        logError('querySTKStatus', error);
        throw new Error('Failed to query M-Pesa status');
    }
}
function validateCallback(callback) {
    if (!callback || typeof callback !== 'object') {
        return { valid: false, error: 'Invalid callback: not an object' };
    }
    const cb = callback;
    if (!cb.Body?.stkCallback) {
        return { valid: false, error: 'Invalid callback: missing stkCallback' };
    }
    const { stkCallback } = cb.Body;
    if (!stkCallback.MerchantRequestID || !stkCallback.CheckoutRequestID) {
        return { valid: false, error: 'Invalid callback: missing request IDs' };
    }
    if (typeof stkCallback.ResultCode !== 'number') {
        return { valid: false, error: 'Invalid callback: missing ResultCode' };
    }
    return { valid: true };
}
function parseCallback(callback) {
    const validation = validateCallback(callback);
    if (!validation.valid) {
        logError('parseCallback', validation.error);
        return null;
    }
    const cb = callback;
    const { stkCallback } = cb.Body;
    let amount;
    let mpesaReceiptNumber;
    let phoneNumber;
    let transactionDate;
    if (stkCallback.CallbackMetadata?.Item) {
        for (const item of stkCallback.CallbackMetadata.Item) {
            switch (item.Name) {
                case 'Amount':
                    amount = typeof item.Value === 'number' ? item.Value : parseFloat(String(item.Value));
                    break;
                case 'MpesaReceiptNumber':
                    mpesaReceiptNumber = String(item.Value);
                    break;
                case 'PhoneNumber':
                    phoneNumber = String(item.Value);
                    break;
                case 'TransactionDate':
                    transactionDate = String(item.Value);
                    break;
            }
        }
    }
    console.log(`[M-Pesa] CALLBACK: MerchantRequestID=${stkCallback.MerchantRequestID}, ResultCode=${stkCallback.ResultCode}`);
    return {
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        amount,
        mpesaReceiptNumber,
        phoneNumber,
        transactionDate,
    };
}
function isSuccessfulCallback(callback) {
    const parsed = parseCallback(callback);
    return parsed?.resultCode === 0;
}
