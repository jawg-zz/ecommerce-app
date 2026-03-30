"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.getValidatedEnv = getValidatedEnv;
exports.requireEnv = requireEnv;
const zod_1 = require("zod");
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
const requiredForProduction = isBuildTime ? zod_1.z.string().optional() : zod_1.z.string().min(1, 'Required');
const envSchema = zod_1.z.object({
    JWT_SECRET: requiredForProduction,
    DATABASE_URL: requiredForProduction,
    REDIS_HOST: requiredForProduction,
    REDIS_PORT: zod_1.z.string().default('6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    MPESA_ENV: zod_1.z.enum(['sandbox', 'production']).default('sandbox'),
    MPESA_CONSUMER_KEY: zod_1.z.string().optional(),
    MPESA_CONSUMER_SECRET: zod_1.z.string().optional(),
    MPESA_SHORTCODE: zod_1.z.string().optional(),
    MPESA_PASSKEY: zod_1.z.string().optional(),
    MPESA_CALLBACK_URL: zod_1.z.string().optional(),
    MPESA_CALLBACK_SECRET: zod_1.z.string().optional(),
    MPESA_IP_WHITELIST: zod_1.z.string().optional(),
    CRON_SECRET: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
let validatedEnv = null;
let validationAttempted = false;
let validationError = null;
function validateEnv() {
    if (validationError) {
        throw validationError;
    }
    if (validatedEnv) {
        return validatedEnv;
    }
    if (validationAttempted && !validatedEnv) {
        throw new Error('Environment validation already attempted and failed');
    }
    validationAttempted = true;
    try {
        const result = envSchema.safeParse(process.env);
        if (!result.success) {
            const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            validationError = new Error(`Environment validation failed: ${errors}`);
            throw validationError;
        }
        const data = result.data;
        if (data.MPESA_ENV === 'production') {
            const missingMpesaVars = [];
            if (!data.MPESA_CONSUMER_KEY)
                missingMpesaVars.push('MPESA_CONSUMER_KEY');
            if (!data.MPESA_CONSUMER_SECRET)
                missingMpesaVars.push('MPESA_CONSUMER_SECRET');
            if (!data.MPESA_SHORTCODE)
                missingMpesaVars.push('MPESA_SHORTCODE');
            if (!data.MPESA_PASSKEY)
                missingMpesaVars.push('MPESA_PASSKEY');
            if (!data.MPESA_CALLBACK_URL)
                missingMpesaVars.push('MPESA_CALLBACK_URL');
            if (missingMpesaVars.length > 0) {
                validationError = new Error(`MPESA_ENV is production but missing required variables: ${missingMpesaVars.join(', ')}`);
                throw validationError;
            }
        }
        validatedEnv = data;
        return validatedEnv;
    }
    catch (error) {
        validationError = error instanceof Error ? error : new Error(String(error));
        throw validationError;
    }
}
function getValidatedEnv() {
    return validateEnv();
}
exports.env = {
    get JWT_SECRET() {
        return validateEnv().JWT_SECRET;
    },
    get DATABASE_URL() {
        return validateEnv().DATABASE_URL;
    },
    get REDIS_HOST() {
        return validateEnv().REDIS_HOST;
    },
    get REDIS_PORT() {
        return validateEnv().REDIS_PORT;
    },
    get REDIS_PASSWORD() {
        return validateEnv().REDIS_PASSWORD;
    },
    get MPESA_ENV() {
        return validateEnv().MPESA_ENV;
    },
    get MPESA_CONSUMER_KEY() {
        return validateEnv().MPESA_CONSUMER_KEY;
    },
    get MPESA_CONSUMER_SECRET() {
        return validateEnv().MPESA_CONSUMER_SECRET;
    },
    get MPESA_SHORTCODE() {
        return validateEnv().MPESA_SHORTCODE;
    },
    get MPESA_PASSKEY() {
        return validateEnv().MPESA_PASSKEY;
    },
    get MPESA_CALLBACK_URL() {
        return validateEnv().MPESA_CALLBACK_URL;
    },
    get MPESA_CALLBACK_SECRET() {
        return validateEnv().MPESA_CALLBACK_SECRET;
    },
    get MPESA_IP_WHITELIST() {
        return validateEnv().MPESA_IP_WHITELIST;
    },
    get CRON_SECRET() {
        return validateEnv().CRON_SECRET;
    },
    get NODE_ENV() {
        return validateEnv().NODE_ENV;
    },
    get LOG_LEVEL() {
        return validateEnv().LOG_LEVEL;
    },
};
function requireEnv(name) {
    const value = exports.env[name];
    if (!value) {
        throw new Error(`${String(name)} environment variable is required`);
    }
    return value;
}
