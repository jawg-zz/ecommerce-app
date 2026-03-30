import { redis } from './redis'
import { prisma } from './prisma'

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
    // Ensure items is always an array
    items = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to parse cart data:', error)
    // Clear corrupted cart data
    await redis.del(key)
    return { items: [], total: 0 }
  }

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

const ADD_TO_CART_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local quantity = tonumber(ARGV[2])

local cartData = redis.call('GET', key)
local items = {}

if cartData then
  items = cjson.decode(cartData)
end

local found = false
for i, item in ipairs(items) do
  if item.productId == productId then
    item.quantity = item.quantity + quantity
    found = true
    break
  end
end

if not found then
  table.insert(items, {productId = productId, quantity = quantity})
end

redis.call('SET', key, cjson.encode(items))
return 'OK'
`

export async function addToCart(userId: string, productId: string, quantity: number = 1): Promise<void> {
  const key = getCartKey(userId)
  await redis.eval(ADD_TO_CART_SCRIPT, 1, key, productId, quantity)
}

const UPDATE_CART_ITEM_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]
local quantity = tonumber(ARGV[2])

local cartData = redis.call('GET', key)
if not cartData then
  return 'NOT_FOUND'
end

local items = cjson.decode(cartData)

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
return 'OK'
`

export async function updateCartItem(userId: string, productId: string, quantity: number): Promise<void> {
  const key = getCartKey(userId)
  await redis.eval(UPDATE_CART_ITEM_SCRIPT, 1, key, productId, quantity)
}

const REMOVE_FROM_CART_SCRIPT = `
local key = KEYS[1]
local productId = ARGV[1]

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
return 'OK'
`

export async function removeFromCart(userId: string, productId: string): Promise<void> {
  const key = getCartKey(userId)
  await redis.eval(REMOVE_FROM_CART_SCRIPT, 1, key, productId)
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
      await redis.set(key, cartJson)
      return backupCart
    }
    return { items: [], total: 0 }
  }

  let items: CartItem[]
  try {
    const parsed = JSON.parse(cartData)
    items = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to parse cart data:', error)
    await redis.del(key)
    return { items: [], total: 0 }
  }

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
      total += product.price * item.quantity
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          stock: product.stock,
        },
      }
    })
    .filter(Boolean) as CartWithProducts['items']

  if (cartItems.length > 0) {
    await backupCartToDb(userId, { items: cartItems, total })
  }

  return { items: cartItems, total }
}
