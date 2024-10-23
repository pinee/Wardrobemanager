import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { list, del } from '@vercel/blob'

export async function POST() {
  console.log('POST /api/debug/empty-databases: Started')
  try {
    if (!kv) {
      throw new Error('KV store is not initialized')
    }

    // Empty KV store
    let totalKeysDeleted = 0
    let failedKvDeletions = []

    console.log('Scanning KV store for wardrobe items')
    const scanResult = await kv.scan(0, { match: 'wardrobe:*', count: 1000 })
    const keys = scanResult[1]

    console.log(`Found ${keys.length} keys in KV store`)

    if (keys.length > 0) {
      const deleteResults = await Promise.all(keys.map(async (key) => {
        try {
          await kv.del(key)
          return { key, success: true }
        } catch (error) {
          console.error(`Failed to delete key ${key}:`, error)
          return { key, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }))

      totalKeysDeleted = deleteResults.filter(result => result.success).length
      failedKvDeletions = deleteResults.filter(result => !result.success)
    }

    console.log(`Total keys deleted from KV store: ${totalKeysDeleted}`)
    if (failedKvDeletions.length > 0) {
      console.error('Failed KV deletions:', failedKvDeletions)
    }

    // Empty Blob storage
    console.log('Listing blobs')
    const { blobs } = await list()
    console.log(`Found ${blobs.length} blobs in storage`)

    let totalBlobsDeleted = 0
    let failedBlobDeletions = []

    if (blobs.length > 0) {
      const blobDeletionResults = await Promise.all(blobs.map(async (blob) => {
        try {
          await del(blob.url)
          return { url: blob.url, success: true }
        } catch (error) {
          console.error(`Failed to delete blob ${blob.url}:`, error)
          return { url: blob.url, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }))

      totalBlobsDeleted = blobDeletionResults.filter(result => result.success).length
      failedBlobDeletions = blobDeletionResults.filter(result => !result.success)
    }

    console.log(`Total blobs deleted: ${totalBlobsDeleted}`)
    if (failedBlobDeletions.length > 0) {
      console.error('Failed blob deletions:', failedBlobDeletions)
    }

    console.log('Database emptying operation completed')
    return NextResponse.json({ 
      message: 'Databases have been emptied',
      kvKeysDeleted: totalKeysDeleted,
      kvDeletionsFailed: failedKvDeletions,
      blobsDeleted: totalBlobsDeleted,
      blobDeletionsFailed: failedBlobDeletions
    })
  } catch (error) {
    console.error('Error emptying databases:', error)
    return NextResponse.json({ 
      error: 'Failed to empty databases: ' + (error instanceof Error ? error.message : 'Unknown error') 
    }, { status: 500 })
  }
}