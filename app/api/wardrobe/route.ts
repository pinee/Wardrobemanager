// app/api/wardrobe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { kv } from '@vercel/kv'
import { put } from '@vercel/blob'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const images = formData.getAll('images') as File[]

  if (images.length === 0) {
    return NextResponse.json({ error: 'No images uploaded' }, { status: 400 })
  }

  try {
    const results = await Promise.all(images.map(async (image) => {
      // Upload image to Vercel Blob
      const { url } = await put(image.name, image, { access: 'public' })

      const buffer = await image.arrayBuffer()
      const base64Image = Buffer.from(buffer).toString('base64')

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this clothing item and provide the following attributes in JSON format without any markdown formatting: category (Top, Bottom, Dress, Shoes, Accessory, or Other), name, fabric, pattern, colors, suitable_weather (array), suitable_occasions (array), style, fit. Keep descriptions concise." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      })

      let content: any = {}
      try {
        const cleanedContent = response.choices[0].message.content?.replace(/```json\n|\n```/g, '').trim() || '{}'
        content = JSON.parse(cleanedContent)
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError)
        content = { error: 'Failed to parse API response' }
      }

      const itemData = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 15),
        imageUrl: url,
        ...content
      }

      // Store the item data in Vercel KV
      await kv.hset(`wardrobe:${itemData.id}`, itemData)

      return itemData
    }))

    return NextResponse.json({ message: 'Items added successfully', items: results })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to process images' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  try {
    const keys = await kv.keys('wardrobe:*')
    const items = await Promise.all(keys.map(key => kv.hgetall(key)))

    if (category) {
      return NextResponse.json(items.filter(item => item.category === category))
    }

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch wardrobe items' }, { status: 500 })
  }
}