# E-Commerce Application

A production-ready e-commerce application built with Next.js 14, PostgreSQL, Redis, and Stripe.

## Features

- **Product Catalog**: Browse products by category, search, and filter
- **Shopping Cart**: Redis-backed cart with persistent storage
- **User Authentication**: JWT-based auth with secure HTTP-only cookies
- **Checkout**: Stripe integration for payments (test mode)
- **Order Management**: Track order status and history
- **Admin Panel**: Manage products and orders

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **Cache**: Redis
- **ORM**: Prisma
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Container**: Docker Compose with Traefik

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Using Docker Compose

1. Clone the repository and navigate to the project directory

2. Create your `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

3. Update the environment variables in `.env`:
   - `STRIPE_SECRET_KEY`: Your Stripe test secret key
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe test publishable key

4. Start the application:

```bash
docker-compose up -d
```

5. The application will be available at `https://ecommerce.spidmax.win`

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file and update values:

```bash
cp .env.example .env
```

3. Set up the database:

```bash
npm run db:setup
```

4. Start the development server:

```bash
npm run dev
```

5. Open http://localhost:3000

## Default Users

After seeding, you can log in with these accounts:

- **Admin**: admin@ecommerce.local / admin123
- **User**: user@ecommerce.local / admin123

## Stripe Test Cards

Use these test cards for checkout:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

## API Endpoints

### Public

- `GET /api/products` - List products (paginated, filterable)
- `GET /api/products/[id]` - Get single product
- `GET /api/categories` - List categories
- `GET /api/health` - Health check

### Authentication

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Cart (Authenticated)

- `GET /api/cart` - Get cart
- `POST /api/cart` - Add item
- `PUT /api/cart` - Update quantity
- `DELETE /api/cart` - Clear cart

### Orders (Authenticated)

- `GET /api/orders` - List orders
- `POST /api/checkout` - Create order

### Admin

- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product
- `GET /api/admin/orders` - List orders
- `PUT /api/admin/orders/[id]` - Update order status

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── admin/          # Admin pages
│   ├── products/       # Product pages
│   ├── cart/           # Cart page
│   ├── checkout/       # Checkout page
│   ├── orders/         # Orders page
│   └── login/          # Login page
├── components/         # React components
├── lib/               # Utilities (prisma, redis, auth, etc.)
├── types/             # TypeScript types
└── styles/            # Global styles
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:setup` - Generate Prisma client, push schema, and seed
- `npm run prisma:studio` - Open Prisma Studio
