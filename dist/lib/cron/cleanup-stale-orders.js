"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStaleOrders = cleanupStaleOrders;
const prisma_1 = require("../prisma");
const logger_1 = require("../logger");
const TIMEOUT_MINUTES = 15;
async function cleanupStaleOrders() {
    const cutoffTime = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);
    (0, logger_1.logInfo)(`Checking for stale orders older than ${TIMEOUT_MINUTES} minutes`);
    try {
        const staleOrders = await prisma_1.prisma.order.findMany({
            where: {
                status: 'PENDING',
                createdAt: { lt: cutoffTime },
            },
            include: { items: true },
        });
        if (staleOrders.length === 0) {
            (0, logger_1.logInfo)('No stale orders found');
            return 0;
        }
        (0, logger_1.logInfo)(`Found ${staleOrders.length} stale orders to cancel`);
        for (const order of staleOrders) {
            await prisma_1.prisma.order.update({
                where: { id: order.id },
                data: { status: 'CANCELLED' },
            });
            (0, logger_1.logInfo)(`Cancelled order ${order.id}`, { createdAt: order.createdAt });
        }
        (0, logger_1.logInfo)(`Successfully cleaned up ${staleOrders.length} stale orders`);
        return staleOrders.length;
    }
    catch (error) {
        (0, logger_1.logError)('Error cleaning up stale orders', { error: String(error) });
        throw error;
    }
}
