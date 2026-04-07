/**
 * Shared TypeScript interfaces for the application
 */

// Shipping Address interface
export interface ShippingAddress {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
}

// M-Pesa Callback Metadata Item
export interface MpesaCallbackMetadataItem {
  Name: string
  Value: string | number
}

// M-Pesa Callback Metadata
export interface MpesaCallbackMetadata {
  Item: MpesaCallbackMetadataItem[]
}

// Redis Lock interface - ioredis uses different signature for set with NX/EX
export interface RedisLockOperations {
  set(key: string, value: string, nx?: 'NX', ex?: string, exValue?: number): Promise<string | null>
  set(key: string, value: string, nx?: 'NX', px?: string, pxValue?: number): Promise<string | null>
  set(key: string, value: string, ex?: string, exValue?: number): Promise<string | null>
  set(key: string, value: string, px?: string, pxValue?: number): Promise<string | null>
  set(key: string, value: string): Promise<string | null>
  del(key: string): Promise<number>
}
