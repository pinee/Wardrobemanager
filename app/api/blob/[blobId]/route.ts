import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(
  request: Request,
  { params }: { params: { blobId: string } }
) {
  const blobId = params.blobId

  if (!blobId) {
    console.error('No blobId provided')
    return NextResponse.json({ error: 'No blobId provided' }, { status: 400 })
  }

  try {
    console.log(`Attempting to fetch blob with ID: ${blobId}`)

    const { blobs } = await list()
    const blob = blobs.find(b => b.pathname.includes(blobId))

    if (!blob) {
      console.error(`Blob not found for ID: ${blobId}`)
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 })
    }

    console.log(`Blob found. URL: ${blob.url}`)
    return NextResponse.redirect(blob.url)
  } catch (error) {
    console.error(`Error fetching blob ${blobId}:`, error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Error fetching blob: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}