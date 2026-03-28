# E-Commerce Application Specification

## Project Overview

- **Project Name**: E-Commerce Store
- **Type**: Full-stack e-commerce web application
- **Core Functionality**: Online shopping platform with product catalog, cart, checkout, and order management
- **Target Users**: Online shoppers and store administrators
- **Domain**: ecommerce.spidmax.win

---

## Technical Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL (host: postgres)
- **Cache/Session**: Redis (host: redis)
- **Payments**: Stripe (test keys)
- **Styling**: Tailwind CSS
- **ORM**: Prisma
- **Authentication**: JWT (HTTP-only cookies)
- **Containerization**: Docker Compose
- **Reverse Proxy**: Traefik

---

## UI/UX Specification

### Layout Structure

**Public Pages:**
- Header: Logo, navigation (Home, Products, Categories), search bar, cart icon, user menu
- Main content area: Product grid/list views
- Footer: Links, copyright

**Admin Pages:**
- Sidebar navigation
- Main content area with data tables/forms

### Responsive Breakpoints
- Mobile: < 640px (1 column grid)
- Tablet: 640px - 1024px (2 column grid)
- Desktop: > 1024px (3-4 column grid)

### Visual Design

**Color Palette:**
- Primary: `#0f172a` (slate-900)
- Secondary: `#3b82f6` (blue-500)
- Accent: `#10b981` (emerald-500)
- Background: `#f8fafc` (slate-50)
- Card Background: `#ffffff`
- Text Primary: `#1e293b` (slate-800)
- Text Secondary: `#64748b` (slate-500)
- Error: `#ef4444` (red-500)
- Success: `#22c55e` (green-500)
- Border: `#e2e8f0` (slate-200)

**Typography:**
- Font Family: Inter (system fallback)
- Headings: 2rem (h1), 1.5rem (h2), 1.25rem (h3)
- Body: 1rem
- Small: 0.875rem

**Spacing:**
- Container max-width: 1280px
- Section padding: 2rem
- Card padding: 1.5rem
- Gap: 1rem (mobile), 1.5rem (desktop)

**Visual Effects:**
- Card shadows: `shadow-md` on hover
- Button transitions: 200ms ease
- Page transitions: fade-in 300ms

### Components

**Product Card:**
- Image (aspect-ratio 1:1, object-cover)
- Title (truncate 2 lines)
- Price (bold, accent color)
- Category badge
- Add to cart button
- Hover: slight scale + shadow

**Cart Item:**
- Product thumbnail
- Title & price
- Quantity selector
- Remove button

**Navigation:**
- Desktop: horizontal menu
- Mobile: hamburger menu with slide-out drawer

**Forms:**
- Input fields with labels
- Validation messages
- Submit buttons with loading states

---

## Functionality Specification

### 1. Product Catalog

**Categories:**
- Electronics (phones, laptops, accessories)
- Clothing (men, women, kids)
- Books (fiction, non-fiction, textbooks)

**Product Fields:**
- id (UUID)
- name (string, required)
- description (text)
- price (decimal, required)
- category (enum: ELECTRONICS, CLOTHING, BOOKS)
- image (URL)
- stock (integer, default 0)
- createdAt, updatedAt (timestamps)

**Features:**
- Grid/list view toggle
- Sort by: price (asc/desc), newest, name
- Filter by category
- Search by name/description
- Pagination (12 products per page)

### 2. Shopping Cart (Redis-backed)

**Cart Structure:**
```json
{
  "userId": "string",
  "items": [
    { "productId": "uuid", "quantity": 1 }
  ]
}
```

**Operations:**
- Add item (increment quantity if exists)
- Update quantity
- Remove item
- Clear cart
- Get cart (with product details)

**Redis Key Format:** `cart:{userId}`

### 3. User Authentication

**User Fields:**
- id (UUID)
- email (unique)
- password (hashed bcrypt)
- name (string)
- role (enum: USER, ADMIN)
- createdAt, updatedAt

**Auth Flow:**
- Register: POST /api/auth/register
- Login: POST /api/auth/login (returns HTTP-only cookie)
- Logout: POST /api/auth/logout
- Get session: GET /api/auth/me

**JWT Payload:**
```json
{
  "userId": "uuid",
  "email": "string",
  "role": "USER|ADMIN"
}
```

