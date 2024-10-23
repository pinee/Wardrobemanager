"use client"

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Toast } from "@/components/ui/toast"

interface WardrobeItem {
  id: string
  name: string
  category: string
  blobId: string
  occasion?: string[]
  fabric?: string
  pattern?: string
  color?: string[]
  sleeves?: string
  length?: string
}

const normalizeCategory = (category: string): string => {
  const lowercaseCategory = category.toLowerCase().trim();
  if (lowercaseCategory.includes('top') || lowercaseCategory.includes('shirt') || lowercaseCategory.includes('blouse') || lowercaseCategory.includes('t-shirt') || lowercaseCategory.includes('sweater') || lowercaseCategory.includes('sweatshirt')) return 'Tops';
  if (lowercaseCategory.includes('bottom') || lowercaseCategory.includes('pant') || lowercaseCategory.includes('trouser') || lowercaseCategory.includes('jeans') || lowercaseCategory.includes('skirt') || lowercaseCategory.includes('shorts')) return 'Bottoms';
  if (lowercaseCategory.includes('dress')) return 'Dresses';
  if (lowercaseCategory.includes('coat') || lowercaseCategory.includes('jacket') || lowercaseCategory.includes('cardigan') || lowercaseCategory.includes('blazer')) return 'Outerwear';
  if (lowercaseCategory.includes('shoe') || lowercaseCategory.includes('boot') || lowercaseCategory.includes('sneaker') || lowercaseCategory.includes('sandal') || lowercaseCategory.includes('footwear') || lowercaseCategory.includes('slipper')) return 'Footwear';
  if (lowercaseCategory.includes('accessory') || lowercaseCategory.includes('jewelry') || lowercaseCategory.includes('bag') || lowercaseCategory.includes('hat') || lowercaseCategory.includes('scarf') || lowercaseCategory.includes('belt')) return 'Accessories';
  if (lowercaseCategory.includes('suit')) return 'Suits';
  if (lowercaseCategory.includes('sport') || lowercaseCategory.includes('athletic')) return 'Sportswear';
  if (lowercaseCategory.includes('sleep') || lowercaseCategory.includes('pajama')) return 'Sleepwear';
  if (lowercaseCategory.includes('underwear') || lowercaseCategory.includes('lingerie')) return 'Underwear';
  return 'Other';
}

const categoryIcons: { [key: string]: string } = {
  "Tops": "👚",
  "Bottoms": "👖",
  "Dresses": "👗",
  "Outerwear": "🧥",
  "Footwear": "👟",
  "Accessories": "👜",
  "Suits": "🕴️",
  "Sportswear": "🏃",
  "Sleepwear": "🛌",
  "Underwear": "🩲",
  "Other": "🔮",
}

