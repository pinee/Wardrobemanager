'use client'

import { NextRequest, NextResponse } from 'next/server'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'

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
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "What's in this image? Provide a brief description." },
                {
                  type: "image_url",
                  image_url: `data:image/jpeg;base64,${base64Image}`,
                },
              ],
            },
          ],
          max_tokens: 300,
        })

        return {
          filename: image.name,
          description: response.choices[0].message.content,
        }
      })
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to analyze images' }, { status: 500 })
  }
}