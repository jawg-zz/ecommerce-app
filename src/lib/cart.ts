import { redis } from './redis'
import { prisma } from './prisma'
import { logError } from './logger'

export interface CartItem {
  productId: string
  quantity: number
}

export interface CartWithProducts {
  items: Array<{
    productId: string
    quantity: number
    product: {
      id: string
      name: string
      price: number
      image: string | null
      stock: number
    }
  }>
  total: number
}

async function buildCartWithProducts(items: CartItem[]): Promise<CartWithProducts> {
  if (items.length === 0) {
    return { items: [], total: 0 }
  }

  const productIds = items.map(item => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  })

  const productMap = new Map(products.map(p => [p.id, p]))

  let total = 0
  const cartItems = items
    .map(item => {
      const product = productMap.get(item.productId)
      if (!product) return null
      const price = Number(product.price)
      total += price * item.quantity
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          price,
          image: product.image,
          stock: product.stock,
        },
      }
    })
    .filter(Boolean) as CartWithProducts['items']

  return { items: cartItems, total }
}

function getCartKey(userId: string): string {
  return `cart:${userId}`
}

export async function getCart(userId: string): Promise<CartWithProducts> {
  const key = getCartKey(userId)
  const cartData = await redis.get(key)

  if (!cartData) {
    return { items: [], total: 0 }
  }

  let items: CartItem[]
  try {
    const parsed = JSON.parse(cartData)
    items = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logError('Failed to parse cart data', { error: String(error) })
    await redis.del(key)
    return { items: [], total: 0 }
  }

  return buildCartWithProducts(items)
}

const CART_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
const MAX_CART_ITEMS = 100
const MAX_QUANTITY_PER_ITEM = 99

const ADD_TO_CART_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local quantity = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local maxItems = tonumber(ARGV[4])
local maxQuantity = tonumber(ARGV[5])

local cartData = redis.call('GET', key)
local items = {}

if cartData then
  items = cjson.decode(cartData)
end

local found = false
local currentTotalItems = 0
for i, item in ipairs(items) do
  currentTotalItems = currentTotalItems + item.quantity
  if item.productId == productId then
    local newQty = item.quantity + quantity
    if newQty > maxQuantity then
      return 'QUANTITY_EXCEEDS_MAX'
    end
    item.quantity = newQty
    found = true
    break
  end
end

if not found then
  if #items >= maxItems then
    return 'CART_FULL'
  end
  table.insert(items, {productId = productId, quantity = quantity})
end

redis.call('SET', key, cjson.encode(items))
redis.call('EXPIRE', key, ttl)
return 'OK'
`

export async function addToCart(userId: string, productId: string, quantity: number = 1): Promise<void> {
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw new Error(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`)
  }
  
  const key = getCartKey(userId)
  const result = await redis.eval(ADD_TO_CART_SCRIPT, 1, key, productId, quantity, CART_TTL_SECONDS, MAX_CART_ITEMS, MAX_QUANTITY_PER_ITEM)
  
  if (result === 'CART_FULL') {
    throw new Error(`Cart cannot exceed ${MAX_CART_ITEMS} items`)
  }
  if (result === 'QUANTITY_EXCEEDS_MAX') {
    throw new Error(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`)
  }
}

const UPDATE_CART_ITEM_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local quantity = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local maxQuantity = tonumber(ARGV[4])

local cartData = redis.call('GET', key)
if not cartData then
  return 'NOT_FOUND'
end

local items = cjson.decode(cartData)

if quantity > maxQuantity then
  return 'QUANTITY_EXCEEDS_MAX'
end

if quantity <= 0 then
  local newItems = {}
  for i, item in ipairs(items) do
    if item.productId ~= productId then
      table.insert(newItems, item)
    end
  end
  items = newItems
else
  for i, item in ipairs(items) do
    if item.productId == productId then
      item.quantity = quantity
      break
    end
  end
end

redis.call('SET', key, cjson.encode(items))
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end
return 'OK'
`

export async function updateCartItem(userId: string, productId: string, quantity: number): Promise<void> {
  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw new Error(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`)
  }
  
  const key = getCartKey(userId)
  const result = await redis.eval(UPDATE_CART_ITEM_SCRIPT, 1, key, productId, quantity, CART_TTL_SECONDS, MAX_QUANTITY_PER_ITEM)
  
  if (result === 'QUANTITY_EXCEEDS_MAX') {
    throw new Error(`Maximum quantity per item is ${MAX_QUANTITY_PER_ITEM}`)
  }
}

const REMOVE_FROM_CART_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local ttl = tonumber(ARGV[2])

local cartData = redis.call('GET', key)
if not cartData then
  return 'NOT_FOUND'
end

local items = cjson.decode(cartData)
local newItems = {}

for i, item in ipairs(items) do
  if item.productId ~= productId then
    table.insert(newItems, item)
  end
end

redis.call('SET', key, cjson.encode(newItems))
if ttl > 0 then
  redis.call('EXPIRE', key, ttl)
end
return 'OK'
`

export async function removeFromCart(userId: string, productId: string): Promise<void> {
  const key = getCartKey(userId)
  await redis.eval(REMOVE_FROM_CART_SCRIPT, 1, key, productId, CART_TTL_SECONDS)
}

export async function clearCart(userId: string): Promise<void> {
  const key = getCartKey(userId)
  await redis.del(key)
}

export async function backupCartToDb(userId: string, cart: CartWithProducts): Promise<void> {
  const cartItems = cart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
  }))

  await prisma.cartBackup.upsert({
    where: { userId },
    update: {
      items: cartItems,
      total: cart.total,
    },
    create: {
      userId,
      items: cartItems,
      total: cart.total,
    },
  })
}

export async function restoreCartFromDb(userId: string): Promise<CartWithProducts | null> {
  const backup = await prisma.cartBackup.findUnique({
    where: { userId },
  })

  if (!backup || !backup.items || !Array.isArray(backup.items)) {
    return null
  }

  const items = backup.items as unknown as CartItem[]
  if (!items || items.length === 0) {
    return null
  }

  return buildCartWithProducts(items)
}

export async function getCartWithBackup(userId: string): Promise<CartWithProducts> {
  const key = getCartKey(userId)
  const cartData = await redis.get(key)

  if (!cartData) {
    const backupCart = await restoreCartFromDb(userId)
    if (backupCart && backupCart.items.length > 0) {
      const cartJson = JSON.stringify(backupCart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })))
      await redis.set(key, cartJson, 'EX', CART_TTL_SECONDS)
      return backupCart
    }
    return { items: [], total: 0 }
  }

  let items: CartItem[]
  try {
    const parsed = JSON.parse(cartData)
    items = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    logError('Failed to parse cart data', { error: String(error), userId })
    await redis.del(key)
    return { items: [], total: 0 }
  }

  if (items.length === 0) {
    return { items: [], total: 0 }
  }

  const cart = await buildCartWithProducts(items)

  if (cart.items.length > 0) {
    await backupCartToDb(userId, cart)
  }

  return cart
}
