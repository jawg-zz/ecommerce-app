"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cleanup_stale_orders_1 = require("./lib/cron/cleanup-stale-orders");
const redis_1 = require("./lib/redis");
const logger_1 = require("./lib/logger");
const shutdown_1 = require("./lib/shutdown");
(0, shutdown_1.registerShutdownHandlers)();
const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
async function runCronJobs() {
    (0, logger_1.logInfo)(`Cron service started. Running cleanup every ${INTERVAL_MS / 1000 / 60} minutes`);
    await runCleanupJob();
    setInterval(async () => {
        await runCleanupJob();
    }, INTERVAL_MS);
}
async function runCleanupJob() {
    const jobName = 'cleanup-stale-orders';
    await redis_1.redis.set(`cron:status:${jobName}`, 'running', 'EX', 300);
    const startTime = Date.now();
    try {
        const ordersCleaned = await (0, cleanup_stale_orders_1.cleanupStaleOrders)();
        const duration = Date.now() - startTime;
        const now = new Date().toISOString();
        await redis_1.redis.set(`cron:last_run:${jobName}`, now);
        await redis_1.redis.set(`cron:result:${jobName}`, JSON.stringify({ success: true, ordersCleaned, duration }));
        const historyEntry = {
            jobName,
            status: 'success',
            ordersCleaned,
            duration,
            timestamp: now,
        };
        await redis_1.redis.lpush('cron:history:cleanup-stale-orders', JSON.stringify(historyEntry));
        await redis_1.redis.ltrim('cron:history:cleanup-stale-orders', 0, 49);
        (0, logger_1.logInfo)(`[Cron] ${jobName} completed: ${ordersCleaned} orders cleaned in ${duration}ms`);
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const now = new Date().toISOString();
        await redis_1.redis.set(`cron:last_run:${jobName}`, now);
        await redis_1.redis.set(`cron:result:${jobName}`, JSON.stringify({ success: false, error: String(error) }));
        const historyEntry = {
            jobName,
            status: 'failure',
            error: String(error),
            timestamp: now,
        };
        await redis_1.redis.lpush('cron:history:cleanup-stale-orders', JSON.stringify(historyEntry));
        await redis_1.redis.ltrim('cron:history:cleanup-stale-orders', 0, 49);
        (0, logger_1.logError)(`[Cron] ${jobName} failed`, { error: String(error) });
    }
    finally {
        await redis_1.redis.set(`cron:status:${jobName}`, 'idle');
    }
}
runCronJobs();
