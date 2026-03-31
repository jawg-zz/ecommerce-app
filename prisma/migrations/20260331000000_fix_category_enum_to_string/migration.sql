-- Convert category column from enum to TEXT
-- The Prisma schema now uses String? instead of Category enum

-- Step 1: Convert the column type
ALTER TABLE "Product" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

-- Step 2: Make it nullable (schema says String?)
ALTER TABLE "Product" ALTER COLUMN "category" DROP NOT NULL;

-- Step 3: Drop the old enum type
DROP TYPE IF EXISTS "Category";
