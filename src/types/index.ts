export interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
}

export const KENYA_COUNTIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika',
  'Malindi',
  'Kitale',
  'Garissa',
  'Nyeri',
  'Meru',
  'Kakamega',
  'Kericho',
  'Migori',
  'Machakos',
  'Lamu',
  'Naivasha',
  'Nanyuki',
  'Kisii',
  'Bungoma',
] as const

export type KenyaCounty = typeof KENYA_COUNTIES[number]

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'
  image: string | null
  stock: number
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    image: string | null
    stock: number
  }
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface Order {
  id: string
  userId: string
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  items: OrderItem[]
  total: number
  stripePaymentId: string | null
  shippingAddress: ShippingAddress | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  productId: string
  product: Product
  quantity: number
  price: number
}

export interface ShippingAddress {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

export type Category = 'ELECTRONICS' | 'CLOTHING' | 'BOOKS'

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
