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

  const items: CartItem[] = JSON.parse(cartData)

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
      total += Number(product.price) * item.quantity
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          stock: product.stock,
        },
      }
    })
    .filter(Boolean) as CartWithProducts['items']

  return { items: cartItems, total }
}

export async function addToCart(userId: string, productId: string, quantity: number = 1): Promise<void> {
  const key = getCartKey(userId)
  const cartData = await redis.get(key)

  let items: CartItem[] = cartData ? JSON.parse(cartData) : []

  const existingItem = items.find(item => item.productId === productId)
  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    items.push({ productId, quantity })
  }

  await redis.set(key, JSON.stringify(items))
}

export async function updateCartItem(userId: string, productId: string, quantity: number): Promise<void> {
  const key = getCartKey(userId)
  const cartData = await redis.get(key)

  if (!cartData) return

  let items: CartItem[] = JSON.parse(cartData)

  if (quantity <= 0) {
    items = items.filter(item => item.productId !== productId)
  } else {
    const item = items.find(i => i.productId === productId)
    if (item) {
      item.quantity = quantity
    }
  }

  await redis.set(key, JSON.stringify(items))
}

export async function removeFromCart(userId: string, productId: string): Promise<void> {
  const key = getCartKey(userId)
  const cartData = await redis.get(key)

  if (!cartData) return

  let items: CartItem[] = JSON.parse(cartData)
  items = items.filter(item => item.productId !== productId)

  await redis.set(key, JSON.stringify(items))
}

export async function clearCart(userId: string): Promise<void> {
  const key = getCartKey(userId)
  await redis.del(key)
}
