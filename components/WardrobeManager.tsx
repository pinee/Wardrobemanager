// components/WardrobeManager.tsx
"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function WardrobeManager() {
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedItems, setUploadedItems] = useState([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      alert('Please select at least one image to upload.')
      return
    }
    setIsLoading(true)

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })

    try {
      const response = await fetch('/api/wardrobe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload images')
      }

      const data = await response.json()
      setUploadedItems(data.items)
      setFiles([])
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while uploading the images.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Wardrobe Manager</h1>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="mb-2"
        />
        <Button type="submit" disabled={files.length === 0 || isLoading}>
          {isLoading ? 'Uploading...' : 'Upload'}
        </Button>
      </form>

      {uploadedItems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Uploaded Items:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="aspect-square relative mb-2">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                  </div>
                  <h3 className="font-bold mb-2">{item.name}</h3>
                  <p>Category: {item.category}</p>
                  <p>Colors: {Array.isArray(item.colors) ? item.colors.join(', ') : item.colors}</p>
                  <p>Suitable for: {Array.isArray(item.suitable_weather) ? item.suitable_weather.join(', ') : item.suitable_weather}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}