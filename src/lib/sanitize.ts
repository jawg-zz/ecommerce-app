import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Create a DOMPurify instance for server-side use
const window = new JSDOM('').window
const purify = DOMPurify(window as unknown as Window)

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Sanitize plain text (strip all HTML)
 */
export function sanitizeText(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}
