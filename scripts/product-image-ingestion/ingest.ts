import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import type { 
  ProductImageManifest, 
  ProductImageEntry, 
  ProcessedEntry,
  IngestionResult,
  IdentifierType
} from './types';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface CliArgs {
  manifestPath: string;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let manifestPath = './manifest.json';
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest' && args[i + 1]) {
      manifestPath = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    } else if (!args[i].startsWith('--')) {
      manifestPath = args[i];
    }
  }

  return { manifestPath, dryRun, verbose };
}

function printHelp() {
  console.log(`
Product Image Ingestion Script

Usage: npx tsx scripts/product-image-ingestion/ingest.ts [options]

Options:
  --manifest <path>   Path to manifest JSON file (default: ./manifest.json)
  --dry-run           Preview changes without uploading or updating DB
  --verbose, -v      Show detailed progress
  --help, -h         Show this help message

Example:
  npx tsx scripts/product-image-ingestion/ingest.ts --manifest product-images.json --dry-run
`);
}

function log(verbose: boolean, ...args: unknown[]) {
  if (verbose) {
    console.log('[VERBOSE]', ...args);
  }
}

function initCloudinary(): void {
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    console.error('ERROR: Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  cloudinary.config(config);
}

function loadManifest(path: string): ProductImageManifest {
  try {
    const content = readFileSync(path, 'utf-8');
    const manifest = JSON.parse(content) as ProductImageManifest;

    if (!manifest.version || !manifest.products || !Array.isArray(manifest.products)) {
      throw new Error('Invalid manifest: missing version or products array');
    }

    return manifest;
  } catch (err) {
    console.error(`ERROR: Failed to load manifest from ${path}:`, err);
    process.exit(1);
  }
}

async function findProduct(
  prisma: PrismaClient,
  identifier: string,
  idType: IdentifierType
): Promise<string | null> {
  let product;

  switch (idType) {
    case 'id':
      product = await prisma.product.findUnique({ where: { id: identifier } });
      break;
    case 'slug':
      product = await prisma.product.findFirst({ where: { name: { equals: identifier, mode: 'insensitive' } } });
      break;
    case 'name':
    default:
      product = await prisma.product.findFirst({ 
        where: { 
          name: { equals: identifier, mode: 'insensitive' } 
        } 
      });
      break;
  }

  return product?.id ?? null;
}

async function fetchImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await globalThis.fetch(url, {
      headers: {
        'User-Agent': 'Ecommerce-Image-Ingestion/1.0',
      },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch image: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      console.error(`  Invalid content type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length > MAX_IMAGE_SIZE) {
      console.error(`  Image too large: ${buffer.length} bytes (max: ${MAX_IMAGE_SIZE})`);
      return null;
    }

    if (buffer.length < 100) {
      console.error(`  Image too small: ${buffer.length} bytes`);
      return null;
    }

    return { buffer, contentType };
  } catch (err) {
    console.error(`  Failed to fetch image:`, err);
    return null;
  }
}

async function uploadToCloudinary(buffer: Buffer): Promise<string | null> {
  const uniqueFilename = `product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ecommerce/products',
        public_id: uniqueFilename,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error) {
          console.error(`  Cloudinary upload error:`, error.message);
          resolve(null);
          return;
        }

        if (!result) {
          console.error(`  Cloudinary upload failed: no result`);
          resolve(null);
          return;
        }

        const optimizedUrl = cloudinary.url(result.public_id, {
          transformation: [
            { width: 800, crop: 'scale' },
            { fetch_format: 'auto', quality: 'auto' },
          ],
        });

        resolve(optimizedUrl);
      }
    );

    uploadStream.end(buffer);
  });
}

async function updateProductImage(
  prisma: PrismaClient,
  productId: string,
  imageUrl: string
): Promise<boolean> {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { image: imageUrl },
    });
    return true;
  } catch (err) {
    console.error(`  Failed to update product:`, err);
    return false;
  }
}

async function processEntry(
  prisma: PrismaClient,
  entry: ProductImageEntry,
  dryRun: boolean,
  verbose: boolean
): Promise<ProcessedEntry> {
  log(verbose, `Processing: ${entry.productIdentifier} (${entry.identifierType})`);

  const productId = await findProduct(prisma, entry.productIdentifier, entry.identifierType);

  if (!productId) {
    return {
      entry,
      status: 'failed',
      error: `Product not found: ${entry.productIdentifier}`,
    };
  }

  if (dryRun) {
    log(verbose, `  [DRY-RUN] Would fetch ${entry.imageUrl} and update product ${productId}`);
    return {
      entry,
      status: 'skipped',
      productId,
      error: 'Dry-run mode',
    };
  }

  const imageData = await fetchImage(entry.imageUrl);

  if (!imageData) {
    return {
      entry,
      status: 'failed',
      productId,
      error: 'Failed to fetch image',
    };
  }

  log(verbose, `  Fetched ${imageData.buffer.length} bytes`);

  const cloudinaryUrl = await uploadToCloudinary(imageData.buffer);

  if (!cloudinaryUrl) {
    return {
      entry,
      status: 'failed',
      productId,
      error: 'Cloudinary upload failed',
    };
  }

  log(verbose, `  Uploaded to Cloudinary: ${cloudinaryUrl}`);

  const updated = await updateProductImage(prisma, productId, cloudinaryUrl);

  if (!updated) {
    return {
      entry,
      status: 'failed',
      productId,
      error: 'Database update failed',
    };
  }

  log(verbose, `  Updated product ${productId} with new image`);

  return {
    entry,
    status: 'success',
    cloudinaryUrl,
    productId,
  };
}

async function main() {
  const args = parseArgs();

  console.log('='.repeat(60));
  console.log('Product Image Ingestion Pipeline');
  console.log('='.repeat(60));
  console.log(`Manifest: ${args.manifestPath}`);
  console.log(`Mode: ${args.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log('');

  initCloudinary();
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  try {
    const manifest = loadManifest(args.manifestPath);
    console.log(`Loaded ${manifest.products.length} product(s) from manifest`);
    console.log('');

    const processed: ProcessedEntry[] = [];

    for (let i = 0; i < manifest.products.length; i++) {
      const entry = manifest.products[i];
      console.log(`[${i + 1}/${manifest.products.length}] Processing: ${entry.productIdentifier}...`);

      const result = await processEntry(prisma, entry, args.dryRun, args.verbose);
      processed.push(result);

      if (result.status === 'success') {
        console.log(`  ✓ Success: ${result.cloudinaryUrl}`);
      } else if (result.status === 'skipped') {
        console.log(`  ⊘ Skipped: ${result.error}`);
      } else {
        console.log(`  ✗ Failed: ${result.error}`);
      }
    }

    const summary = {
      total: processed.length,
      success: processed.filter(p => p.status === 'success').length,
      skipped: processed.filter(p => p.status === 'skipped').length,
      failed: processed.filter(p => p.status === 'failed').length,
    };

    console.log('');
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total:    ${summary.total}`);
    console.log(`Success:  ${summary.success}`);
    console.log(`Skipped:  ${summary.skipped}`);
    console.log(`Failed:   ${summary.failed}`);
    console.log('='.repeat(60));

    if (summary.failed > 0 && !args.dryRun) {
      console.log('\nWarning: Some entries failed. Check logs above for details.');
    }

    if (args.dryRun) {
      console.log('\nNote: This was a dry-run. No actual changes were made.');
      console.log('Run without --dry-run to apply changes.');
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
