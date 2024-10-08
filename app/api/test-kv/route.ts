import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

export async function GET() {
  try {
    // Try to set a test value
    await kv.set('test_key', 'test_value')
    
    // Try to get the test value
    const testValue = await kv.get('test_key')
    
    return NextResponse.json({ success: true, testValue })
  } catch (error) {
    console.error('KV Connection Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}