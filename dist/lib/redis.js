"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.connectRedis = connectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const globalForRedis = globalThis;
function createRedis() {
    const redisInstance = new ioredis_1.default({
        host: env_1.env.REDIS_HOST || 'localhost',
        port: parseInt(env_1.env.REDIS_PORT || '6379'),
        password: env_1.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
            if (times > 3)
                return null;
            return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
    });
    redisInstance.on('error', (err) => {
        console.error('[Redis] Connection error:', err);
    });
    redisInstance.on('connect', () => {
        console.log('[Redis] Connected');
    });
    redisInstance.on('ready', () => {
        console.log('[Redis] Ready');
    });
    return redisInstance;
}
exports.redis = globalForRedis.redis ?? createRedis();
if (process.env.NODE_ENV !== 'production')
    globalForRedis.redis = exports.redis;
async function connectRedis() {
    if (exports.redis.status === 'wait') {
        await exports.redis.connect();
    }
}
