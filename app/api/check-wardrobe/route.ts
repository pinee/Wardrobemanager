import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET() {
  try {
    const wardrobeItems = await kv.get('wardrobeItems')
    return NextResponse.json({ wardrobeItems })
  } catch (error) {
    console.error('Error fetching wardrobe items:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}