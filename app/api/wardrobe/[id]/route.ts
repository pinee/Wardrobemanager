import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { del } from '@vercel/blob'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id
    const itemJson = await kv.hget('wardrobe', itemId) as string | null

    if (!itemJson) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const item = JSON.parse(itemJson)
    
    // Delete from KV database
    await kv.hdel('wardrobe', itemId)
    
    // Delete from Blob storage
    await del(item.blobId)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}