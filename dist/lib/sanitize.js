'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = sanitizeHtml;
exports.sanitizeText = sanitizeText;
const dompurify_1 = __importDefault(require("dompurify"));
/**
 * Sanitize HTML content to prevent XSS attacks
 * Note: This must be used in client components only
 */
function sanitizeHtml(dirty) {
    if (typeof window === 'undefined') {
        // Server-side: strip all HTML tags as a fallback
        return dirty.replace(/<[^>]*>/g, '');
    }
    return dompurify_1.default.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
    });
}
/**
 * Sanitize plain text (strip all HTML)
 */
function sanitizeText(dirty) {
    if (typeof window === 'undefined') {
        return dirty.replace(/<[^>]*>/g, '');
    }
    return dompurify_1.default.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
}
