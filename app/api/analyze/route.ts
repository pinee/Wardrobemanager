import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { kv } from '@vercel/kv'

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
    const results = await Promise.all(
      images.map(async (image) => {
        const buffer = await image.arrayBuffer()
        const base64Image = Buffer.from(buffer).toString('base64')

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this clothing item and provide the following attributes: Fabric/material, Pattern/print, Cut, Fit, Occasion, Weather, Length, Colour type, Colours, Waistline, Hemline, Neckline, Sleeves, Category (Top, Bottom, Dress, Shoes, Accessory, or Other). Provide the response in a JSON format." },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        })

        const content = JSON.parse(response.choices[0].message.content || '{}')
        content.imageData = `data:image/jpeg;base64,${base64Image}`
        content.id = Date.now().toString() + Math.random().toString(36).substring(2, 15)

        // Store the item in the database
        await kv.hset(`wardrobe:${content.id}`, content)

        return content
      })
    )

    return NextResponse.json({ message: 'Uploaded successfully', items: results })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to analyze images' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  try {
    const keys = await kv.keys('wardrobe:*')
    const items = await Promise.all(keys.map(key => kv.hgetall(key)))

    if (category) {
      return NextResponse.json(items.filter(item => item.Category === category))
    }

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch wardrobe items' }, { status: 500 })
  }
}