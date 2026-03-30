# Code Review - E-Commerce App
**Date:** 2026-03-30  
**Reviewer:** Max

---

## 🔴 Critical Issues

### 1. M-Pesa Callback Has No Authentication (CRITICAL)
**File:** `src/app/api/mpesa/callback/route.ts`  
**Severity:** Critical  
**Risk:** Anyone can send fake payment confirmations

**Problem:**
```typescript
export async function POST(request: NextRequest) {
  // No authentication check - accepts any POST request
  const body = await request.json()
```

**Impact:** Attackers can mark orders as PAID without actual payment, leading to:
- Free products for attackers
- Stock depletion without revenue
- Financial loss

**Fix:** Implement one of:
1. M-Pesa IP whitelist (Safaricom IPs only)
2. Signature verification (if Safaricom provides it)
3. Callback secret token validation

---

### 2. Checkout Endpoint Missing Rate Limiting (CRITICAL)
**File:** `src/app/api/checkout/route.ts`  
**Severity:** Critical  
**Risk:** Payment spam, M-Pesa API abuse

**Problem:**
```typescript
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  // No rate limiting check
```

**Impact:**
- Users can spam M-Pesa STK push requests
- M-Pesa API rate limits could block legitimate users
- Potential account suspension by Safaricom

**Fix:**
```typescript
import { checkoutRateLimiter } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { success } = await checkoutRateLimiter.limit(user.id)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please wait.' },
      { status: 429 }
    )
  }
  // ... rest of checkout logic
}
```

---

### 3. Race Condition in Stock Management (HIGH)
**File:** `src/app/api/checkout/route.ts` (lines 40-48)  
**Severity:** High  
**Risk:** Overselling products

**Problem:**
```typescript
const order = await prisma.$transaction(async (tx) => {
  for (const item of cart.items) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
    })
    
    if (!product || product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${item.product.name}`)
    }
  }
  // Stock is NOT decremented here - only checked
```

**Issue:** Between stock check and payment confirmation, multiple users can pass the check for the same last item.

**Current Flow:**
1. User A checks stock (5 available) ✓
2. User B checks stock (5 available) ✓
3. User A pays → stock becomes 0
4. User B pays → stock becomes -5 (oversold!)

**Fix:** Reserve stock immediately in checkout:
```typescript
const order = await prisma.$transaction(async (tx) => {
  for (const item of cart.items) {
    const product = await tx.product.update({
      where: { 
        id: item.productId,
        stock: { gte: item.quantity } // Atomic check-and-decrement
      },
      data: { stock: { decrement: item.quantity } }
    })
    
    if (!product) {
      throw new Error(`Insufficient stock for ${item.product.name}`)
    }
  }
  // Create order with PENDING status
})

// If payment fails, restore stock in callback
```

---

### 4. Cart Operations Missing Stock Validation (HIGH)
**File:** `src/app/api/cart/route.ts`  
**Severity:** High  
**Risk:** Users can add out-of-stock items to cart

**Problem:**
```typescript
export async function POST(request: NextRequest) {
  const { productId, quantity } = addToCartSchema.parse(body)
  await addToCart(user.id, productId, quantity) // No stock check
```

**Impact:**
- Users add 100 items when only 5 exist
- Checkout fails with confusing error
- Poor user experience

**Fix:**
```typescript
export async function POST(request: NextRequest) {
  const { productId, quantity } = addToCartSchema.parse(body)
  
  // Check stock before adding
  const product = await prisma.product.findUnique({
    where: { id: productId }
  })
  
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
  
  if (product.stock < quantity) {
    return NextResponse.json(
      { error: `Only ${product.stock} items available` },
      { status: 400 }
    )
  }
  
  await addToCart(user.id, productId, quantity)
  const cart = await getCart(user.id)
  return NextResponse.json(cart)
}
```

---

## 🟡 High Priority Issues

### 5. Redis Connection Not Initialized (HIGH)
**File:** `src/lib/redis.ts`  
**Severity:** High  
**Risk:** App crashes on first Redis operation

**Problem:**
```typescript
export const redis = globalForRedis.redis ?? createRedis()
// lazyConnect: true means connection happens on first operation
// If Redis is down, first cart operation will crash
```

**Fix:** Initialize connection in `instrumentation.ts`:
```typescript
// instrumentation.ts
import { redis } from './lib/redis'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await redis.connect()
  }
}
```

---

### 6. No Timeout on M-Pesa API Calls (HIGH)
**File:** `src/lib/mpesa.ts`  
**Severity:** High  
**Risk:** Hanging requests exhaust server resources

**Current:** 30-second timeout in `fetchWithRetry` (line 103)  
**Problem:** 30s × 3 retries = 90 seconds max per request

**Fix:** Reduce timeout and retries:
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s instead of 30s
```

