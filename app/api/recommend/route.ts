import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  console.log('POST /api/recommend: Started')
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    if (!kv) {
      throw new Error('KV store is not initialized')
    }

    const { mood, weather, occasion } = await request.json()

    if (!mood || !weather || !occasion) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Fetching wardrobe items')
    let cursor = 0
    let allItems = []
    do {
      const scanResult = await kv.scan(cursor, { match: 'wardrobe:*', count: 100 })
      cursor = scanResult[0]
      const keys = scanResult[1]
      const items = await Promise.all(keys.map(key => kv.hgetall(key)))
      allItems = allItems.concat(items.filter(Boolean))
    } while (cursor !== 0)

    console.log(`Found ${allItems.length} wardrobe items`)

    if (allItems.length === 0) {
      return NextResponse.json({ error: 'No wardrobe items found' }, { status: 404 })
    }

    const itemDescriptions = allItems.map(item => 
      `${item.name} (${item.category}): ${item.color} ${item.fabric} ${item.pattern} ${item.sleeves} ${item.length}`
    ).join('\n')

    console.log('Sending request to OpenAI')
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful fashion assistant. Your task is to recommend an outfit based on the user's mood, weather, and occasion, using only items from their wardrobe."
        },
        {
          role: "user",
          content: `Mood: ${mood}\nWeather: ${weather}\nOccasion: ${occasion}\n\nWardrobe items:\n${itemDescriptions}\n\nPlease recommend an outfit using only the available items. Provide a brief explanation for your choices.`
        }
      ],
    })

    const recommendation = response.choices[0].message.content

    console.log('Recommendation received:', recommendation)

    // Extract mentioned items from the recommendation
    const mentionedItems = allItems.filter(item => 
      recommendation.toLowerCase().includes(item.name.toLowerCase())
    )

    return NextResponse.json({ recommendation, outfit: mentionedItems })
  } catch (error) {
    console.error('Error in POST /api/recommend:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}