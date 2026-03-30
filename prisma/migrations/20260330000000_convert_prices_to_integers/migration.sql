-- Convert price fields from Decimal(10,2) to Integer (whole KES)
-- This migration converts existing decimal values by rounding to nearest integer

-- Convert Product.price
ALTER TABLE "Product" ALTER COLUMN "price" TYPE integer USING ROUND("price")::integer;

-- Convert Order.total  
ALTER TABLE "Order" ALTER COLUMN "total" TYPE integer USING ROUND("total")::integer;

-- Convert OrderItem.price
ALTER TABLE "OrderItem" ALTER COLUMN "price" TYPE integer USING ROUND("price")::integer;
