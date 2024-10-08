"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface AnalysisResult {
  filename: string
  description: string
}

export function Page() {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to analyze images')
      }

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      alert('An error occurred while analyzing the images.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Analyzer</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="mb-2"
        />
        <Button type="submit" disabled={files.length === 0 || isLoading}>
          {isLoading ? 'Analyzing...' : 'Analyze Images'}
        </Button>
      </form>

      {results.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Results:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <h3 className="font-bold mb-2">{result.filename}</h3>
                  <p>{result.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}