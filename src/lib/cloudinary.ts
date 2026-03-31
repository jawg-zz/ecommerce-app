import { v2 as cloudinary } from 'cloudinary'

function getCloudinaryConfig() {
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  }
}

function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig()
  return !!(config.cloud_name && config.api_key && config.api_secret)
}

if (isCloudinaryConfigured()) {
  cloudinary.config(getCloudinaryConfig())
}

function generateUniqueFilename(): string {
  const randomString = Math.random().toString(36).substring(2, 15)
  return `product-${Date.now()}-${randomString}`
}

export async function uploadImage(file: Buffer, filename: string): Promise<string> {
  const uniqueFilename = generateUniqueFilename()

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'ecommerce/products',
        public_id: uniqueFilename,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error) {
          reject(new Error(error.message))
          return
        }

        if (!result) {
          reject(new Error('Upload failed'))
          return
        }

        const optimizedUrl = cloudinary.url(result.public_id, {
          transformation: [
            { width: 800, crop: 'scale' },
            { fetch_format: 'auto', quality: 'auto' },
          ],
        })

        resolve(optimizedUrl)
      }
    )

    uploadStream.end(file)
  })
}

export { cloudinary }
