export type IdentifierType = 'name' | 'slug' | 'id';

export interface ProductImageEntry {
  productIdentifier: string;
  identifierType: IdentifierType;
  imageUrl: string;
  altText?: string;
}

export interface ProductImageManifest {
  version: string;
  description?: string;
  products: ProductImageEntry[];
}

export type ProcessingStatus = 'success' | 'skipped' | 'failed';

export interface ProcessedEntry {
  entry: ProductImageEntry;
  status: ProcessingStatus;
  cloudinaryUrl?: string;
  productId?: string;
  error?: string;
}

export interface IngestionSummary {
  total: number;
  success: number;
  skipped: number;
  failed: number;
}

export interface IngestionResult {
  processed: ProcessedEntry[];
  summary: IngestionSummary;
}
