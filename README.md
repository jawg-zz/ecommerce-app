# E-Commerce Application

A production-ready e-commerce application built with Next.js 14, PostgreSQL, Redis, and M-Pesa.

## Features

- **Product Catalog**: Browse products by category, search, and filter
- **Shopping Cart**: Redis-backed cart with persistent storage
- **User Authentication**: JWT-based auth with secure HTTP-only cookies
- **Checkout**: M-Pesa (Safaricom Daraja API) integration for payments
- **Order Management**: Track order status and history
- **Admin Panel**: Manage products and orders

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **Cache**: Redis
- **ORM**: Prisma
- **Payments**: M-Pesa (Safaricom Daraja API)
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
   - `MPESA_CONSUMER_KEY`: Your M-Pesa Daraja API consumer key
   - `MPESA_CONSUMER_SECRET`: Your M-Pesa Daraja API consumer secret
   - `MPESA_SHORTCODE`: Your M-Pesa business shortcode
   - `MPESA_PASSKEY`: Your M-Pesa passkey
   - `MPESA_CALLBACK_URL`: Your callback URL for payment notifications

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

## M-Pesa Setup

To enable M-Pesa payments:

1. Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Create a new app to get consumer key and secret
3. Configure your M-Pesa shortcode and passkey
4. Set the callback URL to receive payment notifications

For testing, use the sandbox environment (default in development).

## Cloudinary Setup

To enable image uploads for products:

1. Register at [Cloudinary](https://cloudinary.com/)
2. Go to your Dashboard to find your cloud name
3. Navigate to Settings > API Keys to get your API key and secret
4. Add the credentials to your `.env` file:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Images uploaded will be:
- Stored in the `ecommerce/products` folder
- Automatically optimized (WebP/AVIF with auto quality)
- Resized to max width 800px
- Validated for max 5MB file size (jpg, png, webp only)

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
- `POST /api/checkout` - Create order (initiate M-Pesa STK push)
- `GET /api/checkout?checkoutRequestId=` - Check payment status

### Admin

- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product
- `GET /api/admin/orders` - List orders
- `PUT /api/admin/orders/[id]` - Update order status
- `POST /api/upload` - Upload product image (Admin only)

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
├── lib/               # Utilities (prisma, redis, auth, mpesa, etc.)
├── types/             # TypeScript types
└── styles/            # Global styles
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:setup` - Generate Prisma client, push schema, and seed
- `npm run prisma:studio` - Open Prisma Studio