### 4. Checkout Flow

**Order Fields:**
- id (UUID)
- userId (UUID)
- status (enum: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED)
- items (JSON)
- total (decimal)
- stripePaymentId (string)
- shippingAddress (JSON)
- createdAt, updatedAt

**Checkout Steps:**
1. Review cart
2. Enter/confirm shipping address
3. Stripe payment (test mode)
4. Order confirmation

**Stripe Integration:**
- Test keys: use environment variables
- Create PaymentIntent on checkout
- Webhook for payment confirmation

### 5. Order Management

**User Orders:**
- View order history
- Order details page
- Track order status

**Admin Orders:**
- View all orders
- Update order status
- Filter by status/date

### 6. Admin Panel

**Products Management:**
- List all products (with search/filter)
- Add new product
- Edit product
- Delete product
- Bulk actions

**Orders Management:**
- List all orders
- Update order status
- View order details

---

## API Endpoints

### Public
- `GET /api/products` - List products (paginated, filterable)
- `GET /api/products/[id]` - Get single product
- `GET /api/categories` - List categories

### Auth (public)
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Cart (authenticated)
- `GET /api/cart` - Get cart
- `POST /api/cart` - Add item
- `PUT /api/cart` - Update quantity
- `DELETE /api/cart/[productId]` - Remove item

### Checkout (authenticated)
- `POST /api/checkout/create-payment` - Create Stripe PaymentIntent
- `POST /api/checkout/webhook` - Stripe webhook
- `GET /api/orders` - User's orders
- `GET /api/orders/[id]` - Order details

### Admin
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product
- `GET /api/admin/orders` - List all orders
- `PUT /api/admin/orders/[id]` - Update order status

### Health
- `GET /api/health` - Health check

---

## Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(USER)
  orders    Order[]
  cart      Cart?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Product {
  id          String      @id @default(uuid())
  name        String
  description String?
  price       Decimal     @db.Decimal(10, 2)
  category    Category
  image       String?
  stock       Int         @default(0)
  orderItems  OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Order {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  status          OrderStatus   @default(PENDING)
  items           OrderItem[]
  total           Decimal       @db.Decimal(10, 2)
  stripePaymentId String?
  shippingAddress Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
}

enum Role {
  USER
  ADMIN
}

enum Category {
  ELECTRONICS
  CLOTHING
  BOOKS
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}
```

---

## Docker Compose Configuration

**Services:**
1. **app** (Next.js)
   - Port: 3000
   - Traefik: ecommerce.spidmax.win
   - Depends on: postgres, redis

2. **postgres**
   - Image: postgres:15-alpine
   - Volume: postgres_data
   - Environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB

3. **redis**
   - Image: redis:7-alpine
   - Volume: redis_data

**Traefik Labels:**
```yaml
traefik.enable: "true"
traefik.http.routers.ecommerce.rule: "Host(`ecommerce.spidmax.win`)"
traefik.http.routers.ecommerce.entrypoints: "https"
traefik.http.routers.ecommerce.tls: "true"
traefik.http.services.ecommerce.loadbalancer.server.port: "3000"
```

---

## Seed Data

20+ products across three categories:

**Electronics (8):**
- iPhone 15 Pro, MacBook Pro, AirPods Pro, iPad Air, Samsung Galaxy S24, Sony WH-1000XM5, Apple Watch, Nintendo Switch

**Clothing (7):**
- Classic Denim Jacket, Cotton T-Shirt Pack, Running Shoes, Wool Sweater, Casual Hoodie, Leather Belt, Sports Shorts

**Books (6):**
- The Great Gatsby, 1984, Clean Code, Introduction to Algorithms, Atomic Habits, Sapiens

---

## Acceptance Criteria

1. ✅ Application builds without errors
2. ✅ Docker Compose starts all services
3. ✅ Products display in catalog with filtering/search
4. ✅ Users can register and login
5. ✅ Cart operations work (add/remove/update)
6. ✅ Checkout flow completes with Stripe test payment
7. ✅ Order history visible to users
8. ✅ Admin can manage products and orders
9. ✅ Health endpoint returns 200
10. ✅ Responsive design works on mobile/tablet/desktop
