"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.createToken = createToken;
exports.verifyToken = verifyToken;
exports.getCurrentUser = getCurrentUser;
exports.setAuthCookie = setAuthCookie;
exports.removeAuthCookie = removeAuthCookie;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const headers_1 = require("next/headers");
const prisma_1 = require("./prisma");
const env_1 = require("./env");
const JWT_SECRET = (0, env_1.requireEnv)('JWT_SECRET');
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
async function verifyPassword(password, hashedPassword) {
    return bcryptjs_1.default.compare(password, hashedPassword);
}
function createToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
async function getCurrentUser() {
    const cookieStore = await (0, headers_1.cookies)();
    const token = cookieStore.get('__Host-auth-token')?.value;
    if (!token)
        return null;
    const payload = verifyToken(token);
    if (!payload)
        return null;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
        },
    });
    return user;
}
async function setAuthCookie(token) {
    const c = await (0, headers_1.cookies)();
    c.set('__Host-auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });
}
async function removeAuthCookie() {
    const c = await (0, headers_1.cookies)();
    c.set('__Host-auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
        expires: new Date(0),
    });
}
