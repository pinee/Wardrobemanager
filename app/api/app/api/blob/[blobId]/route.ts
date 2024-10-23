import { NextResponse } from 'next/server'
import { get } from '@vercel/blob'

export async function GET(
  request: Request,
  { params }: { params: { blobId: string } }
) {
  try {
    const blobId = params.blobId
    const blob = await get(blobId)

    if (!blob) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Error in /api/blob/[blobId]:', error)
    return NextResponse.json({ error: 'Failed to get image URL' }, { status: 500 })
  }
}
