import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'

const MAX_ITERATIONS = 10 // Safeguard against unexpected behavior

export async function GET() {
  console.log('GET /api/debug/kv: Started')
  try {
    if (!kv) {
      throw new Error('KV store is not initialized')
    }

    let cursor = 0
    let allItems = []
    let iterations = 0

    do {
      console.log(`Scanning KV store with cursor: ${cursor}`)
      const scanResult = await kv.scan(cursor, { match: 'wardrobe:*', count: 100 })
      
      // Ensure scanResult is an array with at least two elements
      if (!Array.isArray(scanResult) || scanResult.length < 2) {
        console.error('Unexpected scanResult format:', scanResult)
        throw new Error('Unexpected response from KV store')
      }

      const [newCursor, keys] = scanResult
      cursor = typeof newCursor === 'string' ? parseInt(newCursor, 10) : newCursor

      console.log(`New cursor: ${cursor}, Keys found: ${keys.length}`)

      // If no keys are found, break the loop
      if (keys.length === 0) {
        console.log('No keys found, exiting loop')
        break
      }

      const items = await Promise.all(keys.map(async (key) => {
        try {
          const type = await kv.type(key)
          let value

          switch (type) {
            case 'hash':
              value = await kv.hgetall(key)
              break
            case 'string':
              value = await kv.get(key)
              break
            case 'list':
              value = await kv.lrange(key, 0, -1)
              break
            case 'set':
              value = await kv.smembers(key)
              break
            case 'zset':
              value = await kv.zrange(key, 0, -1, { withScores: true })
              break
            default:
              value = `Unsupported type: ${type}`
          }

          return { key, type, value }
        } catch (error) {
          console.error(`Error fetching data for key ${key}:`, error)
          return { key, type: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }))

      allItems = allItems.concat(items.filter(Boolean))
      iterations++

      // Break the loop if we've reached the maximum number of iterations
      if (iterations >= MAX_ITERATIONS) {
        console.warn(`Reached maximum number of iterations (${MAX_ITERATIONS}). Some data may be missing.`)
        break
      }
    } while (cursor !== 0)

    console.log(`Found ${allItems.length} items in the KV store after ${iterations} iterations`)
    return NextResponse.json({ items: allItems })
  } catch (error) {
    console.error('Error in GET /api/debug/kv:', error)
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 })
  }
}