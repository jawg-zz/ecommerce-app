"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStartup = validateStartup;
const prisma_1 = require("./prisma");
const redis_1 = require("./redis");
const logger_1 = require("./logger");
const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
    'NODE_ENV',
];
async function validateStartup() {
    (0, logger_1.logInfo)('Starting startup validation...');
    // 1. Check required environment variables
    const missingVars = REQUIRED_ENV_VARS.filter((varName) => !process.env[varName]);
    if (missingVars.length > 0) {
        (0, logger_1.logError)('Missing required environment variables', { missing: missingVars });
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    (0, logger_1.logInfo)('✓ All required environment variables are set');
    // 2. Test database connection
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        (0, logger_1.logInfo)('✓ Database connection successful');
    }
    catch (error) {
        (0, logger_1.logError)('Database connection failed', { error: String(error) });
        throw new Error(`Database connection failed: ${error}`);
    }
    // 3. Test Redis connection
    try {
        await redis_1.redis.connect();
        await redis_1.redis.ping();
        (0, logger_1.logInfo)('✓ Redis connection successful');
    }
    catch (error) {
        (0, logger_1.logError)('Redis connection failed', { error: String(error) });
        throw new Error(`Redis connection failed: ${error}`);
    }
    (0, logger_1.logInfo)('✓ Startup validation completed successfully');
}