export default function WardrobeManager() {
  const [view, setView] = useState<'main' | 'upload' | 'wardrobe' | 'category' | 'recommend'>('main')
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [mood, setMood] = useState('')
  const [weather, setWeather] = useState('')
  const [occasion, setOccasion] = useState('')
  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [recommendedOutfit, setRecommendedOutfit] = useState<WardrobeItem[]>([])
  const [showToast, setShowToast] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      setMessage('Please select at least one image to upload.')
      return
    }
    setIsLoading(true)
    setMessage('')

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('images', file)
    })

    try {
      const response = await fetch('/api/wardrobe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while uploading the images')
      }

      if (data.errors && data.errors.length > 0) {
        
        const errorMessages = data.errors.map((error: any) => `Error processing ${error.fileName}: ${error.message}`).join('\n')
        setMessage(`Some files were not processed successfully:\n${errorMessages}\n\nSuccessfully processed files: ${data.successCount}`)
      } else {
        setMessage(data.message)
      }

      const normalizedItems = (data.items || []).map((item: WardrobeItem) => ({
        ...item,
        category: normalizeCategory(item.category)
      }))
      setFiles([])
      setWardrobeItems(prevItems => [...prevItems, ...normalizedItems])
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMessage(`An error occurred while uploading the images: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWardrobe = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/wardrobe')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const normalizedItems = data.items.map((item: WardrobeItem) => ({
        ...item,
        category: normalizeCategory(item.category)
      }))
      setWardrobeItems(normalizedItems || [])
      
      if (normalizedItems.length === 0) {
        setMessage('Your wardrobe is empty. Try adding some items!')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage(`An error occurred while fetching the wardrobe items: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecommend = async () => {
    setIsLoading(true)
    setMessage('')
    setRecommendation(null)
    setRecommendedOutfit([])
    try {
      if (!mood || !weather || !occasion) {
        throw new Error('Please fill in all fields')
      }

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood, weather, occasion }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.recommendation) {
        setRecommendation(data.recommendation)
        setRecommendedOutfit(data.outfit || [])
        if (data.outfit && data.outfit.length === 0) {
          setMessage('No suitable items found for the recommendation. Try adjusting your inputs.')
        }
      } else {
        setMessage('No recommendation available. Please try again.')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setIsLoading(true)
    setMessage('')
    try {
      const response = await fetch(`/api/wardrobe?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      setWardrobeItems(prevItems => prevItems.filter(item => item.id !== itemId))
      setRecommendedOutfit(prevOutfit => prevOutfit.filter(item => item.id !== itemId))
      
      if (recommendedOutfit.some(item => item.id === itemId)) {
        setRecommendation(prev => prev ? `${prev}\n\n(Note: One or more items from this outfit have been removed from your wardrobe.)` : null)
      }
      
      setMessage('Item removed successfully from your wardrobe and any recommendations.')
    } catch (error) {
      console.error('Error:', error)
      setMessage(`An error occurred while removing the item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncDatabases = async () => {
    setIsLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/sync-databases', { method: 'POST' })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setMessage(data.message)
      await fetchWardrobe() // Refresh the wardrobe after syncing
    } catch (error) {
      console.error('Error:', error)
      setMessage(`An error occurred while syncing databases: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'wardrobe' || view === 'category') {
      fetchWardrobe()
    }
  }, [view])

  const formatArrayOrString = (value: string[] | string | undefined): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return value || ''
  }

  const getImageSrc = (item: WardrobeItem) => {
    if (item.blobId) {
      return `/api/blob/${encodeURIComponent(item.blobId)}`
    }
    return '/placeholder.svg?height=200&width=200'
  }

  const uniqueCategories = Array.from(new Set(wardrobeItems.map(item => item.category)))

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Wardrobe Manager</h1>
      
      {view === 'main' && (
        <div className="flex flex-col space-y-4">
          <Button onClick={() => setView('upload')}>Add to your wardrobe</Button>
          <Button onClick={() => setView('wardrobe')}>View Existing Wardrobe</Button>
          <Button onClick={handleSyncDatabases} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Sync Databases'}
          </Button>
        </div>
      )}

      {view === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="mb-2"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Uploading...' : 'Upload'}
          </Button>
          <Button onClick={() => setView('main')} variant="outline">
            Back to Main Menu
          </Button>
          {message && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 whitespace-pre-line" role="alert">
              <p>{message}</p>
            </div>
          )}
        </form>
      )}

      {view === 'wardrobe' && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Your Wardrobe Categories</h2>
          {message && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
              <p>{message}</p>
            </div>
          )}
          {isLoading ? (
            <p>Loading your wardrobe...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
                {uniqueCategories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category)
                      setView('category')
                    }}
                    className="h-24 text-lg flex flex-col items-center justify-center"
                  >
                    <span className="text-3xl mb-2" role="img" aria-label={category}>
                      {categoryIcons[category] || '🔮'}
                    </span>
                    {category}
                  </Button>
                ))}
              </div>
              <div className="mt-4 space-y-4">
                <Button onClick={() => setView('recommend')} disabled={wardrobeItems.length === 0}>
                  Recommend Outfit
                </Button>
                <Button onClick={() => setView('main')} variant="outline">
                  Back to Main Menu
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {view === 'category' && (
        <div>
          <h2 className="text-xl font-semibold mb-2">{selectedCategory}</h2>
          {message && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
              <p>{message}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wardrobeItems
              .filter(item => item.category === selectedCategory)
              .map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="aspect-square relative mb-2">
                      <Image
                        src={getImageSrc(item)}
                        alt={item.name}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-md"
                      />
                    </div>
                    <h3 className="font-bold mb-2">{item.name}</h3>
                    <p>Category: {item.category}</p>
                    {item.occasion && <p>Occasion: {formatArrayOrString(item.occasion)}</p>}
                    {item.fabric && <p>Fabric: {item.fabric}</p>}
                    {item.pattern && <p>Pattern: {item.pattern}</p>}
                    {item.color && <p>Color: {formatArrayOrString(item.color)}</p>}
                    {item.sleeves && <p>Sleeves: {item.sleeves}</p>}
                    {item.length && <p>Length: {item.length}</p>}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="mt-4">Remove Item</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this item from your wardrobe.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveItem(item.id)}>
                            Confirm Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
          </div>
          <Button onClick={() => setView('wardrobe')} className="mt-4">
            Back to Categories
          </Button>
        </div>
      )}

      {view === 'recommend' && (
        <div className="space-y-4">
          <Textarea
            placeholder="Describe your mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          />
          <Input
            type="text"
            placeholder="What's the weather like?"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
          />
          <Input
            type="text"
            placeholder="What's the occasion?"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
          />
          <Button onClick={handleRecommend} disabled={isLoading}>
            {isLoading ? 'Recommending...' : 'Get Outfit Recommendation'}
          </Button>
          <Button onClick={() => setView('wardrobe')} variant="outline">
            Back to Wardrobe
          </Button>
          {message && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
              <p>{message}</p>
            </div>
          )}
          {recommendation && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold mb-2">Recommended Outfit:</h3>
                <p className="mb-4 whitespace-pre-line">{recommendation}</p>
                {recommendedOutfit.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Outfit Items:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendedOutfit.map((item) => (
                        <div key={item.id} className="border rounded-md p-2">
                          <div className="aspect-square relative mb-2">
                            <Image
                              src={getImageSrc(item)}
                              alt={item.name}
                              layout="fill"
                              objectFit="cover"
                              className="rounded-md"
                            />
                          </div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-yellow-500">No specific items were found in your wardrobe for this recommendation.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showToast && (
        <Toast>
          <div className="bg-green-500 text-white px-4 py-2 rounded-md fixed bottom-4 right-4 z-50">
            Uploaded successfully
          </div>
        </Toast>
      )}
    </div>
  )
}