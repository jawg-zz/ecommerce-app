import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.local' },
    update: {},
    create: {
      email: 'admin@ecommerce.local',
      password: hashedPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  const user = await prisma.user.upsert({
    where: { email: 'user@ecommerce.local' },
    update: {},
    create: {
      email: 'user@ecommerce.local',
      password: hashedPassword,
      name: 'Test User',
      role: 'USER',
    },
  })
  console.log('Created test user:', user.email)

  const products = [
    {
      name: 'iPhone 15 Pro',
      description: 'The most powerful iPhone ever with A17 Pro chip, titanium design, and advanced camera system.',
      price: 1000,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
      stock: 50,
    },
    {
      name: 'MacBook Pro 14"',
      description: 'Supercharged by M3 Pro or M3 Max chip. Up to 22 hours of battery life.',
      price: 2000,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      stock: 30,
    },
    {
      name: 'AirPods Pro (2nd Gen)',
      description: 'Active Noise Cancellation, Adaptive Transparency, and personalized Spatial Audio.',
      price: 250,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800',
      stock: 100,
    },
    {
      name: 'iPad Air',
      description: 'Powerful and versatile. With M1 chip, 10.9-inch Liquid Retina display, and more.',
      price: 600,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
      stock: 45,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'The ultimate smartphone with S Pen, AI features, and 200MP camera.',
      price: 1300,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
      stock: 40,
    },
    {
      name: 'Sony WH-1000XM5',
      description: 'Industry-leading noise cancellation with exceptional sound quality.',
      price: 400,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800',
      stock: 60,
    },
    {
      name: 'Apple Watch Series 9',
      description: 'The ultimate device for a healthy life. With S9 SiP, Always-On Retina display.',
      price: 400,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800',
      stock: 75,
    },
    {
      name: 'Nintendo Switch OLED',
      description: 'Vivid 7-inch OLED screen, wide adjustable stand, and enhanced audio.',
      price: 350,
      category: 'ELECTRONICS' as const,
      image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800',
      stock: 35,
    },
    {
      name: 'Classic Denim Jacket',
      description: 'Timeless denim jacket made from 100% cotton. Perfect for any casual outfit.',
      price: 90,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
      stock: 80,
    },
    {
      name: 'Cotton T-Shirt Pack (3)',
      description: 'Premium cotton t-shirts. Set of 3 in classic colors. Soft and breathable.',
      price: 40,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
      stock: 150,
    },
    {
      name: 'Running Shoes',
      description: 'Lightweight running shoes with responsive cushioning. Perfect for athletes.',
      price: 130,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      stock: 65,
    },
    {
      name: 'Wool Sweater',
      description: 'Merino wool sweater. Warm, comfortable, and stylish for cold weather.',
      price: 150,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800',
      stock: 55,
    },
    {
      name: 'Casual Hoodie',
      description: 'Soft fleece hoodie with adjustable hood. Perfect for everyday wear.',
      price: 80,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
      stock: 90,
    },
    {
      name: 'Leather Belt',
      description: 'Genuine leather belt with classic buckle. Durable and stylish.',
      price: 50,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
      stock: 70,
    },
    {
      name: 'Sports Shorts',
      description: 'Lightweight athletic shorts with moisture-wicking fabric. Ideal for workouts.',
      price: 45,
      category: 'CLOTHING' as const,
      image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800',
      stock: 85,
    },
    {
      name: 'The Great Gatsby',
      description: 'F. Scott Fitzgerald\'s classic novel of the Jazz Age. A tale of love and ambition.',
      price: 15,
      category: 'BOOKS' as const,
      image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
      stock: 120,
    },
    {
      name: '1984',
      description: 'George Orwell\'s dystopian masterpiece. A profound warning against totalitarianism.',
      price: 13,
      category: 'BOOKS' as const,
      image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800',
      stock: 100,
    },
    {
      name: 'Clean Code',
      description: 'Robert C. Martin\'s guide to writing maintainable and efficient code.',
      price: 45,
      category: 'BOOKS' as const,
      image: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800',
      stock: 60,
    },
    {
      name: 'Introduction to Algorithms',
      description: 'Comprehensive textbook covering fundamental algorithms and data structures.',
      price: 90,
      category: 'BOOKS' as const,
      image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800',
      stock: 40,
    },
    {
      name: 'Atomic Habits',
      description: 'James Clear\'s proven framework for improving every day.',
      price: 17,
      category: 'BOOKS' as const,
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
      stock: 95,
    },
    {
      name: 'Sapiens',
      description: 'Yuval Noah Harari\'s brief history of humankind. From Stone Age to the future.',
      price: 19,
      category: 'BOOKS' as const,
      image: 'https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=800',
      stock: 80,
    },
  ]

  for (const product of products) {
    await prisma.product.create({
      data: product,
    })
  }
  console.log(`Created ${products.length} products`)

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
