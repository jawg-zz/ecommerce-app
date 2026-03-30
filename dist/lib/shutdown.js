"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerShutdownHandlers = registerShutdownHandlers;
const prisma_1 = require("./prisma");
const redis_1 = require("./redis");
const logger_1 = require("./logger");
let isShuttingDown = false;
function registerShutdownHandlers() {
    const shutdown = async (signal) => {
        if (isShuttingDown)
            return;
        isShuttingDown = true;
        (0, logger_1.logInfo)(`Received ${signal}, starting graceful shutdown`);
        try {
            await prisma_1.prisma.$disconnect();
            (0, logger_1.logInfo)('Database connections closed');
        }
        catch (error) {
            (0, logger_1.logError)('Error closing database connections', { error: String(error) });
        }
        try {
            await redis_1.redis.quit();
            (0, logger_1.logInfo)('Redis connections closed');
        }
        catch (error) {
            (0, logger_1.logError)('Error closing Redis connections', { error: String(error) });
        }
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
