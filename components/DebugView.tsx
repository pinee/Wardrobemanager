"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface KVItem {
  key: string
  type: string
  value: any
  error?: string
}

interface BlobItem {
  url: string
  pathname: string
  contentType: string
  size: number
}

export default function DebugView() {
  const [kvData, setKvData] = useState<KVItem[]>([])
  const [blobData, setBlobData] = useState<BlobItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEmptying, setIsEmptying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const fetchData = async (bypassCache = false) => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const kvResponse = await fetch(`/api/debug/kv${bypassCache ? '?t=' + new Date().getTime() : ''}`)
      const kvJson = await kvResponse.json()
      setKvData(kvJson.items || [])

      const blobResponse = await fetch(`/api/debug/blob${bypassCache ? '?t=' + new Date().getTime() : ''}`)
      const blobJson = await blobResponse.json()
      setBlobData(blobJson.blobs || [])
    } catch (err) {
      setError('Failed to fetch debug data: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const emptyDatabases = async () => {
    setIsEmptying(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/debug/empty-databases', { method: 'POST' })
      const data = await response.json()
      
      if (response.ok) {
        setMessage(`
          ${data.message}
          KV keys deleted: ${data.kvKeysDeleted}
          KV deletions failed: ${data.kvDeletionsFailed.length}
          Blobs deleted: ${data.blobsDeleted}
          Blob deletions failed: ${data.blobDeletionsFailed.length}
        `)
        if (data.kvDeletionsFailed.length > 0 || data.blobDeletionsFailed.length > 0) {
          console.error('Failed deletions:', { 
            kv: data.kvDeletionsFailed, 
            blobs: data.blobDeletionsFailed 
          })
        }
        await fetchData(true) // Refresh the data after emptying, bypassing cache
      } else {
        throw new Error(data.error || 'Failed to empty databases')
      }
    } catch (err) {
      setError('Failed to empty databases: ' + (err instanceof Error ? err.message : 'Unknown error'))
      console.error(err)
    } finally {
      setIsEmptying(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const renderKVValue = (item: KVItem) => {
    if (item.error) {
      return <p className="text-red-500">Error: {item.error}</p>
    }

    switch (item.type) {
      case 'hash':
        return (
          <div>
            {Object.entries(item.value).map(([key, value]) => (
              <p key={key}>{key}: {JSON.stringify(value)}</p>
            ))}
          </div>
        )
      case 'string':
        return <p>{item.value}</p>
      case 'list':
      case 'set':
        return (
          <ul>
            {item.value.map((v: any, i: number) => (
              <li key={i}>{JSON.stringify(v)}</li>
            ))}
          </ul>
        )
      case 'zset':
        return (
          <ul>
            {item.value.map(([member, score]: [string, number], i: number) => (
              <li key={i}>{member}: {score}</li>
            ))}
          </ul>
        )
      default:
        return <p>{JSON.stringify(item.value)}</p>
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug View</h1>
      <div className="flex space-x-4 mb-4">
        <Button onClick={() => fetchData(true)} disabled={isLoading || isEmptying}>
          {isLoading ? 'Loading...' : 'Refresh Data (Bypass Cache)'}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading || isEmptying}>
              {isEmptying ? 'Emptying...' : 'Empty Databases'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all data from both the KV store and Blob storage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={emptyDatabases}>
                Yes, empty databases
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && <p className="text-red-500 mb-4 whitespace-pre-line">{error}</p>}
      {message && <p className="text-green-500 mb-4 whitespace-pre-line">{message}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>KV Store Data ({kvData.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            {kvData.length === 0 ? (
              <p>No data in KV store</p>
            ) : (
              kvData.map((item) => (
                <div key={item.key} className="mb-4 p-4 border rounded">
                  <h3 className="font-bold">{item.key}</h3>
                  <p>Type: {item.type}</p>
                  {renderKVValue(item)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Blob Storage Data ({blobData.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            {blobData.length === 0 ? (
              <p>No data in Blob storage</p>
            ) : (
              blobData.map((blob) => (
                <div key={blob.url} className="mb-4 p-4 border rounded">
                  <p>Pathname: {blob.pathname}</p>
                  <p>URL: <a href={blob.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{blob.url}</a></p>
                  <p>Content Type: {blob.contentType}</p>
                  <p>Size: {blob.size} bytes</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}