---

### 7. Inconsistent Error Logging (MEDIUM)
**Files:** Multiple API routes  
**Severity:** Medium  
**Risk:** Hard to debug production issues

**Problem:**
- 23 `console.log`/`console.error` statements
- Some routes use `logError()`, others use `console.error()`
- No request IDs for tracing

**Fix:** Standardize on Winston logger everywhere:
```typescript
// Replace all console.error with logError
import { logError, logInfo } from '@/lib/logger'

// Add request ID middleware
```

---

### 8. Missing Input Sanitization (MEDIUM)
**Files:** Product admin routes  
**Severity:** Medium  
**Risk:** XSS attacks via product descriptions

**Problem:**
```typescript
// Product description is stored and displayed without sanitization
const product = await prisma.product.create({
  data: { description: body.description } // Could contain <script> tags
})
```

**Fix:** Already have `dompurify` installed - use it:
```typescript
import DOMPurify from 'isomorphic-dompurify'

const productSchema = z.object({
  description: z.string().optional().transform(val => 
    val ? DOMPurify.sanitize(val) : val
  ),
})
```

---

### 9. Admin Routes Missing Audit Logging (MEDIUM)
**Files:** `src/app/api/admin/products/[id]/route.ts`  
**Severity:** Medium  
**Risk:** No audit trail for admin actions

**Problem:**
```typescript
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } })
  // No log of who deleted what
}
```

**Fix:**
```typescript
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  
  await prisma.product.delete({ where: { id: params.id } })
  
  logInfo('Admin deleted product', {
    adminId: user.id,
    adminEmail: user.email,
    productId: params.id,
    productName: product?.name
  })
  
  return NextResponse.json({ success: true })
}
```

---

## 🟢 Medium Priority Issues

### 10. No Pagination Limit Enforcement (MEDIUM)
**File:** `src/app/api/admin/products/route.ts`  
**Severity:** Medium  
**Risk:** Users can request unlimited records

**Problem:**
```typescript
const limit = parseInt(searchParams.get('limit') || '20')
// No max limit - user can request limit=999999
```

**Fix:**
```typescript
const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
```

---

### 11. Weak Password Requirements (MEDIUM)
**File:** `src/app/api/auth/register/route.ts`  
**Severity:** Medium  
**Risk:** Weak passwords compromise accounts

**Problem:**
```typescript
const registerSchema = z.object({
  password: z.string().min(6), // Only 6 chars, no complexity
})
```

**Fix:**
```typescript
const registerSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
})
```

---

### 12. No Email Verification (LOW)
**File:** `src/app/api/auth/register/route.ts`  
**Severity:** Low  
**Risk:** Fake accounts, spam

**Current:** Users can register with any email without verification

**Fix:** Add email verification flow (future enhancement)

---

## 📊 Summary

| Severity | Count | Issues |
|----------|-------|--------|
| Critical | 2 | M-Pesa callback auth, checkout rate limiting |
| High | 5 | Stock race condition, cart validation, Redis init, M-Pesa timeout, logging |
| Medium | 5 | Input sanitization, audit logging, pagination, passwords, email verification |
| **Total** | **12** | |

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Fixes (Today)
1. ✅ Add M-Pesa callback authentication (IP whitelist or secret token)
2. ✅ Add rate limiting to checkout endpoint
3. ✅ Fix stock reservation race condition
4. ✅ Add stock validation to cart operations

### Phase 2: High Priority (This Week)
5. Initialize Redis connection properly
6. Reduce M-Pesa timeout values
7. Standardize error logging

### Phase 3: Medium Priority (Next Week)
8. Add input sanitization for product descriptions
9. Add admin audit logging
10. Enforce pagination limits
11. Strengthen password requirements

---

## ✅ What's Already Good

- ✅ Database indexes properly configured
- ✅ Rate limiting implemented for auth endpoints
- ✅ JWT authentication with HTTP-only cookies
- ✅ Input validation with Zod schemas
- ✅ Transactions for atomic operations
- ✅ Winston logger infrastructure in place
- ✅ Environment variable validation
- ✅ Graceful shutdown handling
- ✅ Health check endpoint exists

---

**Next Steps:** Address Phase 1 critical issues before production deployment.
