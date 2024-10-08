import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { list } from '@vercel/blob'
import { kv } from '@vercel/kv'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface WardrobeItem {
  id: string
  name: string
  category: string
  imageUrl: string
  fabric?: string
  pattern?: string
  colors?: string[] | string
  suitable_weather?: string[] | string
  suitable_occasions?: string[]
  style?: string
  fit?: string
}

// Helper function to handle different color formats
function getColors(item: WardrobeItem): string {
  if (Array.isArray(item.colors)) {
    return item.colors.join(', ')
  } else if (typeof item.colors === 'string') {
    return item.colors
  } else {
    return 'unknown color'
  }
}

// Helper function to handle different weather formats
function getSuitableWeather(item: WardrobeItem): string {
  if (Array.isArray(item.suitable_weather)) {
    return item.suitable_weather.join(', ')
  } else if (typeof item.suitable_weather === 'string') {
    return item.suitable_weather
  } else {
    return 'any weather'
  }
}

export async function POST(request: Request) {
  try {
    const { mood, weather, occasion } = await request.json()

    if (!mood || !weather || !occasion) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch wardrobe items from Vercel KV and Blob
    const wardrobeItems: WardrobeItem[] = await fetchWardrobeItems()

    if (wardrobeItems.length === 0) {
      return NextResponse.json(
        { error: 'No wardrobe items found' },
        { status: 404 }
      )
    }

    // Prepare wardrobe description for AI
    const wardrobeDescription = wardrobeItems.map(item => 
      `${item.name} (${item.category}): ${getColors(item)} ${item.fabric || ''}, suitable for ${getSuitableWeather(item)}`
    ).join('\n')

    const prompt = `
      Given the following wardrobe and user preferences, suggest an appropriate outfit:

      Wardrobe:
      ${wardrobeDescription}

      User preferences:
      Mood: ${mood}
      Weather: ${weather}
      Occasion: ${occasion}

      Please suggest a complete outfit that matches the user's preferences and the weather conditions, using items from the wardrobe. The outfit should include a combination of top, bottom (or dress), accessories, jacket (if appropriate), and shoes. Be specific in your recommendations, mentioning the exact items from the wardrobe to use for each part of the outfit.
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    })

    const recommendation = completion.choices[0].message.content

    if (!recommendation) {
      throw new Error('No recommendation generated')
    }

    return NextResponse.json({ recommendation })
  } catch (error) {
    console.error('Error in /api/recommend:', error)
    return NextResponse.json(
      { error: 'Failed to generate outfit recommendation', details: error.message },
      { status: 500 }
    )
  }
}

async function fetchWardrobeItems(): Promise<WardrobeItem[]> {
  try {
    // Fetch image data from Vercel Blob
    const { blobs } = await list()

    // Fetch wardrobe items from Vercel KV
    const wardrobeItemsData = await kv.get<Record<string, WardrobeItem>>('wardrobeItems')

    if (!wardrobeItemsData) {
      return []
    }

    // Combine data from Blob and KV
    const wardrobeItems: WardrobeItem[] = Object.values(wardrobeItemsData).map(item => ({
      ...item,
      imageUrl: blobs.find(blob => blob.pathname === item.imageUrl)?.url || item.imageUrl,
    }))

    return wardrobeItems
  } catch (error) {
    console.error('Error fetching wardrobe items:', error)
    throw error
  }
}