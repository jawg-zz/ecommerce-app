import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { uploadImage } from '@/lib/cloudinary'
import { FileTypeParser } from 'file-type'
import { logError } from '@/lib/logger'

const ALLOWED_FILE_TYPES = [
  { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  { mime: 'image/png', extensions: ['png'] },
  { mime: 'image/webp', extensions: ['webp'] },
]

async function validateFileMagicBytes(buffer: Buffer): Promise<{ valid: boolean; mime: string | null; error: string | null }> {
  try {
    const parser = new FileTypeParser()
    const result = await parser.fromBuffer(buffer)
    if (!result) {
      return { valid: false, mime: null, error: 'Unable to determine file type from content' }
    }

    const allowed = ALLOWED_FILE_TYPES.find(ft => ft.mime === result.mime)
    if (!allowed) {
      return { valid: false, mime: result.mime, error: `File type ${result.mime} is not allowed. Only jpg, png, and webp are allowed.` }
    }

    return { valid: true, mime: result.mime, error: null }
  } catch (error) {
    return { valid: false, mime: null, error: 'Failed to validate file type' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const validation = await validateFileMagicBytes(buffer)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid file type' }, { status: 400 })
    }

    const imageUrl = await uploadImage(buffer, file.name)

    return NextResponse.json({ url: imageUrl })
  } catch (error) {
    logError('Upload error', { error: String(error) })
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
