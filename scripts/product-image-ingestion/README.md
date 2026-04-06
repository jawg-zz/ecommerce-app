# Product Image Ingestion Pipeline

This pipeline fetches product images from remote URLs, uploads them to Cloudinary, and updates the corresponding Product records in the database.

## Files

- `manifest.example.json` - Example manifest showing the file format
- `ingest.ts` - Main ingestion script
- `types.ts` - TypeScript type definitions

## Manifest Format

Create a JSON file with this structure:

```json
{
  "version": "1.0",
  "description": "My product images",
  "products": [
    {
      "productIdentifier": "iPhone 15 Pro",
      "identifierType": "name",
      "imageUrl": "https://example.com/images/iphone-15-pro.jpg",
      "altText": "iPhone 15 Pro in natural titanium"
    }
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `productIdentifier` | Yes | Product identifier (name, slug, or UUID) |
| `identifierType` | Yes | How to match: `name`, `slug`, or `id` |
| `imageUrl` | Yes | Remote URL of the source image |
| `altText` | No | Optional alt text (stored for reference) |

## Usage

### Prerequisites

1. Set Cloudinary environment variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

2. Ensure the database is accessible via `DATABASE_URL`

### Run the Pipeline

```bash
# Dry-run (preview what would happen)
npx tsx scripts/product-image-ingestion/ingest.ts --manifest ./manifest.json --dry-run

# Live run (actually upload and update)
npx tsx scripts/product-image-ingestion/ingest.ts --manifest ./manifest.json
```

### Options

| Option | Description |
|--------|-------------|
| `--manifest <path>` | Path to manifest JSON (default: `./manifest.json`) |
| `--dry-run` | Preview changes without uploading or updating DB |
| `--verbose` / `-v` | Show detailed progress |
| `--help` / `-h` | Show help message |

## How It Works

1. **Load Manifest** - Reads product-image mappings from JSON file
2. **Find Product** - Matches products in DB by name, slug, or UUID
3. **Fetch Image** - Downloads image from remote URL with validation:
   - Checks content-type (jpg, png, webp only)
   - Validates size (max 5MB)
   - Rejects too-small files (<100 bytes)
4. **Upload to Cloudinary** - Uploads with optimization (800px width, auto format/quality)
5. **Update Database** - Sets `Product.image` to the Cloudinary URL

## Example Workflow

```bash
# 1. Create your manifest
cp scripts/product-image-ingestion/manifest.example.json product-images.json
# Edit product-images.json with your product-image mappings

# 2. Test with dry-run
npx tsx scripts/product-image-ingestion/ingest.ts --manifest product-images.json --dry-run

# 3. Run for real
npx tsx scripts/product-image-ingestion/ingest.ts --manifest product-images.json
```
